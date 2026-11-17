import { createCard } from './actions'
import { CardFields } from './CardFields'
import styles from './cards.module.css'

export function AddCardForm({ mostrarOcultar }: { mostrarOcultar: boolean }) {
  return (
    <form action={createCard} className={styles.form}>
      <CardFields mostrarOcultar={mostrarOcultar} />
      <button className={styles.button} type="submit">Adicionar cartão</button>
    </form>
  )
}