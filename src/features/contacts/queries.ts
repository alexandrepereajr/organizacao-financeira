import { createClient } from '@/lib/supabase/server'

export type Contact = {
  id: string
  name: string
  linked_user_id: string | null
}

export async function listContacts(): Promise<Contact[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, linked_user_id')
    .order('name')

  if (error) {
    console.error('Falha ao listar contatos:', error.message)
    return []
  }
  return data ?? []
}

export async function getMyShareCode(): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('current_account')

  if (error) {
    console.error('Falha ao ler a conta ativa:', error.message)
    return null
  }
  return data?.[0]?.share_code ?? null
}