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

type Falha = (codigo: string) => never

// Lê e valida o formulário de compra (nova ou edição) e monta os parâmetros do banco
function lerCompra(formData: FormData, falhar: Falha) {
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

  const params = {
    p_description: nome,
    p_total_amount: Number((totalCents / 100).toFixed(2)),
    p_purchase_date: data,
    p_installments_count: parcelas,
    p_first_installment_month: `${mes}-01`,
    p_card_id: cartao === '' ? null : cartao,
    p_shares: divisao,
    p_notes: descricao === '' ? null : descricao,
    p_category_id: categoria === '' ? null : categoria,
    p_shared_account: contaCompartilhadaId === '' ? null : contaCompartilhadaId,
  }
  return { recorrente, params }
}

export async function createPurchase(formData: FormData) {
  const { recorrente, params } = lerCompra(formData, falhar)

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_purchase', { ...params, p_is_recurring: recorrente })

  if (error) {
    console.error('Falha ao criar compra:', error.message)
    if (error.message.includes('devem pertencer a participantes')) falhar('divisao_invalida')
    falhar('falha')
  }
  redirect('/compras/nova?aviso=compra_criada')
}

// Mês em que o usuário estava (lista de compras); padrão vazio = sem mês
function mesDoForm(formData: FormData): string {
  const mes = texto(formData, 'mes_lista')
  return MES.test(mes) ? mes : ''
}

function voltarParaLista(mes: string, tipo: 'erro' | 'aviso', codigo: string): never {
  const params = new URLSearchParams({ [tipo]: codigo })
  if (mes) params.set('mes', mes)
  redirect(`/compras?${params.toString()}`)
}

function codigoDoErro(mensagemDoBanco: string): string {
  if (mensagemDoBanco.includes('Compra não encontrada')) return 'compra_nao_encontrada'
  if (mensagemDoBanco.includes('recorrência')) return 'recorrencia_invalida'
  if (mensagemDoBanco.includes('devem pertencer a participantes')) return 'divisao_invalida'
  return 'falha'
}

export async function updatePurchase(formData: FormData) {
  const mesLista = mesDoForm(formData)
  const id = texto(formData, 'id')
  if (!UUID.test(id)) voltarParaLista(mesLista, 'erro', 'compra_nao_encontrada')

  const voltarAoFormulario: Falha = (codigo) => {
    const params = new URLSearchParams({ erro: codigo })
    if (mesLista) params.set('mes', mesLista)
    redirect(`/compras/${id}/editar?${params.toString()}`)
  }

  // A recorrência não muda na edição; quem decide é o que está gravado no banco
  const { params } = lerCompra(formData, voltarAoFormulario)

  const supabase = await createClient()
  const { error } = await supabase.rpc('update_purchase', {
    ...params,
    p_purchase_id: id,
    p_month: `${mesLista || params.p_first_installment_month.slice(0, 7)}-01`,
  })

  if (error) {
    console.error('Falha ao alterar compra:', error.message)
    voltarAoFormulario(codigoDoErro(error.message))
  }
  voltarParaLista(mesLista, 'aviso', 'compra_atualizada')
}

export async function deletePurchase(formData: FormData) {
  const mesLista = mesDoForm(formData)
  const id = texto(formData, 'id')
  if (!UUID.test(id) || !mesLista) voltarParaLista(mesLista, 'erro', 'falha')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('delete_purchase', {
    p_purchase_id: id,
    p_month: `${mesLista}-01`,
  })

  if (error) {
    console.error('Falha ao excluir compra:', error.message)
    voltarParaLista(mesLista, 'erro', codigoDoErro(error.message))
  }
  voltarParaLista(mesLista, 'aviso', data === 'encerrada' ? 'compra_encerrada' : 'compra_removida')
}
