import { createClient } from '@/lib/supabase/server'

export type CategoryKind = 'purchase' | 'income'

export type Category = {
  id: string
  kind: CategoryKind
  name: string
  isActive: boolean
}

export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, kind, name, is_active')
    .order('is_active', { ascending: false })
    .order('name')

  if (error) {
    console.error('Falha ao listar categorias:', error.message)
    return []
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    kind: item.kind as CategoryKind,
    name: item.name,
    isActive: item.is_active,
  }))
}