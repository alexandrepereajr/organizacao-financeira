import type { ReactNode } from 'react'
import styles from './auth.module.css'

type Props = {
  title: string
  subtitle?: string
  erro?: string
  aviso?: string
  children: ReactNode
}

export function AuthShell({ title, subtitle, erro, aviso, children }: Props) {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {erro && <p role="alert" className={styles.erro}>{erro}</p>}
        {aviso && <p role="status" className={styles.aviso}>{aviso}</p>}
        {children}
      </section>
    </main>
  )
}