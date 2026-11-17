import { addMonths } from '@/features/purchases/calc'
import type {
  CardInfo,
  IncomeLine,
  InstallmentLine,
  InvoiceLine,
  LedgerData,
  PurchaseInfo,
} from './types'

type Numero = number | string

export type RawPurchase = {
  id: string
  owner_id: string
  card_id: string | null
  description: string
  total_amount: Numero
  purchase_date: string
  installments_count: number
  is_recurring?: boolean
  first_installment_month?: string
  recurrence_end_month?: string | null
  shared_pending?: boolean
}

export type RawInstallment = {
  purchase_id: string
  number: number
  amount: Numero
  reference_month: string
  purchases: RawPurchase | RawPurchase[] | null
}

export type RawShare = {
  purchase_id: string
  is_owner: boolean
  my_amount: Numero
  is_linked: boolean
}
export type RawInvoice = { card_id: string; reference_month: string; amount: Numero }
export type RawIncomeShare = { kind: string; value: Numero }
export type RawIncome = {
  id: string
  description: string
  reference_month: string
  amount: Numero
  is_recurring: boolean
  recurrence_end_month: string | null
  income_shares?: RawIncomeShare[]
}
// Parte de uma entrada de outra conta que foi destinada à conta ativa
export type RawDestined = {
  income_id: string
  owner_name: string
  description: string
  reference_month: string
  is_recurring: boolean
  recurrence_end_month: string | null
  destined_amount: Numero
}
export type RawProfile = { id: string; display_name: string }

type Entrada = {
  months: string[]
  installments: RawInstallment[]
  recurringPurchases: RawPurchase[]
  shares: RawShare[]
  profiles: RawProfile[]
  cards: CardInfo[]
  invoices: RawInvoice[]
  incomes: RawIncome[]
  incomesDestinadas: RawDestined[]
}

type Minha = { isOwner: boolean; isLinked: boolean; cents: number }

const centavos = (valor: Numero) => Math.round(Number(valor) * 100)

export function listarMeses(inicio: string, quantidade: number): string[] {
  const meses: string[] = []
  for (let i = 0; i < quantidade; i += 1) {
    const mes = addMonths(inicio, i)
    if (!mes) break
    meses.push(mes)
  }
  return meses
}

// Meses da janela em que uma recorrência está ativa (fim nulo = sem fim)
function mesesAtivos(meses: string[], inicio: string, fim: string | null): string[] {
  return meses.filter((mes) => mes >= inicio && (fim === null || mes <= fim))
}

// Soma das primeiras i parcelas, igual à regra usada pela função create_purchase
function acumulado(totalCents: number, n: number, i: number): number {
  const base = Math.floor(totalCents / n)
  const resto = totalCents - base * n
  return base * i + Math.min(i, resto)
}

/**
 * Parte do usuário numa parcela. Usa diferenças de valores acumulados arredondados,
 * então a soma de todas as parcelas dá exatamente a parte do usuário na compra.
 */
function minhaParcela(totalCents: number, n: number, numero: number, minhaCents: number): number {
  if (totalCents <= 0 || minhaCents <= 0) return 0
  const proporcao = minhaCents / totalCents
  const fim = Math.round(acumulado(totalCents, n, numero) * proporcao)
  const inicio = Math.round(acumulado(totalCents, n, numero - 1) * proporcao)
  return fim - inicio
}

// Quanto de uma entrada foi destinado a outras contas ou pessoas
function destinado(cents: number, partes: RawIncomeShare[] | undefined): number {
  if (!partes) return 0
  const total = partes.reduce(
    (soma, parte) =>
      soma +
      (parte.kind === 'percent'
        ? Math.round((cents * Number(parte.value)) / 100)
        : Math.round(Number(parte.value) * 100)),
    0,
  )
  return Math.min(total, cents)
}

export function buildLedger(entrada: Entrada): LedgerData {
  const minhas = new Map<string, Minha>(
    entrada.shares.map((s) => [
      s.purchase_id,
      { isOwner: s.is_owner, isLinked: s.is_linked, cents: centavos(s.my_amount) },
    ]),
  )
  const nomes = new Map(entrada.profiles.map((p) => [p.id, p.display_name]))

  const purchases: Record<string, PurchaseInfo> = {}
  const installments: InstallmentLine[] = []

  function registrar(compra: RawPurchase, minha: Minha) {
    if (purchases[compra.id]) return
    purchases[compra.id] = {
      id: compra.id,
      description: compra.description,
      cardId: compra.card_id,
      ownerName: nomes.get(compra.owner_id) ?? 'outra pessoa',
      isOwner: minha.isOwner,
      isLinked: minha.isLinked,
      isRecurring: Boolean(compra.is_recurring),
      isPending: Boolean(compra.shared_pending),
      installmentsCount: compra.installments_count,
      purchaseDate: compra.purchase_date,
    }
  }

  // Compras com parcelas gravadas
  for (const linha of entrada.installments) {
    const compra = Array.isArray(linha.purchases) ? linha.purchases[0] : linha.purchases
    if (!compra) continue

    const minha = minhas.get(compra.id) ?? { isOwner: false, isLinked: false, cents: 0 }
    const totalCents = centavos(compra.total_amount)
    registrar(compra, minha)

    installments.push({
      purchaseId: compra.id,
      number: linha.number,
      month: linha.reference_month.slice(0, 7),
      amountCents: centavos(linha.amount),
      myCents: minhaParcela(totalCents, compra.installments_count, linha.number, minha.cents),
    })
  }

  // Compras recorrentes: uma cobrança por mês ativo da janela
  for (const compra of entrada.recurringPurchases) {
    const minha = minhas.get(compra.id)
    if (!minha || !compra.first_installment_month) continue
    registrar(compra, minha)

    const meses = mesesAtivos(
      entrada.months,
      compra.first_installment_month.slice(0, 7),
      compra.recurrence_end_month ? compra.recurrence_end_month.slice(0, 7) : null,
    )
    for (const mes of meses) {
      installments.push({
        purchaseId: compra.id,
        number: 1,
        month: mes,
        amountCents: centavos(compra.total_amount),
        myCents: minha.cents,
      })
    }
  }

  const invoices: InvoiceLine[] = entrada.invoices.map((i) => ({
    cardId: i.card_id,
    month: i.reference_month.slice(0, 7),
    amountCents: centavos(i.amount),
  }))

  // Entradas próprias: vale só o que sobra depois dos destinos; as recorrentes se repetem
  const incomes: IncomeLine[] = entrada.incomes.flatMap((i) => {
    const cents = centavos(i.amount)
    const liquido = cents - destinado(cents, i.income_shares)

    if (!i.is_recurring) {
      return [{ id: i.id, description: i.description, month: i.reference_month.slice(0, 7), amountCents: liquido }]
    }
    return mesesAtivos(
      entrada.months,
      i.reference_month.slice(0, 7),
      i.recurrence_end_month ? i.recurrence_end_month.slice(0, 7) : null,
    ).map((mes) => ({ id: i.id, description: i.description, month: mes, amountCents: liquido }))
  })

  // Entradas de outras contas destinadas à conta ativa (só a parte destinada)
  for (const d of entrada.incomesDestinadas) {
    const meses = d.is_recurring
      ? mesesAtivos(
          entrada.months,
          d.reference_month.slice(0, 7),
          d.recurrence_end_month ? d.recurrence_end_month.slice(0, 7) : null,
        )
      : entrada.months.filter((mes) => mes === d.reference_month.slice(0, 7))

    for (const mes of meses) {
      incomes.push({
        id: d.income_id,
        description: `${d.description} (de ${d.owner_name})`,
        month: mes,
        amountCents: centavos(d.destined_amount),
      })
    }
  }

  return {
    months: entrada.months,
    purchases,
    installments,
    cards: entrada.cards,
    invoices,
    incomes,
  }
}