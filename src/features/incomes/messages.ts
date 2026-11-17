export const mensagens = {
  mes_invalido: 'Mês inválido.',
  descricao_invalida: 'Informe uma descrição com 2 a 60 caracteres.',
  valor_invalido: 'Informe um valor válido, maior que zero.',
  repeticao_invalida: 'A repetição deve ser de 1 a 60 meses.',
  falha: 'Não foi possível concluir. Tente novamente.',
  entrada_criada: 'Entrada adicionada.',
  entrada_atualizada: 'Entrada atualizada.',
  entrada_removida: 'Entrada removida.',
  entrada_encerrada: 'Recorrência encerrada a partir deste mês.',
  categoria_invalida: 'Categoria inválida.',
  destino_invalido: 'Destino inválido. Confira as pessoas, as contas e os valores.',
  destino_excede: 'O total destinado passa do valor da entrada.',
} as const

export function mensagem(chave?: string): string | undefined {
  if (!chave) return undefined
  return Object.prototype.hasOwnProperty.call(mensagens, chave)
    ? mensagens[chave as keyof typeof mensagens]
    : undefined
}