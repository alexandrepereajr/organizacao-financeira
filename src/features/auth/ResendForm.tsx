import { resendConfirmation } from './actions'
import styles from './auth.module.css'

// Pede um novo e-mail de confirmação de cadastro
export function ResendForm() {
  return (
    <form action={resendConfirmation} className={styles.form}>
      <label className={styles.label}>
        Reenviar e-mail de confirmação para
        <input className={styles.input} type="email" name="email" autoComplete="email" required />
      </label>
      <button className={styles.button} type="submit">Reenviar</button>
    </form>
  )
}
