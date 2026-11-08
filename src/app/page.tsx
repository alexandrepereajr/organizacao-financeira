import { redirect } from 'next/navigation'
import { signOut } from '@/features/auth/actions'
import { createClient } from '@/lib/supabase/server'
import styles from '@/features/auth/auth.module.css'

export const instant = false
export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, share_code')
    .eq('id', user.id)
    .single()

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Olá, {profile?.display_name ?? user.email}</h1>
        <p className={styles.subtitle}>Seu código para ser adicionado por outras pessoas:</p>
        <p className={styles.code}>{profile?.share_code ?? 'não encontrado'}</p>
        <form action={signOut}>
          <button className={styles.button} type="submit">Sair</button>
        </form>
      </section>
    </main>
  )
}