import Link from 'next/link'
import { connection } from 'next/server'
import { InviteForm } from '@/features/memberships/InviteForm'
import { MembershipList } from '@/features/memberships/MembershipList'
import { mensagem } from '@/features/memberships/messages'
import { listMemberships } from '@/features/memberships/queries'
import styles from '@/components/ui.module.css'

export const instant = false

type Props = { searchParams: Promise<{ erro?: string; aviso?: string }> }

export default async function ParticipantesPage({ searchParams }: Props) {
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
          <h1>Participantes</h1>
          <Link href="/">Voltar</Link>
        </header>

        {msgErro && <p role="alert" className={styles.erro}>{msgErro}</p>}
        {msgAviso && <p role="status" className={styles.aviso}>{msgAviso}</p>}

        <section className={styles.section}>
          <h2>Convidar alguém com conta</h2>
          <p className={styles.hint}>
            Use o código ou o username da pessoa. Ela precisa aceitar o convite.
          </p>
          <InviteForm />
        </section>

        <section className={styles.section}>
          <h2>Participantes com conta</h2>
          <MembershipList items={items} modo="conta" voltar="/participantes" />
        </section>

        <section className={styles.section}>
          <h2>Pessoas sem conta</h2>
          <p className={styles.hint}>
            Quem não tem conta é só um nome na lista, para dividir compras.
          </p>
          <Link href="/contatos">Gerenciar pessoas sem conta</Link>
        </section>
      </div>
    </main>
  )
}