import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { signOut } from '@/features/auth/actions'
import { createClient } from '@/lib/supabase/server'
import styles from '@/features/auth/auth.module.css'
import Link from 'next/link'

export const instant = false
export default async function HomePage() {
  // getUser() usa Date.now(): precisa rodar na requisição, não no prerender
  await connection()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: contas } = await supabase.rpc('current_account')
  const profile = contas?.[0] ?? null

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Olá, {profile?.display_name ?? user.email}</h1>
        <p className={styles.subtitle}>
          @{profile?.username}
          {profile?.account_type === 'shared' ? ' · Conta compartilhada' : ''}
        </p>
        <p className={styles.subtitle}>Seu código para ser adicionado por outras pessoas:</p>
        <p className={styles.code}>{profile?.share_code ?? 'não encontrado'}</p>
        <p><Link href="/contatos">Meus contatos</Link></p>
        <p><Link href="/cartoes">Meus cartões</Link></p>
        <p><Link href="/categorias">Categorias</Link></p>
        {profile?.account_type === 'shared' ? (
          <>
            <p><Link href="/participantes">Participantes</Link></p>
            <p><Link href="/pendentes">Compras incompletas</Link></p>
          </>
        ) : (
          <p><Link href="/contas">Contas compartilhadas</Link></p>
        )}
        <p><Link href="/compras">Compras</Link></p>
        <p><Link href="/compras/nova">Nova compra</Link></p>
        <p><Link href="/entradas">Entradas</Link></p>
        <p><Link href="/faturas">Faturas</Link></p>
        <p><Link href="/visoes/planilha">Planilha</Link></p>
        <form action={signOut}>
          <button className={styles.button} type="submit">Sair</button>
        </form>
      </section>
    </main>
  )
}