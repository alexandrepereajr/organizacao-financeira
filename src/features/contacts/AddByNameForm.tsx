import { addContactByName } from './actions'
import styles from './contacts.module.css'

export function AddByNameForm() {
  return (
    <form action={addContactByName} className={styles.form}>
      <input
        className={styles.input}
        type="text"
        name="nome"
        placeholder="Nome da pessoa"
        minLength={2}
        maxLength={80}
        autoComplete="off"
        required
      />
      <button className={styles.button} type="submit">Adicionar</button>
    </form>
  )
}