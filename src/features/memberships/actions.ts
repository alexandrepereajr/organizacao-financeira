'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Volta = '/contas' | '/participantes'

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? '').trim()
}

function ir(volta: Volta, tipo: 'erro' | 'aviso', codigo: string): never {
  redirect(`${volta}?${tipo}=${codigo}`)
}

function codigoDoErro(message: string): string {
  if (message.includes('não encontrado')) return 'nao_encontrado'
  if (message.includes('não é de uma conta compartilhada')) return 'nao_compartilhada'
  if (message.includes('Só contas')) return 'tipo_invalido'
  console.error('Falha em vínculo de conta:', message)
  return 'falha'
}

export async function requestJoin(formData: FormData) {
  const valor = texto(formData, 'valor')
  if (!valor) ir('/contas', 'erro', 'valor_vazio')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('request_join', { p_value: valor })

  if (error) ir('/contas', 'erro', codigoDoErro(error.message))
  ir('/contas', 'aviso', data === 'active' ? 'vinculo_ativo' : 'pedido_enviado')
}

export async function inviteMember(formData: FormData) {
  const valor = texto(formData, 'valor')
  if (!valor) ir('/participantes', 'erro', 'valor_vazio')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('invite_member', { p_value: valor })

  if (error) ir('/participantes', 'erro', codigoDoErro(error.message))
  ir('/participantes', 'aviso', data === 'active' ? 'vinculo_ativo' : 'convite_enviado')
}

export async function respondInvitation(formData: FormData) {
  const conta = texto(formData, 'conta')
  const aceitar = texto(formData, 'aceitar') === 'sim'
  if (!UUID.test(conta)) ir('/contas', 'erro', 'falha')

  const supabase = await createClient()
  const { error } = await supabase.rpc('respond_invitation', {
    p_shared_account: conta,
    p_accept: aceitar,
  })

  if (error) ir('/contas', 'erro', codigoDoErro(error.message))
  ir('/contas', 'aviso', aceitar ? 'convite_aceito' : 'convite_recusado')
}

export async function respondRequest(formData: FormData) {
  const membro = texto(formData, 'membro')
  const aceitar = texto(formData, 'aceitar') === 'sim'
  if (!UUID.test(membro)) ir('/participantes', 'erro', 'falha')

  const supabase = await createClient()
  const { error } = await supabase.rpc('respond_request', {
    p_member: membro,
    p_accept: aceitar,
  })

  if (error) ir('/participantes', 'erro', codigoDoErro(error.message))
  ir('/participantes', 'aviso', aceitar ? 'pedido_aceito' : 'pedido_recusado')
}

export async function removeMember(formData: FormData) {
  const outro = texto(formData, 'outro')
  const volta: Volta = texto(formData, 'volta') === '/participantes' ? '/participantes' : '/contas'
  if (!UUID.test(outro)) ir(volta, 'erro', 'falha')

  const supabase = await createClient()
  const { error } = await supabase.rpc('remove_member', { p_other: outro })

  if (error) ir(volta, 'erro', codigoDoErro(error.message))
  ir(volta, 'aviso', 'vinculo_removido')
}