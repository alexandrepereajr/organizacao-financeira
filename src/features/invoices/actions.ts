'use server'

import { redirect } from 'next/navigation'
import { LIMITE_CENTAVOS } from '@/features/purchases/calc'
import { MES } from '@/lib/month'
import { createClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? '').trim()
}

function voltar(mes: string, tipo: 'erro' | 'aviso', codigo: string): never {
  redirect(`/faturas?mes=${mes}&${tipo}=${codigo}`)
}

function lerMesECartao(formData: FormData) {
  const mes = texto(formData, 'mes')
  if (!MES.test(mes)) redirect('/faturas?erro=mes_invalido')
  const cartao = texto(formData, 'cartao')
  if (!UUID.test(cartao)) voltar(mes, 'erro', 'cartao_invalido')
  return { mes, cartao }
}

export async function saveInvoice(formData: FormData) {
  const { mes, cartao } = lerMesECartao(formData)

  const bruto = texto(formData, 'valor')
  const valor = Number(bruto)
  if (bruto === '' || !Number.isFinite(valor) || valor < 0) voltar(mes, 'erro', 'valor_invalido')
  const cents = Math.round(valor * 100)
  if (cents > LIMITE_CENTAVOS) voltar(mes, 'erro', 'valor_invalido')

  const supabase = await createClient()
  const { error } = await supabase.from('invoices').upsert(
    {
      card_id: cartao,
      reference_month: `${mes}-01`,
      amount: Number((cents / 100).toFixed(2)),
    },
    { onConflict: 'card_id,reference_month' },
  )

  if (error) {
    console.error('Falha ao salvar fatura:', error.message)
    voltar(mes, 'erro', 'falha')
  }
  voltar(mes, 'aviso', 'fatura_salva')
}

export async function removeInvoice(formData: FormData) {
  const { mes, cartao } = lerMesECartao(formData)

  const supabase = await createClient()
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('card_id', cartao)
    .eq('reference_month', `${mes}-01`)

  if (error) {
    console.error('Falha ao remover fatura:', error.message)
    voltar(mes, 'erro', 'falha')
  }
  voltar(mes, 'aviso', 'fatura_removida')
}