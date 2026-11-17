import Link from 'next/link'
import { connection } from 'next/server'
import { listAccounts } from '@/features/accounts/queries'
import { AddCardForm } from '@/features/cards/AddCardForm'
import { CardList } from '@/features/cards/CardList'
import { mensagem } from '@/features/cards/messages'
import { ParticipantCardList } from '@/features/cards/ParticipantCardList'
import { listCards } from '@/features/cards/queries'
import styles from '@/features/cards/cards.module.css'

export const instant = false

type Props = { searchParams: Promise<{ erro?: string; aviso?: string }> }

export default async function CartoesPage({ searchParams }: Props) {
  // As consultas chamam getUser(), que usa Date.now(): precisa rodar na requisição
  await connection()
  const { erro, aviso } = await searchParams
  const [cards, contas] = await Promise.all([listCards(), listAccounts()])
  const compartilhada = contas?.find((conta) => conta.isActive)?.isShared ?? false
  const proprios = cards.filter((card) => card.is_own)
  const dosParticipantes = cards.filter((card) => !card.is_own)
  const msgErro = mensagem(erro)
  const msgAviso = mensagem(aviso)

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Cartões</h1>
          <Link href="/">Voltar</Link>
        </header>

        {msgErro && <p role="alert" className={styles.erro}>{msgErro}</p>}
        {msgAviso && <p role="status" className={styles.aviso}>{msgAviso}</p>}

        <section className={styles.section}>
          <h2>Novo cartão</h2>
          <AddCardForm mostrarOcultar={!compartilhada} />
        </section>

        <section className={styles.section}>
          <h2>{compartilhada ? 'Cartões da conta compartilhada' : 'Seus cartões'}</h2>
          <CardList cards={proprios} mostrarOcultar={!compartilhada} />
        </section>

        {compartilhada && (
          <section className={styles.section}>
            <h2>Cartões dos participantes</h2>
            {dosParticipantes.length > 0 ? (
              <ParticipantCardList cards={dosParticipantes} />
            ) : (
              <p>Nenhum cartão de participante disponível.</p>
            )}
          </section>
        )}
      </div>
    </main>
  )
}