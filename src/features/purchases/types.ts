export type CardOption = { id: string; name: string }
export type ContactOption = { id: string; name: string }

export type Participant = {
  id: string
  contactId: string | null // null = o próprio usuário
  name: string
  manual: string | null // texto digitado; null = percentual automático
}

export type Tipo = 'avista' | 'parcelado'
export type Base = 'total' | 'parcela'
export type CategoryOption = { id: string; name: string }
export type SharedAccountOption = {
  id: string
  name: string
  participants: ContactOption[]
}

// Valores iniciais do formulário ao editar uma compra
export type PurchaseInitial = {
  nome: string
  cartaoId: string // '' = sem cartão
  categoriaId: string // '' = sem categoria
  tipo: Tipo
  recorrente: boolean
  data: string // AAAA-MM-DD
  mes: string // AAAA-MM
  parcelas: string
  valor: string // total em reais, com 2 casas
  descricao: string
  contaCompartilhadaId: string // '' = nenhuma
  participantes: Participant[]
}

export type PurchaseEdit = {
  id: string
  mesLista: string // mês da lista de compras de onde o usuário veio
  aviso: string | null // explicação mostrada no topo do formulário
  inicial: PurchaseInitial
}
