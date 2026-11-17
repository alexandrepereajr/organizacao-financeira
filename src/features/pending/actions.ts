'use server'

import { redirect } from 'next/navigation'
import { allocateCents, validateShares } from '@/features/purchases/calc'
import { createClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ShareInput = { contactId: string; percent: number }

function voltar(tipo: 'erro' | 'aviso', codigo: string): never {
  redirect(`/pendentes?${tipo}=${codigo}`)
}

function lerShares(raw: string): ShareInput[] | null {
  try {
    const dados: unknown = JSON.parse(raw)
    if (!Array.isArray(dados) || dados.length === 0 || dados.length > 20) return null

    const vistos = new Set<string>()
    const resultado: ShareInput[] = []
    for (const item of dados) {
      if (typeof item !== 'object' || item === null) return null
      const { contactId, percent } = item as { contactId?: unknown; percent?: unknown }
      if (typeof contactId !== 'string' || !UUID.test(contactId)) return null
      if (typeof percent !== 'number' || !Number.isFinite(percent)) return null
      if (vistos.has(contactId)) return null
      vistos.add(contactId)
      resultado.push({ contactId, percent })
    }
    return resultado
  } catch {
    return null
  }
}

export async function completeSharedPurchase(formData: FormData) {
  const compraId = String(formData.get('purchase_id') ?? '').trim()
  if (!UUID.test(compraId)) voltar('erro', 'falha')

  const shares = lerShares(String(formData.get('shares') ?? ''))
  if (!shares) voltar('erro', 'divisao_invalida')

  const percents = shares.map((s) => s.percent)
  // Todos são participantes (ninguém é "você" numa conta compartilhada)
  if (validateShares(shares.map(() => false), percents) !== null) {
    voltar('erro', 'divisao_invalida')
  }

  const supabase = await createClient()
  const { data: compra, error: erroCompra } = await supabase
    .from('purchases')
    .select('total_amount')
    .eq('id', compraId)
    .single()

  if (erroCompra || !compra) {
    console.error('Falha ao ler a compra:', erroCompra?.message)
    voltar('erro', 'falha')
  }

  const totalCents = Math.round(Number(compra.total_amount) * 100)
  const centavos = allocateCents(totalCents, percents)
  const divisao = shares
    .map((s, i) => ({
      shared_contact_id: s.contactId,
      amount: Number((centavos[i] / 100).toFixed(2)),
    }))
    .filter((s) => s.amount > 0)
  if (divisao.length === 0) voltar('erro', 'divisao_invalida')

  const { error } = await supabase.rpc('complete_shared_purchase', {
    p_purchase_id: compraId,
    p_shares: divisao,
  })

  if (error) {
    console.error('Falha ao completar a compra:', error.message)
    voltar('erro', 'falha')
  }
  voltar('aviso', 'compra_completada')
}