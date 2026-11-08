import Link from 'next/link'
import { signIn } from '@/features/auth/actions'
import { AuthShell } from '@/features/auth/AuthShell'
import { mensagem } from '@/features/auth/messages'
import styles from '@/features/auth/auth.module.css'

export const instant = false
type Props = { searchParams: Promise<{ erro?: string; aviso?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const { erro, aviso } = await searchParams

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse sua organização financeira"
      erro={mensagem(erro)}
      aviso={mensagem(aviso)}
    >
      <form action={signIn} className={styles.form}>
        <label className={styles.label}>
          E-mail
          <input className={styles.input} type="email" name="email" autoComplete="email" required />
        </label>
        <label className={styles.label}>
          Senha
          <input className={styles.input} type="password" name="password" autoComplete="current-password" required />
        </label>
        <button className={styles.button} type="submit">Entrar</button>
      </form>
      <p className={styles.footer}>
        Ainda não tem conta? <Link href="/cadastro">Criar conta</Link>
      </p>
    </AuthShell>
  )
}