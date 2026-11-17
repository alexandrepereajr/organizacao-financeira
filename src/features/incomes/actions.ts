'use server'

import { redirect } from 'next/navigation'
import { LIMITE_CENTAVOS, addMonths, toCents } from '@/features/purchases/calc'
import { MES } from '@/lib/month'
import { createClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type DestinoJson = {
  recipient: 'contact' | 'account'
  id: string
  kind: 'percent' | 'amount'
  value: number
}

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? '').trim()
}

function mesDoForm(formData: FormData): string {
  const mes = texto(formData, 'mes')
  if (!MES.test(mes)) redirect('/entradas?erro=mes_invalido')
  return mes
}

function voltar(mes: string, tipo: 'erro' | 'aviso', codigo: string): never {
  redirect(`/entradas?mes=${mes}&${tipo}=${codigo}`)
}

function codigoDoErro(message: string): string {
  if (message.includes('passa do valor')) return 'destino_excede'
  if (message.includes('Destino') || message.includes('duplicate key')) return 'destino_invalido'
  if (message.includes('Categoria')) return 'categoria_invalida'
  console.error('Falha em entrada:', message)
  return 'falha'
}

function dadosDaEntrada(formData: FormData, mes: string) {
  const descricao = texto(formData, 'descricao')
  if (descricao.length < 2 || descricao.length > 60) voltar(mes, 'erro', 'descricao_invalida')

  const cents = toCents(texto(formData, 'valor'))
  if (cents === null || cents > LIMITE_CENTAVOS) voltar(mes, 'erro', 'valor_invalido')

  const categoria = texto(formData, 'categoria')
  if (categoria !== '' && !UUID.test(categoria)) voltar(mes, 'erro', 'categoria_invalida')

  return {
    description: descricao,
    amount: Number((cents / 100).toFixed(2)),
    category_id: categoria === '' ? null : categoria,
  }
}

// Destinos de parte da entrada, enviados pelo formulário como JSON
function lerDestinos(formData: FormData, mes: string): DestinoJson[] {
  const bruto = texto(formData, 'destinos')
  if (bruto === '') return []

  try {
    const dados: unknown = JSON.parse(bruto)
    if (!Array.isArray(dados) || dados.length > 20) voltar(mes, 'erro', 'destino_invalido')

    return (dados as unknown[]).map((item) => {
      const { recipient, id, kind, value } = (item ?? {}) as Record<string, unknown>
      if (
        (recipient !== 'contact' && recipient !== 'account') ||
        typeof id !== 'string' ||
        !UUID.test(id) ||
        (kind !== 'percent' && kind !== 'amount') ||
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value <= 0 ||
        (kind === 'percent' && value > 100)
      ) {
        voltar(mes, 'erro', 'destino_invalido')
      }
      return { recipient, id, kind, value } as DestinoJson
    })
  } catch {
    voltar(mes, 'erro', 'destino_invalido')
  }
}

export async function createIncome(formData: FormData) {
  const mes = mesDoForm(formData)
  const dados = dadosDaEntrada(formData, mes)
  const destinos = lerDestinos(formData, mes)
  const recorrente = texto(formData, 'recorrente') === '1'

  const repetir = recorrente ? 1 : Number.parseInt(texto(formData, 'repetir') || '1', 10)
  if (!Number.isInteger(repetir) || repetir < 1 || repetir > 60) {
    voltar(mes, 'erro', 'repeticao_invalida')
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_income', {
    p_description: dados.description,
    p_amount: dados.amount,
    p_start_month: `${mes}-01`,
    p_repeat: repetir,
    p_recurring: recorrente,
    p_category: dados.category_id,
    p_shares: destinos,
  })

  if (error) voltar(mes, 'erro', codigoDoErro(error.message))
  voltar(mes, 'aviso', 'entrada_criada')
}

export async function updateIncome(formData: FormData) {
  const mes = mesDoForm(formData)
  const id = texto(formData, 'id')
  if (!UUID.test(id)) voltar(mes, 'erro', 'falha')
  const dados = dadosDaEntrada(formData, mes)
  const destinos = lerDestinos(formData, mes)

  const supabase = await createClient()
  const { error } = await supabase.rpc('update_income', {
    p_id: id,
    p_month: `${mes}-01`,
    p_description: dados.description,
    p_amount: dados.amount,
    p_category: dados.category_id,
    p_shares: destinos,
  })

  if (error) voltar(mes, 'erro', codigoDoErro(error.message))
  voltar(mes, 'aviso', 'entrada_atualizada')
}

export async function deleteIncome(formData: FormData) {
  const mes = mesDoForm(formData)
  const id = texto(formData, 'id')
  if (!UUID.test(id)) voltar(mes, 'erro', 'falha')

  const supabase = await createClient()
  const { data, error: erroLeitura } = await supabase
    .from('incomes')
    .select('is_recurring, reference_month')
    .eq('id', id)
    .single()

  if (erroLeitura || !data) {
    console.error('Falha ao ler a entrada:', erroLeitura?.message)
    voltar(mes, 'erro', 'falha')
  }

  const recorrente = Boolean(data.is_recurring)
  const inicio = String(data.reference_month).slice(0, 7)

  // Entrada única, ou recorrente que começa neste mês: apaga (os destinos saem junto)
  if (!recorrente || inicio >= mes) {
    const { error } = await supabase.from('incomes').delete().eq('id', id)
    if (error) {
      console.error('Falha ao remover entrada:', error.message)
      voltar(mes, 'erro', 'falha')
    }
    voltar(mes, 'aviso', 'entrada_removida')
  }

  // Recorrente que começou antes: encerra no mês anterior
  const { error } = await supabase
    .from('incomes')
    .update({ recurrence_end_month: `${addMonths(mes, -1)}-01` })
    .eq('id', id)

  if (error) {
    console.error('Falha ao encerrar recorrência:', error.message)
    voltar(mes, 'erro', 'falha')
  }
  voltar(mes, 'aviso', 'entrada_encerrada')
}