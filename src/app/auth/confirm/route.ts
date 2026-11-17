import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { COOKIE_CONTA_ATIVA, createClient } from '@/lib/supabase/server'

// Tipos de link aceitos: confirmação de cadastro
const TIPOS: EmailOtpType[] = ['signup', 'email']

// Destino do link do e-mail de confirmação. O template "Confirm signup" do Supabase aponta para:
// {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const tipo = request.nextUrl.searchParams.get('type') as EmailOtpType | null

  if (!tokenHash || !tipo || !TIPOS.includes(tipo)) redirect('/login?erro=link_invalido')

  const supabase = await createClient()
  // Se outra conta estava logada neste navegador, sai dela antes de entrar na nova
  await supabase.auth.signOut({ scope: 'local' })
  ;(await cookies()).delete(COOKIE_CONTA_ATIVA)

  const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })
  if (error) {
    console.error('Falha ao confirmar e-mail:', error.message)
    redirect('/login?erro=link_invalido')
  }

  // Confirmado: o Supabase já abriu a sessão da conta nova
  redirect('/')
}
