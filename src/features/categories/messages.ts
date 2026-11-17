export const mensagens = {
  nome_invalido: 'Informe um nome com 2 a 40 caracteres.',
  tipo_invalido: 'Tipo de categoria inválido.',
  nome_repetido: 'Já existe uma categoria com esse nome.',
  falha: 'Não foi possível concluir. Tente novamente.',
  categoria_criada: 'Categoria criada.',
  categoria_atualizada: 'Categoria atualizada.',
  categoria_ativada: 'Categoria ativada.',
  categoria_desativada: 'Categoria desativada.',
} as const

export function mensagem(chave?: string): string | undefined {
  if (!chave) return undefined
  return Object.prototype.hasOwnProperty.call(mensagens, chave)
    ? mensagens[chave as keyof typeof mensagens]
    : undefined
}