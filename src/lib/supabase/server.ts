import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseKey, supabaseUrl } from './env'

export const COOKIE_CONTA_ATIVA = 'conta_ativa'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function createClient() {
  const cookieStore = await cookies()
  const contaAtiva = cookieStore.get(COOKIE_CONTA_ATIVA)?.value

  // O banco confere se o usuário pode agir em nome dessa conta (função active_account)
  const headers =
    contaAtiva && UUID.test(contaAtiva) ? { 'x-active-account': contaAtiva } : undefined

  return createServerClient(supabaseUrl, supabaseKey, {
    global: headers ? { headers } : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Components não podem gravar cookies; o proxy renova a sessão.
        }
      },
    },
  })
}