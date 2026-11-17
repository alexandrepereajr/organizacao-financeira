import type { Card } from './queries'
import styles from './cards.module.css'

export function ParticipantCardList({ cards }: { cards: Card[] }) {
  return (
    <ul className={styles.lista}>
      {cards.map((card) => (
        <li key={card.id} className={styles.item}>
          <div className={styles.linha}>
            <span className={styles.nome}>{card.name}</span>
            <span className={styles.tag}>de {card.owner_name}</span>
            {!card.is_active && <span className={styles.tag}>Inativo</span>}
          </div>
          <span className={styles.detalhe}>
            Fecha no dia {card.closing_day} · Vence no dia {card.due_day}
          </span>
        </li>
      ))}
    </ul>
  )
}