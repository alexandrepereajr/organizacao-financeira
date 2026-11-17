import Link from 'next/link'
import { connection } from 'next/server'
import { JoinForm } from '@/features/memberships/JoinForm'
import { MembershipList } from '@/features/memberships/MembershipList'
import { mensagem } from '@/features/memberships/messages'
import { listMemberships } from '@/features/memberships/queries'
import styles from '@/components/ui.module.css'

export const instant = false

type Props = { searchParams: Promise<{ erro?: string; aviso?: string }> }

export default async function ContasPage({ searchParams }: Props) {
  // As consultas chamam getUser(), que usa Date.now(): precisa rodar na requisição
  await connection()
  const { erro, aviso } = await searchParams
  const items = await listMemberships()
  const msgErro = mensagem(erro)
  const msgAviso = mensagem(aviso)

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Contas compartilhadas</h1>
          <Link href="/">Voltar</Link>
        </header>

        {msgErro && <p role="alert" className={styles.erro}>{msgErro}</p>}
        {msgAviso && <p role="status" className={styles.aviso}>{msgAviso}</p>}

        <section className={styles.section}>
          <h2>Pedir para entrar</h2>
          <p className={styles.hint}>
            Use o código ou o username da conta compartilhada. Ela precisa aprovar o pedido.
          </p>
          <JoinForm />
        </section>

        <section className={styles.section}>
          <h2>Suas contas compartilhadas</h2>
          <MembershipList items={items} modo="membro" voltar="/contas" />
        </section>
      </div>
    </main>
  )
}