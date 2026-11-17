'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? '').trim()
}

function nomeDoForm(formData: FormData): string {
  const nome = texto(formData, 'nome')
  if (nome.length < 2 || nome.length > 40) redirect('/categorias?erro=nome_invalido')
  return nome
}

export async function createCategory(formData: FormData) {
  const kind = texto(formData, 'kind')
  if (kind !== 'purchase' && kind !== 'income') redirect('/categorias?erro=tipo_invalido')
  const nome = nomeDoForm(formData)

  const supabase = await createClient()
  const { error } = await supabase.from('categories').insert({ kind, name: nome })

  if (error) {
    if (error.code === '23505') redirect('/categorias?erro=nome_repetido')
    console.error('Falha ao criar categoria:', error.message)
    redirect('/categorias?erro=falha')
  }
  redirect('/categorias?aviso=categoria_criada')
}

export async function updateCategory(formData: FormData) {
  const id = texto(formData, 'id')
  if (!id) redirect('/categorias?erro=falha')
  const nome = nomeDoForm(formData)

  const supabase = await createClient()
  const { error } = await supabase.from('categories').update({ name: nome }).eq('id', id)

  if (error) {
    if (error.code === '23505') redirect('/categorias?erro=nome_repetido')
    console.error('Falha ao atualizar categoria:', error.message)
    redirect('/categorias?erro=falha')
  }
  redirect('/categorias?aviso=categoria_atualizada')
}

export async function setCategoryActive(formData: FormData) {
  const id = texto(formData, 'id')
  const ativo = formData.get('ativo') === 'true'
  if (!id) redirect('/categorias?erro=falha')

  const supabase = await createClient()
  const { error } = await supabase.from('categories').update({ is_active: ativo }).eq('id', id)

  if (error) {
    console.error('Falha ao alterar categoria:', error.message)
    redirect('/categorias?erro=falha')
  }
  redirect(`/categorias?aviso=${ativo ? 'categoria_ativada' : 'categoria_desativada'}`)
}