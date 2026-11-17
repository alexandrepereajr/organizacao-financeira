import { setCardActive, updateCard } from './actions'
import { CardFields } from './CardFields'
import type { Card } from './queries'
import styles from './cards.module.css'

export function CardList({ cards, mostrarOcultar }: { cards: Card[]; mostrarOcultar: boolean }) {
  if (cards.length === 0) {
    return <p className={styles.vazio}>Nenhum cartão ainda.</p>
  }

  return (
    <ul className={styles.lista}>
      {cards.map((card) => (
        <li key={card.id} className={styles.item}>
          <div className={styles.linha}>
            <span className={styles.nome}>{card.name}</span>
            {!card.is_active && <span className={styles.tag}>Inativo</span>}
            {card.hide_from_shared && <span className={styles.tag}>Oculto em contas compartilhadas</span>}
            <form action={setCardActive}>
              <input type="hidden" name="id" value={card.id} />
              <input type="hidden" name="ativo" value={card.is_active ? 'false' : 'true'} />
              <button className={styles.secundario} type="submit">
                {card.is_active ? 'Desativar' : 'Ativar'}
              </button>
            </form>
          </div>
          <span className={styles.detalhe}>
            Fecha no dia {card.closing_day} · Vence no dia {card.due_day}
          </span>
          <details className={styles.editar}>
            <summary>Editar</summary>
            <form action={updateCard} className={styles.form}>
              <input type="hidden" name="id" value={card.id} />
              <CardFields card={card} mostrarOcultar={mostrarOcultar} />
              <button className={styles.button} type="submit">Salvar</button>
            </form>
          </details>
        </li>
      ))}
    </ul>
  )
}