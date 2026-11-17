import { createClient } from '@/lib/supabase/server'

export type MembershipStatus = 'invited' | 'requested' | 'active'

export type Membership = {
  otherId: string
  name: string
  username: string
  status: MembershipStatus
  needsMyResponse: boolean
}

export async function listMemberships(): Promise<Membership[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('membership_overview')

  if (error) {
    console.error('Falha ao listar vínculos:', error.message)
    return []
  }

  return (data ?? [])
    .map((item: Record<string, unknown>) => ({
      otherId: String(item.other_id),
      name: String(item.other_name),
      username: String(item.other_username),
      status: item.status as MembershipStatus,
      needsMyResponse: Boolean(item.needs_my_response),
    }))
    .sort((a: Membership, b: Membership) => a.name.localeCompare(b.name))
}