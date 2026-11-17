import { addContactByCode } from './actions'
import styles from './contacts.module.css'

export function AddByCodeForm() {
  return (
    <form action={addContactByCode} className={styles.form}>
      <input
        className={styles.input}
        type="text"
        name="codigo"
        placeholder="Código ou username"
        maxLength={21}
        autoCapitalize="none"
        autoComplete="off"
        required
      />
      <button className={styles.button} type="submit">Adicionar</button>
    </form>
  )
}