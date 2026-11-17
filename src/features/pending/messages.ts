export const mensagens = {
  falha: 'Não foi possível completar a compra. Tente novamente.',
  divisao_invalida: 'A divisão é inválida. Confira os participantes e os percentuais.',
  compra_completada: 'Compra completada.',
} as const

export function mensagem(chave?: string): string | undefined {
  if (!chave) return undefined
  return Object.prototype.hasOwnProperty.call(mensagens, chave)
    ? mensagens[chave as keyof typeof mensagens]
    : undefined
}