export const mensagens = {
  mes_invalido: 'Mês inválido.',
  cartao_invalido: 'Cartão inválido.',
  valor_invalido: 'Informe um valor válido (zero ou maior).',
  falha: 'Não foi possível concluir. Tente novamente.',
  fatura_salva: 'Fatura salva.',
  fatura_removida: 'Fatura removida.',
} as const

export function mensagem(chave?: string): string | undefined {
  if (!chave) return undefined
  return Object.prototype.hasOwnProperty.call(mensagens, chave)
    ? mensagens[chave as keyof typeof mensagens]
    : undefined
}