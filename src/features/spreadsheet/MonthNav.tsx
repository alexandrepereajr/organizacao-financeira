import Link from 'next/link'
import { addMonths, formatMonth } from '@/features/purchases/calc'
import type { Modo } from './types'
import styles from './spreadsheet.module.css'

type Props = {
  inicio: string
  fim: string
  hoje: string
  modo: Modo
  passo: number
  mostrarModos: boolean
}

export function MonthNav({ inicio, fim, hoje, modo, passo, mostrarModos }: Props) {
  const href = (mes: string, m: Modo) => `/visoes/planilha?inicio=${mes}&modo=${m}`
  const anterior = addMonths(inicio, -passo) ?? inicio
  const proximo = addMonths(inicio, passo) ?? inicio

  return (
    <nav className={styles.nav} aria-label="Navegação de período">
      <Link href={href(anterior, modo)}>← Anteriores</Link>
      <Link href={href(hoje, modo)}>Mês atual</Link>
      <Link href={href(proximo, modo)}>Próximos →</Link>
      <span className={styles.periodo}>
        {formatMonth(inicio)} a {formatMonth(fim)}
      </span>
      {mostrarModos && (
        <div className={styles.modos}>
          <Link className={modo === 'minha' ? styles.modoAtivo : styles.modo} href={href(inicio, 'minha')}>
            Minha parte
          </Link>
          <Link className={modo === 'cheio' ? styles.modoAtivo : styles.modo} href={href(inicio, 'cheio')}>
            Valor cheio
          </Link>
        </div>
      )}
    </nav>
  )
}