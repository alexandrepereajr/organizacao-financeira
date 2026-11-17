import { inviteMember } from './actions'
import styles from '@/components/ui.module.css'

export function InviteForm() {
  return (
    <form action={inviteMember} className={styles.form}>
      <label className={styles.label}>
        Código ou username da pessoa
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
      <button className={styles.button} type="submit">Convidar</button>
    </form>
  )
}