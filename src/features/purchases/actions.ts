'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  LIMITE_CENTAVOS,
  allocateCents,
  dataValida,
  toCents,
  validateShares,
} from './calc'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MES = /^\d{4}-(0[1-9]|1[0-2])$/

type ShareInput = { contactId: string | null; percent: number }

function falhar(codigo: string): never {
  redirect(`/compras/nova?erro=${codigo}`)
}

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? '').trim()
}

function lerShares(raw: string): ShareInput[] | null {
  try {
    const dados: unknown = JSON.parse(raw)
    if (!Array.isArray(dados) || dados.length === 0 || dados.length > 20) return null

    const vistos = new Set<string | null>()
    const resultado: ShareInput[] = []
    for (const item of dados) {
      if (typeof item !== 'object' || item === null) return null
      const { contactId, percent } = item as { contactId?: unknown; percent?: unknown }
      if (typeof percent !== 'number' || !Number.isFinite(percent)) return null
      if (contactId !== null && (typeof contactId !== 'string' || !UUID.test(contactId))) return null
      if (vistos.has(contactId)) return null
      vistos.add(contactId)
      resultado.push({ contactId, percent })
    }
    return resultado
  } catch {
    return null
  }
}

export async function createPurchase(formData: FormData) {
  const nome = texto(formData, 'nome')
  if (nome.length < 2 || nome.length > 100) falhar('nome_invalido')

  const descricao = texto(formData, 'descricao')
  if (descricao.length > 500) falhar('descricao_longa')

  const data = texto(formData, 'data')
  if (!dataValida(data)) falhar('data_invalida')

  const mes = texto(formData, 'mes')
  if (!MES.test(mes)) falhar('mes_invalido')

  const recorrente = texto(formData, 'recorrente') === '1'
  const tipo = recorrente ? 'avista' : texto(formData, 'tipo')
  if (tipo !== 'avista' && tipo !== 'parcelado') falhar('falha')

  const cartao = texto(formData, 'cartao')
  if (cartao !== '' && !UUID.test(cartao)) falhar('cartao_invalido')

  const categoria = texto(formData, 'categoria')
  if (categoria !== '' && !UUID.test(categoria)) falhar('categoria_invalida')

  const contaCompartilhadaId = texto(formData, 'conta_compartilhada')
  if (contaCompartilhadaId !== '' && !UUID.test(contaCompartilhadaId)) falhar('divisao_invalida')

  const parcelas = tipo === 'parcelado' ? Number.parseInt(texto(formData, 'parcelas'), 10) : 1
  const minimo = tipo === 'parcelado' ? 2 : 1
  if (!Number.isInteger(parcelas) || parcelas < minimo || parcelas > 120) {
    falhar('parcelas_invalidas')
  }

  const valorCents = toCents(texto(formData, 'valor'))
  if (valorCents === null) falhar('valor_invalido')

  const baseParcela = tipo === 'parcelado' && texto(formData, 'base') === 'parcela'
  const totalCents = baseParcela ? valorCents * parcelas : valorCents
  if (totalCents > LIMITE_CENTAVOS) falhar('valor_invalido')

  const shares = lerShares(texto(formData, 'shares'))
  if (!shares) falhar('divisao_invalida')

  const percents = shares.map((s) => s.percent)
  if (validateShares(shares.map((s) => s.contactId === null), percents) !== null) {
    falhar('divisao_invalida')
  }

  const centavos = allocateCents(totalCents, percents)
  const divisao = shares
    .map((s, i) => ({
      // Com conta compartilhada, os participantes são contatos dela (shared_contact_id)
      contact_id: contaCompartilhadaId === '' ? s.contactId : null,
      shared_contact_id: contaCompartilhadaId === '' ? null : s.contactId,
      amount: Number((centavos[i] / 100).toFixed(2)),
    }))
    .filter((s) => s.amount > 0)
  if (divisao.length === 0) falhar('divisao_invalida')

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_purchase', {
    p_description: nome,
    p_total_amount: Number((totalCents / 100).toFixed(2)),
    p_purchase_date: data,
    p_installments_count: parcelas,
    p_first_installment_month: `${mes}-01`,
    p_card_id: cartao === '' ? null : cartao,
    p_shares: divisao,
    p_notes: descricao === '' ? null : descricao,
    p_is_recurring: recorrente,
    p_category_id: categoria === '' ? null : categoria,
    p_shared_account: contaCompartilhadaId === '' ? null : contaCompartilhadaId,
  })

  if (error) {
    console.error('Falha ao criar compra:', error.message)
    if (error.message.includes('devem pertencer a participantes')) falhar('divisao_invalida')
    falhar('falha')
  }
  redirect('/compras/nova?aviso=compra_criada')
}