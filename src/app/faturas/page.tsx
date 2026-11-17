import Link from 'next/link'
import { MonthStepper } from '@/components/MonthStepper'
import { InvoiceList } from '@/features/invoices/InvoiceList'
import { mensagem } from '@/features/invoices/messages'
import { loadInvoiceRows } from '@/features/invoices/queries'
import { hojeEmSaoPaulo } from '@/features/purchases/calc'
import { mesOuPadrao } from '@/lib/month'
import styles from '@/components/ui.module.css'

export const instant = false

type Props = { searchParams: Promise<{ mes?: string; erro?: string; aviso?: string }> }

export default async function FaturasPage({ searchParams }: Props) {
  const params = await searchParams
  const hoje = hojeEmSaoPaulo().slice(0, 7)
  const mes = mesOuPadrao(params.mes, hoje)
  const msgErro = mensagem(params.erro)
  const msgAviso = mensagem(params.aviso)

  let rows = null
  try {
    rows = await loadInvoiceRows(mes)
  } catch (erro) {
    console.error('Falha ao carregar faturas:', erro)
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Faturas</h1>
          <Link href="/">Voltar</Link>
        </header>

        <MonthStepper basePath="/faturas" mes={mes} hoje={hoje} />

        {msgErro && <p role="alert" className={styles.erro}>{msgErro}</p>}
        {msgAviso && <p role="status" className={styles.aviso}>{msgAviso}</p>}

        <section className={styles.section}>
          <h2>Faturas fechadas do mês</h2>
          <p className={styles.hint}>
            Informe o valor exato que veio na fatura de cada cartão. A planilha passa a usá-lo no lugar do valor calculado.
          </p>
          {rows ? (
            <InvoiceList rows={rows} mes={mes} />
          ) : (
            <p role="alert" className={styles.erro}>Não foi possível carregar os cartões. Tente de novo.</p>
          )}
        </section>
      </div>
    </main>
  )
}