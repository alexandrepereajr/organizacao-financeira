import { setCategoryActive, updateCategory } from './actions'
import type { Category } from './queries'
import styles from '@/components/ui.module.css'

export function CategoryList({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return <p className={styles.vazio}>Nenhuma categoria ainda.</p>
  }

  return (
    <ul className={styles.lista}>
      {categories.map((category) => (
        <li key={category.id} className={styles.item}>
          <div className={styles.linha}>
            <span className={styles.nome}>{category.name}</span>
            {!category.isActive && <span className={styles.tag}>Inativa</span>}
            <form action={setCategoryActive}>
              <input type="hidden" name="id" value={category.id} />
              <input type="hidden" name="ativo" value={category.isActive ? 'false' : 'true'} />
              <button className={styles.remover} type="submit">
                {category.isActive ? 'Desativar' : 'Ativar'}
              </button>
            </form>
          </div>
          <details className={styles.editar}>
            <summary>Renomear</summary>
            <form action={updateCategory} className={styles.form}>
              <input type="hidden" name="id" value={category.id} />
              <input
                className={styles.input}
                type="text"
                name="nome"
                defaultValue={category.name}
                minLength={2}
                maxLength={40}
                required
              />
              <button className={styles.button} type="submit">Salvar</button>
            </form>
          </details>
        </li>
      ))}
    </ul>
  )
}