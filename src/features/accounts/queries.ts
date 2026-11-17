import { createClient } from '@/lib/supabase/server'

export type AccountOption = {
  id: string
  name: string
  username: string
  isShared: boolean
  isSelf: boolean
  isActive: boolean
}

// Devolve null quando não há usuário logado
export async function listAccounts(): Promise<AccountOption[] | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase.rpc('my_accounts')
  if (error) {
    console.error('Falha ao listar contas:', error.message)
    return null
  }

  return (data ?? []).map((item: Record<string, unknown>) => ({
    id: String(item.id),
    name: String(item.display_name),
    username: String(item.username),
    isShared: item.account_type === 'shared',
    isSelf: Boolean(item.is_self),
    isActive: Boolean(item.is_active),
  }))
}