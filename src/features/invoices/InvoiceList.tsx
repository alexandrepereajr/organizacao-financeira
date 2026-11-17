import { formatCents } from '@/features/purchases/calc'
import { removeInvoice, saveInvoice } from './actions'
import type { InvoiceRow } from './queries'
import styles from '@/components/ui.module.css'

export function InvoiceList({ rows, mes }: { rows: InvoiceRow[]; mes: string }) {
  if (rows.length === 0) {
    return <p className={styles.vazio}>Nenhum cartão ativo. Cadastre um em Cartões.</p>
  }

  return (
    <ul className={styles.lista}>
      {rows.map((row) => {
        const diferenca = row.invoiceCents !== null ? row.invoiceCents - row.calculatedCents : null

        return (
          <li key={`${row.cardId}-${row.invoiceCents}`} className={styles.item}>
            <div className={styles.linha}>
              <span className={styles.nome}>{row.cardName}</span>
              {!row.isActive && <span className={styles.tag}>Inativo</span>}
            </div>
            <span className={styles.detalhe}>
              Calculado pelas compras: {formatCents(row.calculatedCents)}
            </span>

            <form action={saveInvoice} className={styles.form}>
              <input type="hidden" name="cartao" value={row.cardId} />
              <input type="hidden" name="mes" value={mes} />
              <label className={styles.label}>
                Fatura fechada (R$)
                <input
                  className={styles.input}
                  type="number"
                  name="valor"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  defaultValue={row.invoiceCents !== null ? (row.invoiceCents / 100).toFixed(2) : ''}
                  required
                />
              </label>
              <button className={styles.button} type="submit">Salvar fatura</button>
            </form>

            {diferenca !== null && (
              <span className={diferenca === 0 ? styles.detalhe : diferenca > 0 ? styles.positivo : styles.negativo}>
                {diferenca === 0
                  ? 'A fatura confere com o calculado.'
                  : `Diferença para o calculado: ${formatCents(diferenca)}`}
              </span>
            )}

            {row.invoiceCents !== null && (
              <form action={removeInvoice}>
                <input type="hidden" name="cartao" value={row.cardId} />
                <input type="hidden" name="mes" value={mes} />
                <button className={styles.remover} type="submit">Remover fatura</button>
              </form>
            )}
          </li>
        )
      })}
    </ul>
  )
}