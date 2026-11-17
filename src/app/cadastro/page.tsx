import Link from 'next/link'
import { signUp } from '@/features/auth/actions'
import { AuthShell } from '@/features/auth/AuthShell'
import { mensagem } from '@/features/auth/messages'
import styles from '@/features/auth/auth.module.css'

export const instant = false

type Props = { searchParams: Promise<{ erro?: string }> }

export default async function CadastroPage({ searchParams }: Props) {
  const { erro } = await searchParams

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Você receberá um código único para ser adicionado por outras pessoas"
      erro={mensagem(erro)}
    >
      <form action={signUp} className={styles.form}>
        <label className={styles.label}>
          Nome
          <input className={styles.input} type="text" name="nome" autoComplete="name" required minLength={2} />
        </label>
        <label className={styles.label}>
          Username (3 a 20 caracteres: letras minúsculas, números e _)
          <input
            className={styles.input}
            type="text"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_]{3,20}"
          />
        </label>
        <label className={styles.label}>
          E-mail
          <input className={styles.input} type="email" name="email" autoComplete="email" required />
        </label>
        <label className={styles.label}>
          Senha (mínimo de 8 caracteres)
          <input
            className={styles.input}
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        <label className={styles.check}>
          <input type="checkbox" name="compartilhada" value="1" />
          Conta compartilhada (para dividir despesas entre várias pessoas)
        </label>
        <button className={styles.button} type="submit">Criar conta</button>
      </form>
      <p className={styles.footer}>
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </AuthShell>
  )
}