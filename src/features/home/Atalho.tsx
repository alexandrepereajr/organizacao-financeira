import Link from 'next/link'
import styles from './home.module.css'

type Props = { href: string; titulo: string; descricao: string; destaque?: boolean }

// Cartão de atalho da tela inicial
export function Atalho({ href, titulo, descricao, destaque = false }: Props) {
  return (
    <Link href={href} className={destaque ? styles.atalhoDestaque : styles.atalho}>
      <span className={styles.atalhoTitulo}>{titulo}</span>
      <span className={styles.atalhoDescricao}>{descricao}</span>
    </Link>
  )
}
