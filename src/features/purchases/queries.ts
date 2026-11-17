import type { AccountOption } from '@/features/accounts/queries'
import { createClient } from '@/lib/supabase/server'
import type { SharedAccountOption } from './types'

// Contas compartilhadas em que o usuário é participante, com os participantes de cada uma.
// Numa conta compartilhada a lista é vazia: a escolha só existe em contas normais.
export async function listSharedAccountOptions(
  contas: AccountOption[] | null,
): Promise<SharedAccountOption[]> {
  const ativa = contas?.find((conta) => conta.isActive)
  if (!contas || !ativa || ativa.isShared) return []

  const supabase = await createClient()

  return Promise.all(
    contas
      .filter((conta) => conta.isShared)
      .map(async (conta) => {
        const { data, error } = await supabase.rpc('shared_participants', { p_shared: conta.id })
        if (error) console.error('Falha ao listar participantes:', error.message)

        return {
          id: conta.id,
          name: conta.name,
          participants: (data ?? []).map((item: Record<string, unknown>) => ({
            id: String(item.id),
            name: String(item.name),
          })),
        }
      }),
  )
}