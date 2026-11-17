import { formatCents } from '@/features/purchases/calc'
import type { ReceivedIncome } from './queries'
import styles from '@/components/ui.module.css'

export function ReceivedIncomeList({ incomes }: { incomes: ReceivedIncome[] }) {
  const total = incomes.reduce((soma, item) => soma + item.amountCents, 0)

  return (
    <>
      <ul className={styles.lista}>
        {incomes.map((income) => (
          <li key={income.id} className={styles.item}>
            <div className={styles.linha}>
              <span className={styles.nome}>{income.description}</span>
              <span>{formatCents(income.amountCents)}</span>
            </div>
            <span className={styles.detalhe}>de {income.ownerName}</span>
          </li>
        ))}
      </ul>
      <p className={styles.total}>Total recebido: {formatCents(total)}</p>
    </>
  )
}