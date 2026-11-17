'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function codigoDoErro(message: string) {
  if (message.includes('não encontrado')) return 'codigo_nao_encontrado'
  if (message.includes('compartilhadas')) return 'conta_compartilhada'
  if (message.includes('por convite')) return 'usar_convite'
  if (message.includes('adicionar a si mesmo')) return 'codigo_proprio'
  console.error('Falha ao adicionar contato:', message)
  return 'falha'
}

export async function addContactByCode(formData: FormData) {
  const codigo = String(formData.get('codigo') ?? '').trim()
  if (!codigo) redirect('/contatos?erro=codigo_vazio')

  const supabase = await createClient()
  const { error } = await supabase.rpc('add_contact_by_identifier', { p_value: codigo })

  if (error) redirect(`/contatos?erro=${codigoDoErro(error.message)}`)
  redirect('/contatos?aviso=contato_adicionado')
}

export async function addContactByName(formData: FormData) {
  const nome = String(formData.get('nome') ?? '').trim()
  if (nome.length < 2 || nome.length > 80) redirect('/contatos?erro=nome_invalido')

  const supabase = await createClient()
  const { error } = await supabase.from('contacts').insert({ name: nome })

  if (error) {
    console.error('Falha ao criar contato:', error.message)
    redirect('/contatos?erro=falha')
  }
  redirect('/contatos?aviso=contato_adicionado')
}

export async function deleteContact(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) redirect('/contatos?erro=falha')

  const supabase = await createClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)

  if (error) {
    // 23503 = o contato está em alguma divisão de compra
    if (error.code === '23503') redirect('/contatos?erro=contato_em_uso')
    console.error('Falha ao remover contato:', error.message)
    redirect('/contatos?erro=falha')
  }
  redirect('/contatos?aviso=contato_removido')
}