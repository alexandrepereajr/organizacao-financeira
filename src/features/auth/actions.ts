'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { COOKIE_CONTA_ATIVA } from '@/lib/supabase/server'

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? '').trim()
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: texto(formData, 'email'),
    password: String(formData.get('password') ?? ''),
  })

  if (error?.code === 'email_not_confirmed') redirect('/login?erro=email_nao_confirmado')
  if (error) redirect('/login?erro=credenciais')
  redirect('/')
}

export async function signUp(formData: FormData) {
  const nome = texto(formData, 'nome')
  const username = texto(formData, 'username').toLowerCase()
  const email = texto(formData, 'email')
  const password = String(formData.get('password') ?? '')
  const compartilhada = texto(formData, 'compartilhada') === '1'

  if (nome.length < 2) redirect('/cadastro?erro=nome_invalido')
  if (!/^[a-z0-9_]{3,20}$/.test(username)) redirect('/cadastro?erro=usuario_invalido')
  if (password.length < 8) redirect('/cadastro?erro=senha_curta')

  const supabase = await createClient()

  const { data: disponivel, error: erroUsuario } = await supabase.rpc('username_available', {
    p_username: username,
  })
  if (erroUsuario) {
    console.error('Falha ao verificar username:', erroUsuario.message)
    redirect('/cadastro?erro=cadastro_falhou')
  }
  if (disponivel === false) redirect('/cadastro?erro=usuario_em_uso')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: nome,
        username,
        account_type: compartilhada ? 'shared' : 'normal',
      },
    },
  })

  if (error) {
    console.error('Falha no cadastro:', error.message)
    redirect('/cadastro?erro=cadastro_falhou')
  }

  // Sem sessão = o Supabase está exigindo confirmação por e-mail
  if (!data.session) redirect('/login?aviso=confirmar_email')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  ;(await cookies()).delete(COOKIE_CONTA_ATIVA)
  redirect('/login')
}

export async function resendConfirmation(formData: FormData) {
  const email = texto(formData, 'email')
  if (!email) redirect('/login?erro=email_nao_confirmado')

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({ type: 'signup', email })

  if (error?.code === 'over_email_send_rate_limit') redirect('/login?erro=limite_emails')
  if (error) console.error('Falha ao reenviar confirmação:', error.message)
  // Mesma resposta exista ou não a conta, para não revelar quais e-mails estão cadastrados
  redirect('/login?aviso=confirmacao_reenviada')
}
