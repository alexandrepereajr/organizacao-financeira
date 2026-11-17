import Link from 'next/link'
import { connection } from 'next/server'
import { MonthStepper } from '@/components/MonthStepper'
import { listAccounts } from '@/features/accounts/queries'
import { listCategories } from '@/features/categories/queries'
import { listContacts } from '@/features/contacts/queries'
import { AddIncomeForm } from '@/features/incomes/AddIncomeForm'
import { IncomeList } from '@/features/incomes/IncomeList'
import { mensagem } from '@/features/incomes/messages'
import { listIncomes, listReceivedIncomes } from '@/features/incomes/queries'
import { ReceivedIncomeList } from '@/features/incomes/ReceivedIncomeList'
import { hojeEmSaoPaulo } from '@/features/purchases/calc'
import { mesOuPadrao } from '@/lib/month'
import styles from '@/components/ui.module.css'

export const instant = false

type Props = { searchParams: Promise<{ mes?: string; erro?: string; aviso?: string }> }

export default async function EntradasPage({ searchParams }: Props) {
  // Lê a data de hoje: precisa rodar na requisição, não no prerender
  await connection()
  const params = await searchParams
  const hoje = hojeEmSaoPaulo().slice(0, 7)
  const mes = mesOuPadrao(params.mes, hoje)

  const [incomes, recebidas, categories, contatos, contas] = await Promise.all([
    listIncomes(mes),
    listReceivedIncomes(mes),
    listCategories(),
    listContacts(),
    listAccounts(),
  ])

  const categoriasEntrada = categories.filter((c) => c.kind === 'income')
  const compartilhada = contas?.find((conta) => conta.isActive)?.isShared ?? false

  // Destinos só existem em contas normais: contas compartilhadas de que participa e seus contatos
  const opcoesContas = compartilhada
    ? []
    : (contas ?? []).filter((conta) => conta.isShared).map(({ id, name }) => ({ id, name }))
  const opcoesContatos = compartilhada ? [] : contatos.map(({ id, name }) => ({ id, name }))

  const msgErro = mensagem(params.erro)
  const msgAviso = mensagem(params.aviso)

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Entradas</h1>
          <Link href="/">Voltar</Link>
        </header>

        <MonthStepper basePath="/entradas" mes={mes} hoje={hoje} />

        {msgErro && <p role="alert" className={styles.erro}>{msgErro}</p>}
        {msgAviso && <p role="status" className={styles.aviso}>{msgAviso}</p>}

        <section className={styles.section}>
          <h2>Nova entrada</h2>
          <p className={styles.hint}>
            Use &quot;Repetir por&quot; para lançar de uma vez uma entrada que se repete todo mês.
          </p>
          <AddIncomeForm
            key={mes}
            mes={mes}
            categories={categoriasEntrada.filter((c) => c.isActive)}
            contas={opcoesContas}
            contatos={opcoesContatos}
            permitirDestinos={!compartilhada}
          />
        </section>

        <section className={styles.section}>
          <h2>Entradas do mês</h2>
          <IncomeList
            incomes={incomes}
            mes={mes}
            categories={categoriasEntrada}
            contas={opcoesContas}
            contatos={opcoesContatos}
            permitirDestinos={!compartilhada}
          />
        </section>

        {recebidas.length > 0 && (
          <section className={styles.section}>
            <h2>Recebidas por divisão</h2>
            <p className={styles.hint}>Partes de entradas de outras contas destinadas a esta conta.</p>
            <ReceivedIncomeList incomes={recebidas} />
          </section>
        )}
      </div>
    </main>
  )
}