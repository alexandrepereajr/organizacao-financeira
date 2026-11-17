import { createCategory } from './actions'
import type { CategoryKind } from './queries'
import styles from '@/components/ui.module.css'

export function AddCategoryForm({ kind }: { kind: CategoryKind }) {
  return (
    <form action={createCategory} className={styles.form}>
      <input type="hidden" name="kind" value={kind} />
      <label className={styles.label}>
        Nova categoria
        <input className={styles.input} type="text" name="nome" minLength={2} maxLength={40} required />
      </label>
      <button className={styles.button} type="submit">Adicionar</button>
    </form>
  )
}