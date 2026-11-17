export const mensagens = {
  valor_vazio: 'Informe o código ou o username.',
  nao_encontrado: 'Código ou username não encontrado.',
  nao_compartilhada: 'Esse código ou username não é de uma conta compartilhada.',
  tipo_invalido: 'Só contas normais podem participar de contas compartilhadas, e só contas compartilhadas recebem participantes.',
  falha: 'Não foi possível concluir. Tente novamente.',
  pedido_enviado: 'Pedido enviado. Aguarde a aprovação da conta compartilhada.',
  convite_enviado: 'Convite enviado. Aguarde a pessoa aceitar.',
  vinculo_ativo: 'Vínculo ativado.',
  convite_aceito: 'Convite aceito.',
  convite_recusado: 'Convite recusado.',
  pedido_aceito: 'Pedido aceito.',
  pedido_recusado: 'Pedido recusado.',
  vinculo_removido: 'Vínculo removido.',
} as const

export function mensagem(chave?: string): string | undefined {
  if (!chave) return undefined
  return Object.prototype.hasOwnProperty.call(mensagens, chave)
    ? mensagens[chave as keyof typeof mensagens]
    : undefined
}