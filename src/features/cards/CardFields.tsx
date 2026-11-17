import type { Card } from './queries'
import styles from './cards.module.css'

type Props = { card?: Card; mostrarOcultar?: boolean }

export function CardFields({ card, mostrarOcultar = false }: Props) {
  return (
    <>
      <div className={styles.campos}>
        <label className={styles.label}>
          Nome
          <input
            className={styles.input}
            type="text"
            name="nome"
            defaultValue={card?.name}
            minLength={2}
            maxLength={40}
            required
          />
        </label>
        <label className={styles.label}>
          Fecha no dia
          <input
            className={styles.input}
            type="number"
            name="fechamento"
            defaultValue={card?.closing_day}
            min={1}
            max={31}
            required
          />
        </label>
        <label className={styles.label}>
          Vence no dia
          <input
            className={styles.input}
            type="number"
            name="vencimento"
            defaultValue={card?.due_day}
            min={1}
            max={31}
            required
          />
        </label>
      </div>

      {mostrarOcultar && (
        <label className={styles.check}>
          <input
            type="checkbox"
            name="ocultar"
            value="1"
            defaultChecked={card?.hide_from_shared ?? false}
          />
          Ocultar em contas compartilhadas
        </label>
      )}
    </>
  )
}