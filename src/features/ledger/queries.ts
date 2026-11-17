import { listCards } from '@/features/cards/queries'
import { createClient } from '@/lib/supabase/server'
import { buildLedger, listarMeses } from './build'
import type { LedgerData } from './types'

const TAMANHO_PAGINA = 1000

type Resposta<T> = { data: T[] | null; error: { message: string } | null }

async function lerTudo<T>(buscar: (de: number, ate: number) => PromiseLike<Resposta<T>>): Promise<T[]> {
  const todos: T[] = []
  for (let de = 0; ; de += TAMANHO_PAGINA) {
    const { data, error } = await buscar(de, de + TAMANHO_PAGINA - 1)
    if (error) throw new Error(error.message)
    const pagina = data ?? []
    todos.push(...pagina)
    if (pagina.length < TAMANHO_PAGINA) break
  }
  return todos
}

const CAMPOS_COMPRA =
  'id, owner_id, card_id, description, total_amount, purchase_date, installments_count, is_recurring, first_installment_month, recurrence_end_month, shared_pending'
const CAMPOS_ENTRADA =
  'id, description, reference_month, amount, is_recurring, recurrence_end_month, income_shares(kind, value)'

export async function loadLedger(inicio: string, quantidade: number): Promise<LedgerData> {
  const meses = listarMeses(inicio, quantidade)
  if (meses.length === 0) throw new Error('Mês inicial inválido')

  const de = `${meses[0]}-01`
  const ate = `${meses[meses.length - 1]}-01`
  const semFimOuDepoisDe = `recurrence_end_month.is.null,recurrence_end_month.gte.${de}`
  const supabase = await createClient()

  const [
    installments,
    recurringPurchases,
    shares,
    invoices,
    incomesUnicas,
    incomesRecorrentes,
    incomesDestinadas,
    profiles,
    cards,
  ] = await Promise.all([
    lerTudo((a, b) =>
      supabase
        .from('installments')
        .select(
          'purchase_id, number, amount, reference_month, purchases!inner(id, owner_id, card_id, description, total_amount, purchase_date, installments_count, shared_pending)',
        )
        .gte('reference_month', de)
        .lte('reference_month', ate)
        .order('purchase_id')
        .order('number')
        .range(a, b),
    ),
    lerTudo((a, b) =>
      supabase
        .from('purchases')
        .select(CAMPOS_COMPRA)
        .eq('is_recurring', true)
        .lte('first_installment_month', ate)
        .or(semFimOuDepoisDe)
        .order('id')
        .range(a, b),
    ),
    lerTudo((a, b) =>
      supabase
        .rpc('my_purchase_shares', { p_from: de, p_to: ate })
        .order('purchase_id')
        .range(a, b),
    ),
    lerTudo((a, b) =>
      supabase
        .from('invoices')
        .select('card_id, reference_month, amount')
        .gte('reference_month', de)
        .lte('reference_month', ate)
        .order('card_id')
        .order('reference_month')
        .range(a, b),
    ),
    lerTudo((a, b) =>
      supabase
        .from('incomes')
        .select(CAMPOS_ENTRADA)
        .eq('is_recurring', false)
        .gte('reference_month', de)
        .lte('reference_month', ate)
        .order('id')
        .range(a, b),
    ),
    lerTudo((a, b) =>
      supabase
        .from('incomes')
        .select(CAMPOS_ENTRADA)
        .eq('is_recurring', true)
        .lte('reference_month', ate)
        .or(semFimOuDepoisDe)
        .order('id')
        .range(a, b),
    ),
    lerTudo((a, b) =>
      supabase
        .rpc('incomes_destined_to_me', { p_from: de, p_to: ate })
        .order('income_id')
        .range(a, b),
    ),
    lerTudo((a, b) => supabase.from('profiles').select('id, display_name').order('id').range(a, b)),
    listCards(),
  ])

  return buildLedger({
    months: meses,
    installments,
    recurringPurchases,
    shares,
    profiles,
    cards: cards.map((c) => ({
      id: c.id,
      name: c.name,
      isActive: c.is_active,
      isOwn: c.is_own,
      ownerName: c.owner_name,
    })),
    invoices,
    incomes: [...incomesUnicas, ...incomesRecorrentes],
    incomesDestinadas,
  })
}