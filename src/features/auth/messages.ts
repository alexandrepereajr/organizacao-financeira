export const mensagens = {
  credenciais: 'E-mail ou senha incorretos.',
  nome_invalido: 'Informe seu nome (mínimo de 2 caracteres).',
  senha_curta: 'A senha deve ter pelo menos 8 caracteres.',
  cadastro_falhou: 'Não foi possível criar a conta. Verifique os dados e tente novamente.',
  confirmar_email: 'Conta criada. Confirme o e-mail para entrar.',
  email_nao_confirmado: 'Seu e-mail ainda não foi confirmado. Abra o link que enviamos ou peça um novo abaixo.',
  link_invalido: 'O link de confirmação é inválido ou expirou. Peça um novo abaixo.',
  confirmacao_reenviada: 'Se houver um cadastro pendente com esse e-mail, enviamos um novo link de confirmação.',
  limite_emails: 'Muitos e-mails enviados em pouco tempo. Tente de novo mais tarde.',
  usuario_invalido: 'O username deve ter de 3 a 20 caracteres: letras minúsculas, números e _.',
  usuario_em_uso: 'Esse username já está em uso. Escolha outro.',
  teste_inexistente: 'Conta de teste não encontrada. Rode o script SQL dos usuários de teste.',
} as const

export function mensagem(chave?: string): string | undefined {
  if (!chave) return undefined
  return Object.prototype.hasOwnProperty.call(mensagens, chave)
    ? mensagens[chave as keyof typeof mensagens]
    : undefined
}