import Link from 'next/link'
import { AddCategoryForm } from '@/features/categories/AddCategoryForm'
import { CategoryList } from '@/features/categories/CategoryList'
import { mensagem } from '@/features/categories/messages'
import { listCategories } from '@/features/categories/queries'
import styles from '@/components/ui.module.css'

export const instant = false

const SECOES = [
  { kind: 'purchase', titulo: 'Categorias de compras' },
  { kind: 'income', titulo: 'Categorias de entradas' },
] as const

type Props = { searchParams: Promise<{ erro?: string; aviso?: string }> }

export default async function CategoriasPage({ searchParams }: Props) {
  const { erro, aviso } = await searchParams
  const categories = await listCategories()
  const msgErro = mensagem(erro)
  const msgAviso = mensagem(aviso)

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Categorias</h1>
          <Link href="/">Voltar</Link>
        </header>

        {msgErro && <p role="alert" className={styles.erro}>{msgErro}</p>}
        {msgAviso && <p role="status" className={styles.aviso}>{msgAviso}</p>}

        {SECOES.map(({ kind, titulo }) => (
          <section key={kind} className={styles.section}>
            <h2>{titulo}</h2>
            <AddCategoryForm kind={kind} />
            <CategoryList categories={categories.filter((c) => c.kind === kind)} />
          </section>
        ))}
      </div>
    </main>
  )
}