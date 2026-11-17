export type Modo = 'minha' | 'cheio'

export type Celula = { cents: number; nota?: string; alerta?: boolean } | null

export type Linha = { chave: string; rotulo: string; sub?: string; celulas: Celula[] }

export type Rodape = {
  chave: string
  rotulo: string
  valores: (number | null)[]
  destacarNegativo?: boolean
}

export type Bloco = {
  id: string
  titulo: string
  vazio: string
  linhas: Linha[]
  rodape: Rodape[]
}