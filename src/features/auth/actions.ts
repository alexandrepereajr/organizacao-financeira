'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? '').trim()
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: texto(formData, 'email'),
    password: String(formData.get('password') ?? ''),
  })

  if (error) redirect('/login?erro=credenciais')
  redirect('/')
}

export async function signUp(formData: FormData) {
  const nome = texto(formData, 'nome')
  const email = texto(formData, 'email')
  const password = String(formData.get('password') ?? '')

  if (nome.length < 2) redirect('/cadastro?erro=nome_invalido')
  if (password.length < 8) redirect('/cadastro?erro=senha_curta')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: nome } },
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
  redirect('/login')
}