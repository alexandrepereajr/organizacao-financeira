import Link from 'next/link'
import { connection } from 'next/server'
import { MonthStepper } from '@/components/MonthStepper'
import { listAccounts } from '@/features/accounts/queries'
import { listCards } from '@/features/cards/queries'
import { listCategories } from '@/features/categories/queries'
import { hojeEmSaoPaulo } from '@/features/purchases/calc'
import { mensagem } from '@/features/purchases/messages'
import { PurchaseList } from '@/features/purchases/PurchaseList'
import { listMonthPurchases } from '@/features/purchases/queries'
import { mesOuPadrao } from '@/lib/month'
import styles from '@/components/ui.module.css'

export const instant = false

type Props = { searchParams: Promise<{ mes?: string; erro?: string; aviso?: string }> }

export default async function ComprasPage({ searchParams }: Props) {
  // Lê a data de hoje: precisa rodar na requisição, não no prerender
  await connection()
  const params = await searchParams
  const hoje = hojeEmSaoPaulo().slice(0, 7)
  const mes = mesOuPadrao(params.mes, hoje)
  const msgErro = mensagem(params.erro)
  const msgAviso = mensagem(params.aviso)

  const contas = await listAccounts()
  const ativa = contas?.find((conta) => conta.isActive)
  const [compras, cards, categories] = await Promise.all([
    ativa ? listMonthPurchases(ativa.id, mes) : Promise.resolve([]),
    listCards(),
    listCategories(),
  ])

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Compras</h1>
          <Link href="/">Voltar</Link>
        </header>

        <MonthStepper basePath="/compras" mes={mes} hoje={hoje} />

        {msgErro && <p role="alert" className={styles.erro}>{msgErro}</p>}
        {msgAviso && <p role="status" className={styles.aviso}>{msgAviso}</p>}

        <p className={styles.hint}>
          Compras desta conta que cobram algo no mês. <Link href="/compras/nova">Nova compra</Link>
        </p>

        <section className={styles.section}>
          <PurchaseList
            compras={compras}
            mes={mes}
            nomesCartoes={new Map(cards.map((c) => [c.id, c.name]))}
            nomesCategorias={new Map(categories.map((c) => [c.id, c.name]))}
          />
        </section>
      </div>
    </main>
  )
}
