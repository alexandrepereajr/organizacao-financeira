import { formatCents, formatMonth } from '@/features/purchases/calc'
import type { ContactOption } from '@/features/purchases/types'
import { CompleteSharesForm } from './CompleteSharesForm'
import type { PendingPurchase } from './queries'
import styles from '@/components/ui.module.css'

type Props = { compras: PendingPurchase[]; participantes: ContactOption[] }

function periodo(compra: PendingPurchase): string {
  if (compra.isRecurring) return `Recorrente desde ${formatMonth(compra.firstMonth)}`
  if (compra.installmentsCount > 1) {
    return `${compra.installmentsCount}x a partir de ${formatMonth(compra.firstMonth)}`
  }
  return `Mês ${formatMonth(compra.firstMonth)}`
}

export function PendingList({ compras, participantes }: Props) {
  if (compras.length === 0) {
    return <p className={styles.vazio}>Nenhuma compra incompleta.</p>
  }

  return (
    <ul className={styles.lista}>
      {compras.map((compra) => (
        <li key={compra.id} className={styles.item}>
          <div className={styles.linha}>
            <span className={styles.nome}>{compra.description}</span>
            <span>{formatCents(compra.totalCents)}</span>
          </div>
          <span className={styles.detalhe}>
            de {compra.ownerName} · {periodo(compra)}
          </span>
          <CompleteSharesForm
            purchaseId={compra.id}
            totalCents={compra.totalCents}
            participantes={participantes}
          />
        </li>
      ))}
    </ul>
  )
}