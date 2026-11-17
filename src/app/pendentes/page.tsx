import Link from 'next/link'
import { listAccounts } from '@/features/accounts/queries'
import { listContacts } from '@/features/contacts/queries'
import { mensagem } from '@/features/pending/messages'
import { PendingList } from '@/features/pending/PendingList'
import { listPendingPurchases } from '@/features/pending/queries'
import styles from '@/components/ui.module.css'

export const instant = false

type Props = { searchParams: Promise<{ erro?: string; aviso?: string }> }

export default async function PendentesPage({ searchParams }: Props) {
  const { erro, aviso } = await searchParams
  const [contas, contatos] = await Promise.all([listAccounts(), listContacts()])
  const compartilhada = contas?.find((conta) => conta.isActive)?.isShared ?? false
  const compras = compartilhada ? await listPendingPurchases() : []
  const msgErro = mensagem(erro)
  const msgAviso = mensagem(aviso)

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Compras incompletas</h1>
          <Link href="/">Voltar</Link>
        </header>

        {msgErro && <p role="alert" className={styles.erro}>{msgErro}</p>}
        {msgAviso && <p role="status" className={styles.aviso}>{msgAviso}</p>}

        {compartilhada ? (
          <section className={styles.section}>
            <h2>Indique os participantes</h2>
            <p className={styles.hint}>
              Estas compras foram vinculadas à conta compartilhada sem participantes. Escolha quem
              participa e os percentuais de cada um.
            </p>
            <PendingList
              compras={compras}
              participantes={contatos.map(({ id, name }) => ({ id, name }))}
            />
          </section>
        ) : (
          <section className={styles.section}>
            <p>
              Esta tela é da conta compartilhada. Troque para ela no seletor de conta, no topo da
              página.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}