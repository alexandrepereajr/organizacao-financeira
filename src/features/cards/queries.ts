import { createClient } from '@/lib/supabase/server'

export type Card = {
  id: string
  name: string
  closing_day: number
  due_day: number
  is_active: boolean
  hide_from_shared: boolean
  owner_name: string
  is_own: boolean
}

// Cartões visíveis para a conta ativa: os próprios e, numa conta compartilhada,
// os cartões não ocultos dos participantes com conta
export async function listCards(): Promise<Card[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('visible_cards')

  if (error) {
    console.error('Falha ao listar cartões:', error.message)
    return []
  }

  return (data ?? []).map((item: Record<string, unknown>) => ({
    id: String(item.id),
    name: String(item.name),
    closing_day: Number(item.closing_day),
    due_day: Number(item.due_day),
    is_active: Boolean(item.is_active),
    hide_from_shared: Boolean(item.hide_from_shared),
    owner_name: String(item.owner_name),
    is_own: Boolean(item.is_own),
  }))
}