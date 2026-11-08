export const mensagens = {
  credenciais: 'E-mail ou senha incorretos.',
  nome_invalido: 'Informe seu nome (mínimo de 2 caracteres).',
  senha_curta: 'A senha deve ter pelo menos 8 caracteres.',
  cadastro_falhou: 'Não foi possível criar a conta. Verifique os dados e tente novamente.',
  confirmar_email: 'Conta criada. Confirme o e-mail para entrar.',
} as const

export function mensagem(chave?: string): string | undefined {
  if (!chave) return undefined
  return Object.prototype.hasOwnProperty.call(mensagens, chave)
    ? mensagens[chave as keyof typeof mensagens]
    : undefined
}