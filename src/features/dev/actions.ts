'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_CONTA_ATIVA, createClient } from '@/lib/supabase/server'
import { CONTAS_TESTE, SENHA_TESTE } from './accounts'

export async function devLogin(formData: FormData) {
  // Só funciona no npm run dev
  if (process.env.NODE_ENV === 'production') redirect('/login')

  const username = String(formData.get('username') ?? '')
  const conta = CONTAS_TESTE.find((c) => c.username === username)
  if (!conta) redirect('/login?erro=teste_inexistente')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: conta.email,
    password: SENHA_TESTE,
  })
  if (error) redirect('/login?erro=teste_inexistente')

  // Entra sempre na conta pessoal do usuário de teste
  ;(await cookies()).delete(COOKIE_CONTA_ATIVA)
  redirect('/')
}