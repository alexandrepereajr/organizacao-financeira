import { createClient } from '@/lib/supabase/server'
import type { Destino } from './types'

export type Income = {
  id: string
  description: string
  amountCents: number
  isRecurring: boolean
  startMonth: string
  endMonth: string | null
  categoryId: string | null
  destinos: Destino[]
}

export type ReceivedIncome = {
  id: string
  description: string
  ownerName: string
  amountCents: number
}

const CAMPOS =
  'id, description, amount, is_recurring, reference_month, recurrence_end_month, category_id, income_shares(contact_id, shared_account_id, kind, value)'

export async function listIncomes(mes: string): Promise<Income[]> {
  const supabase = await createClient()
  const inicio = `${mes}-01`

  const [unicas, recorrentes] = await Promise.all([
    supabase.from('incomes').select(CAMPOS).eq('is_recurring', false).eq('reference_month', inicio),
    supabase
      .from('incomes')
      .select(CAMPOS)
      .eq('is_recurring', true)
      .lte('reference_month', inicio)
      .or(`recurrence_end_month.is.null,recurrence_end_month.gte.${inicio}`),
  ])

  const erro = unicas.error ?? recorrentes.error
  if (erro) {
    console.error('Falha ao listar entradas:', erro.message)
    return []
  }

  return [...(unicas.data ?? []), ...(recorrentes.data ?? [])]
    .map((item) => ({
      id: item.id,
      description: item.description,
      amountCents: Math.round(Number(item.amount) * 100),
      isRecurring: Boolean(item.is_recurring),
      startMonth: String(item.reference_month).slice(0, 7),
      endMonth: item.recurrence_end_month ? String(item.recurrence_end_month).slice(0, 7) : null,
      categoryId: item.category_id ?? null,
      destinos: ((item.income_shares ?? []) as Record<string, unknown>[]).map(
        (parte): Destino => ({
          recipient: parte.contact_id ? 'contact' : 'account',
          id: String(parte.contact_id ?? parte.shared_account_id),
          kind: parte.kind === 'amount' ? 'amount' : 'percent',
          value: Number(parte.value),
        }),
      ),
    }))
    .sort((a, b) => a.description.localeCompare(b.description))
}

// Partes de entradas de outras contas que foram destinadas à conta ativa neste mês
export async function listReceivedIncomes(mes: string): Promise<ReceivedIncome[]> {
  const supabase = await createClient()
  const inicio = `${mes}-01`
  const { data, error } = await supabase.rpc('incomes_destined_to_me', {
    p_from: inicio,
    p_to: inicio,
  })

  if (error) {
    console.error('Falha ao listar entradas recebidas:', error.message)
    return []
  }

  return (data ?? []).map((item: Record<string, unknown>) => ({
    id: String(item.income_id),
    description: String(item.description),
    ownerName: String(item.owner_name),
    amountCents: Math.round(Number(item.destined_amount) * 100),
  }))
}