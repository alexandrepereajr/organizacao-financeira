// Tudo em centavos; meses no formato 'AAAA-MM'.

export type PurchaseInfo = {
  id: string
  description: string
  cardId: string | null
  ownerName: string
  isOwner: boolean // a compra é da conta ativa
  isLinked: boolean // a compra é de outra conta, mas está vinculada à conta ativa (compartilhada)
  isRecurring: boolean
  isPending: boolean // vinculada a uma conta compartilhada, mas ainda sem participantes
  installmentsCount: number
  purchaseDate: string
}

export type InstallmentLine = {
  purchaseId: string
  number: number
  month: string
  amountCents: number // valor cheio da parcela (ou da cobrança mensal, se recorrente)
  myCents: number // a parte do usuário nessa parcela
}

export type CardInfo = {
  id: string
  name: string
  isActive: boolean
  isOwn: boolean
  ownerName: string
}
export type InvoiceLine = { cardId: string; month: string; amountCents: number }
export type IncomeLine = { id: string; description: string; month: string; amountCents: number }

export type LedgerData = {
  months: string[]
  purchases: Record<string, PurchaseInfo>
  installments: InstallmentLine[]
  cards: CardInfo[]
  invoices: InvoiceLine[]
  incomes: IncomeLine[]
}