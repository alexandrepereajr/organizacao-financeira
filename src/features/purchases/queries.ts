import type { AccountOption } from '@/features/accounts/queries'
import { createClient } from '@/lib/supabase/server'
import type { Participant, PurchaseInitial, SharedAccountOption, Tipo } from './types'

// Contas compartilhadas em que o usuário é participante, com os participantes de cada uma.
// Numa conta compartilhada a lista é vazia: a escolha só existe em contas normais.
export async function listSharedAccountOptions(
  contas: AccountOption[] | null,
): Promise<SharedAccountOption[]> {
  const ativa = contas?.find((conta) => conta.isActive)
  if (!contas || !ativa || ativa.isShared) return []

  const supabase = await createClient()

  return Promise.all(
    contas
      .filter((conta) => conta.isShared)
      .map(async (conta) => {
        const { data, error } = await supabase.rpc('shared_participants', { p_shared: conta.id })
        if (error) console.error('Falha ao listar participantes:', error.message)

        return {
          id: conta.id,
          name: conta.name,
          participants: (data ?? []).map((item: Record<string, unknown>) => ({
            id: String(item.id),
            name: String(item.name),
          })),
        }
      }),
  )
}

const NUMERO = (valor: unknown) => Math.round(Number(valor) * 100)

export type MonthPurchase = {
  id: string
  name: string
  cardId: string | null
  categoryId: string | null
  amountCents: number // valor que cai neste mês (parcela ou cobrança mensal)
  totalCents: number
  installment: number | null // número da parcela neste mês; null se recorrente
  installmentsCount: number
  isRecurring: boolean
  startMonth: string // AAAA-MM
  endMonth: string | null
  isPending: boolean
}

type LinhaCompra = {
  id: string
  description: string
  card_id: string | null
  category_id: string | null
  total_amount: number | string
  installments_count: number
  is_recurring: boolean
  first_installment_month: string
  recurrence_end_month: string | null
  shared_pending: boolean
}

const CAMPOS_LISTA =
  'id, description, card_id, category_id, total_amount, installments_count, is_recurring, first_installment_month, recurrence_end_month, shared_pending'

function paraItem(p: LinhaCompra, amount: unknown, installment: number | null): MonthPurchase {
  return {
    id: p.id,
    name: p.description,
    cardId: p.card_id,
    categoryId: p.category_id,
    amountCents: NUMERO(amount),
    totalCents: NUMERO(p.total_amount),
    installment,
    installmentsCount: p.installments_count,
    isRecurring: p.is_recurring,
    startMonth: p.first_installment_month.slice(0, 7),
    endMonth: p.recurrence_end_month?.slice(0, 7) ?? null,
    isPending: p.shared_pending,
  }
}

// Compras da conta ativa que cobram algo no mês (parcela ou recorrência).
// Filtra pelo dono: o RLS também devolve compras de outras contas em que a conta foi citada.
export async function listMonthPurchases(contaAtivaId: string, mes: string): Promise<MonthPurchase[]> {
  const supabase = await createClient()
  const dia1 = `${mes}-01`

  const [parcelas, recorrentes] = await Promise.all([
    supabase
      .from('installments')
      .select(`number, amount, purchases!inner(${CAMPOS_LISTA}, owner_id)`)
      .eq('reference_month', dia1)
      .eq('purchases.owner_id', contaAtivaId),
    supabase
      .from('purchases')
      .select(CAMPOS_LISTA)
      .eq('owner_id', contaAtivaId)
      .eq('is_recurring', true)
      .lte('first_installment_month', dia1)
      .or(`recurrence_end_month.is.null,recurrence_end_month.gte.${dia1}`),
  ])

  if (parcelas.error) console.error('Falha ao listar parcelas do mês:', parcelas.error.message)
  if (recorrentes.error) console.error('Falha ao listar recorrentes:', recorrentes.error.message)

  const itens = [
    ...(parcelas.data ?? []).map((linha) => {
      const compra = (Array.isArray(linha.purchases) ? linha.purchases[0] : linha.purchases) as LinhaCompra
      return paraItem(compra, linha.amount, linha.number)
    }),
    ...((recorrentes.data ?? []) as LinhaCompra[]).map((p) => paraItem(p, p.total_amount, null)),
  ]
  return itens.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export type PurchaseForEdit = {
  id: string
  isRecurring: boolean
  startMonth: string
  cardId: string | null
  categoryId: string | null
  sharedAccountId: string | null
  totalCents: number
  shares: { contactId: string | null; amountCents: number }[]
  inicial: Omit<PurchaseInitial, 'participantes'>
}

// Uma compra da conta ativa, com a divisão, para o formulário de edição
export async function getPurchaseForEdit(
  contaAtivaId: string,
  id: string,
): Promise<PurchaseForEdit | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('purchases')
    .select(
      'id, description, card_id, category_id, total_amount, purchase_date, installments_count, first_installment_month, is_recurring, notes, shared_account_id, purchase_shares(contact_id, shared_contact_id, amount)',
    )
    .eq('id', id)
    .eq('owner_id', contaAtivaId)
    .maybeSingle()

  if (error) console.error('Falha ao ler a compra:', error.message)
  if (!data) return null

  const totalCents = NUMERO(data.total_amount)
  const tipo: Tipo = data.installments_count > 1 ? 'parcelado' : 'avista'

  return {
    id: data.id,
    isRecurring: data.is_recurring,
    startMonth: String(data.first_installment_month).slice(0, 7),
    cardId: data.card_id,
    categoryId: data.category_id,
    sharedAccountId: data.shared_account_id,
    totalCents,
    shares: (data.purchase_shares ?? []).map((s) => ({
      contactId: s.contact_id ?? s.shared_contact_id ?? null,
      amountCents: NUMERO(s.amount),
    })),
    inicial: {
      nome: data.description,
      cartaoId: data.card_id ?? '',
      categoriaId: data.category_id ?? '',
      tipo,
      recorrente: data.is_recurring,
      data: data.purchase_date,
      mes: String(data.first_installment_month).slice(0, 7),
      parcelas: tipo === 'parcelado' ? String(data.installments_count) : '2',
      valor: (totalCents / 100).toFixed(2),
      descricao: data.notes ?? '',
      contaCompartilhadaId: data.shared_account_id ?? '',
    },
  }
}

// Divisão gravada (em centavos) convertida para os participantes do formulário.
// "Você" fica automático e recebe o que sobra; os demais ficam com o percentual gravado.
export function participantesDaCompra(
  compra: PurchaseForEdit,
  nomes: Map<string, string>,
): Participant[] {
  return compra.shares
    .map((s) => {
      if (s.contactId === null) {
        return { id: 'eu', contactId: null, name: 'Você', manual: null }
      }
      const percent = compra.totalCents > 0 ? (s.amountCents * 100) / compra.totalCents : 0
      return {
        id: s.contactId,
        contactId: s.contactId,
        name: nomes.get(s.contactId) ?? 'Contato',
        manual: String(Math.round(percent * 10000) / 10000),
      }
    })
    .sort((a, b) => (a.contactId === null ? -1 : b.contactId === null ? 1 : 0))
}
