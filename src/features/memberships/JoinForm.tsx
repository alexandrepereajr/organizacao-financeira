import { requestJoin } from './actions'
import styles from '@/components/ui.module.css'

export function JoinForm() {
  return (
    <form action={requestJoin} className={styles.form}>
      <label className={styles.label}>
        Código ou username da conta compartilhada
        <input
          className={styles.input}
          type="text"
          name="valor"
          maxLength={21}
          autoCapitalize="none"
          autoComplete="off"
          required
        />
      </label>
      <button className={styles.button} type="submit">Pedir para entrar</button>
    </form>
  )
}