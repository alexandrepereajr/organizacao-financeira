import Link from 'next/link'
import { connection } from 'next/server'
import { listCards } from '@/features/cards/queries'
import { listContacts } from '@/features/contacts/queries'
import { hojeEmSaoPaulo } from '@/features/purchases/calc'
import { mensagem } from '@/features/purchases/messages'
import { PurchaseForm } from '@/features/purchases/PurchaseForm'
import styles from '@/features/purchases/purchases.module.css'
import { listCategories } from '@/features/categories/queries'
import { listAccounts } from '@/features/accounts/queries'
import { listSharedAccountOptions } from '@/features/purchases/queries'

export const instant = false

type Props = { searchParams: Promise<{ erro?: string; aviso?: string }> }

export default async function NovaCompraPage({ searchParams }: Props) {
  // Lê a data de hoje: precisa rodar na requisição, não no prerender
  await connection()
  const { erro, aviso } = await searchParams
  const [cards, contacts, categories, contas] = await Promise.all([
    listCards(),
    listContacts(),
    listCategories(),
    listAccounts(),
  ])
  const contaCompartilhada = contas?.find((conta) => conta.isActive)?.isShared ?? false
  const contasCompartilhadas = await listSharedAccountOptions(contas)
  const hoje = hojeEmSaoPaulo()
  const msgErro = mensagem(erro)
  const msgAviso = mensagem(aviso)

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Nova compra</h1>
          <Link href="/">Voltar</Link>
        </header>

        {msgErro && <p role="alert" className={styles.erro}>{msgErro}</p>}
        {msgAviso && <p role="status" className={styles.aviso}>{msgAviso}</p>}

        <PurchaseForm
          cards={cards
            .filter((c) => c.is_active)
            .map((c) => ({ id: c.id, name: c.is_own ? c.name : `${c.name} (${c.owner_name})` }))}
          categories={categories
            .filter((c) => c.kind === 'purchase' && c.isActive)
            .map(({ id, name }) => ({ id, name }))}
          contacts={contacts.map(({ id, name }) => ({ id, name }))}
          contasCompartilhadas={contasCompartilhadas}
          contaCompartilhada={contaCompartilhada}
          hoje={hoje}
        />
      </div>
    </main>
  )
}