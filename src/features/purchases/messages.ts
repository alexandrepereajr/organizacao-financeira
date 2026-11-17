export const mensagens = {
  nome_invalido: 'Informe o nome da compra (2 a 100 caracteres).',
  descricao_longa: 'A descrição pode ter no máximo 500 caracteres.',
  data_invalida: 'Data da compra inválida.',
  mes_invalido: 'Mês da primeira parcela inválido.',
  parcelas_invalidas: 'A quantidade de parcelas deve ser de 2 a 120.',
  valor_invalido: 'Informe um valor válido, maior que zero.',
  cartao_invalido: 'Cartão inválido.',
  divisao_invalida: 'A divisão da compra é inválida. Confira os percentuais.',
  falha: 'Não foi possível salvar a compra. Tente novamente.',
  compra_criada: 'Compra salva.',
  categoria_invalida: 'Categoria inválida.',
} as const

export function mensagem(chave?: string): string | undefined {
  if (!chave) return undefined
  return Object.prototype.hasOwnProperty.call(mensagens, chave)
    ? mensagens[chave as keyof typeof mensagens]
    : undefined
}