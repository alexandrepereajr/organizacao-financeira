import { formatMonth } from './calc'
import type { Tipo } from './types'
import styles from './purchases.module.css'

type Props = {
  tipo: Tipo
  recorrente: boolean
  mes: string
  onMes: (valor: string) => void
  parcelas: string
  onParcelas: (valor: string) => void
  mesFinal: string | null
  total: string
  parcela: string
  onTotal: (valor: string) => void
  onParcela: (valor: string) => void
}

export function InstallmentFields(props: Props) {
  const parcelado = props.tipo === 'parcelado'

  return (
    <>
      <div className={styles.grid2}>
        <label className={styles.label}>
          {props.recorrente ? 'Mês de início' : parcelado ? 'Mês da primeira parcela' : 'Mês da cobrança'}
          <input
            className={styles.input}
            type="month"
            value={props.mes}
            onChange={(e) => props.onMes(e.target.value)}
            required
          />
        </label>

        {parcelado && (
          <label className={styles.label}>
            Quantidade de parcelas
            <input
              className={styles.input}
              type="number"
              name="parcelas"
              min={2}
              max={120}
              step={1}
              value={props.parcelas}
              onChange={(e) => props.onParcelas(e.target.value)}
              required
            />
          </label>
        )}
      </div>

      {parcelado && (
        <label className={styles.label}>
          Mês da última parcela (calculado)
          <input
            className={`${styles.input} ${styles.somenteLeitura}`}
            type="text"
            value={formatMonth(props.mesFinal)}
            readOnly
            tabIndex={-1}
          />
        </label>
      )}

      <div className={styles.grid2}>
        {parcelado && (
          <label className={styles.label}>
            Valor da parcela (R$)
            <input
              className={styles.input}
              type="number"
              min={0.01}
              step="0.01"
              inputMode="decimal"
              value={props.parcela}
              onChange={(e) => props.onParcela(e.target.value)}
            />
          </label>
        )}
        <label className={styles.label}>
          {props.recorrente ? 'Valor mensal (R$)' : parcelado ? 'Valor total (R$)' : 'Valor (R$)'}
          <input
            className={styles.input}
            type="number"
            min={0.01}
            step="0.01"
            inputMode="decimal"
            value={props.total}
            onChange={(e) => props.onTotal(e.target.value)}
          />
        </label>
      </div>
    </>
  )
}