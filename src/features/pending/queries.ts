import { createClient } from '@/lib/supabase/server'

export type PendingPurchase = {
  id: string
  description: string
  ownerName: string
  totalCents: number
  installmentsCount: number
  isRecurring: boolean
  firstMonth: string
}

// Compras vinculadas à conta ativa (compartilhada) que ainda não têm participantes
export async function listPendingPurchases(): Promise<PendingPurchase[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('purchases')
    .select(
      'id, description, total_amount, installments_count, is_recurring, first_installment_month, purchase_date, owner:profiles!owner_id(display_name)',
    )
    .eq('shared_pending', true)
    .order('purchase_date')

  if (error) {
    console.error('Falha ao listar compras incompletas:', error.message)
    return []
  }

  return (data ?? []).map((item: Record<string, unknown>) => {
    const dono = Array.isArray(item.owner) ? item.owner[0] : item.owner
    return {
      id: String(item.id),
      description: String(item.description),
      ownerName: String((dono as { display_name?: string } | null)?.display_name ?? 'outra pessoa'),
      totalCents: Math.round(Number(item.total_amount) * 100),
      installmentsCount: Number(item.installments_count),
      isRecurring: Boolean(item.is_recurring),
      firstMonth: String(item.first_installment_month).slice(0, 7),
    }
  })
}