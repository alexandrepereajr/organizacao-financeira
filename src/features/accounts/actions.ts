'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_CONTA_ATIVA } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function switchAccount(formData: FormData) {
  const conta = String(formData.get('conta') ?? '')
  const jar = await cookies()

  // Valor vazio = voltar para a conta pessoal. O banco confere se o usuário é participante.
  if (UUID.test(conta)) {
    jar.set(COOKIE_CONTA_ATIVA, conta, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    })
  } else {
    jar.delete(COOKIE_CONTA_ATIVA)
  }

  redirect('/')
}