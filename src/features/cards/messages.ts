export const mensagens = {
  nome_invalido: 'Informe um nome com 2 a 40 caracteres.',
  dia_invalido: 'Os dias de fechamento e vencimento devem ser números de 1 a 31.',
  falha: 'Não foi possível concluir. Tente novamente.',
  cartao_criado: 'Cartão criado.',
  cartao_atualizado: 'Cartão atualizado.',
  cartao_ativado: 'Cartão ativado.',
  cartao_desativado: 'Cartão desativado.',
} as const

export function mensagem(chave?: string): string | undefined {
  if (!chave) return undefined
  return Object.prototype.hasOwnProperty.call(mensagens, chave)
    ? mensagens[chave as keyof typeof mensagens]
    : undefined
}