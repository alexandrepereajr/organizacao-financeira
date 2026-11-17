import { loadLedger } from '@/features/ledger/queries'

export type InvoiceRow = {
  cardId: string
  cardName: string
  isActive: boolean
  calculatedCents: number
  invoiceCents: number | null
}

export async function loadInvoiceRows(mes: string): Promise<InvoiceRow[]> {
  const dados = await loadLedger(mes, 1)

  // Valor cheio das compras do usuário em cada cartão neste mês
  const calculado = new Map<string, number>()
  for (const linha of dados.installments) {
    const compra = dados.purchases[linha.purchaseId]
    if (!compra || !compra.cardId) continue
    calculado.set(compra.cardId, (calculado.get(compra.cardId) ?? 0) + linha.amountCents)
  }

  const faturas = new Map(dados.invoices.map((f) => [f.cardId, f.amountCents]))

  return dados.cards
    .filter((cartao) => cartao.isOwn)
    .map((cartao) => ({
      cardId: cartao.id,
      cardName: cartao.name,
      isActive: cartao.isActive,
      calculatedCents: calculado.get(cartao.id) ?? 0,
      invoiceCents: faturas.get(cartao.id) ?? null,
    }))
    .filter((linha) => linha.isActive || linha.calculatedCents > 0 || linha.invoiceCents !== null)
}