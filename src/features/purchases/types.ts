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