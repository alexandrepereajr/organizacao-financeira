export type OpcaoDestino = { id: string; name: string }

export type Destino = {
  recipient: 'contact' | 'account'
  id: string
  kind: 'percent' | 'amount'
  value: number
}