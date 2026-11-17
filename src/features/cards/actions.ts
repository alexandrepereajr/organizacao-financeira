'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function dia(formData: FormData, campo: string): number | null {
  const valor = Number(formData.get(campo))
  return Number.isInteger(valor) && valor >= 1 && valor <= 31 ? valor : null
}

function dadosDoCartao(formData: FormData) {
  const nome = String(formData.get('nome') ?? '').trim()
  const fechamento = dia(formData, 'fechamento')
  const vencimento = dia(formData, 'vencimento')

  if (nome.length < 2 || nome.length > 40) redirect('/cartoes?erro=nome_invalido')
  if (fechamento === null || vencimento === null) redirect('/cartoes?erro=dia_invalido')

  return {
    name: nome,
    closing_day: fechamento,
    due_day: vencimento,
    hide_from_shared: formData.get('ocultar') === '1',
  }
}

export async function createCard(formData: FormData) {
  const dados = dadosDoCartao(formData)

  const supabase = await createClient()
  const { error } = await supabase.from('cards').insert(dados)

  if (error) {
    console.error('Falha ao criar cartão:', error.message)
    redirect('/cartoes?erro=falha')
  }
  redirect('/cartoes?aviso=cartao_criado')
}

export async function updateCard(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) redirect('/cartoes?erro=falha')
  const dados = dadosDoCartao(formData)

  const supabase = await createClient()
  const { error } = await supabase.from('cards').update(dados).eq('id', id)

  if (error) {
    console.error('Falha ao atualizar cartão:', error.message)
    redirect('/cartoes?erro=falha')
  }
  redirect('/cartoes?aviso=cartao_atualizado')
}

export async function setCardActive(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const ativo = formData.get('ativo') === 'true'
  if (!id) redirect('/cartoes?erro=falha')

  const supabase = await createClient()
  const { error } = await supabase.from('cards').update({ is_active: ativo }).eq('id', id)

  if (error) {
    console.error('Falha ao alterar cartão:', error.message)
    redirect('/cartoes?erro=falha')
  }
  redirect(`/cartoes?aviso=${ativo ? 'cartao_ativado' : 'cartao_desativado'}`)
}