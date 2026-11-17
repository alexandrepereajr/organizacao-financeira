export const mensagens = {
  codigo_vazio: 'Informe o código ou o username do contato.',
  codigo_nao_encontrado: 'Código ou username não encontrado. Confira com a pessoa e tente de novo.',
  conta_compartilhada: 'Contas compartilhadas não podem ser adicionadas como contato.',
  usar_convite: 'Em contas compartilhadas, convide a pessoa pela tela Participantes.',
  codigo_proprio: 'Esse é o seu próprio código.',
  nome_invalido: 'Informe um nome com 2 a 80 caracteres.',
  contato_em_uso: 'Esse contato está em compras e não pode ser removido.',
  falha: 'Não foi possível concluir. Tente novamente.',
  contato_adicionado: 'Contato adicionado.',
  contato_removido: 'Contato removido.',
} as const

export function mensagem(chave?: string): string | undefined {
  if (!chave) return undefined
  return Object.prototype.hasOwnProperty.call(mensagens, chave)
    ? mensagens[chave as keyof typeof mensagens]
    : undefined
}