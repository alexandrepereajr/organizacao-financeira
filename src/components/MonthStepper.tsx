import Link from 'next/link'
import { addMonths, formatMonth } from '@/features/purchases/calc'
import styles from './ui.module.css'

type Props = { basePath: string; mes: string; hoje: string }

export function MonthStepper({ basePath, mes, hoje }: Props) {
  const anterior = addMonths(mes, -1) ?? mes
  const proximo = addMonths(mes, 1) ?? mes

  return (
    <nav className={styles.stepper} aria-label="Navegação de mês">
      <Link href={`${basePath}?mes=${anterior}`}>← {formatMonth(anterior)}</Link>
      <strong className={styles.stepperAtual}>{formatMonth(mes)}</strong>
      <Link href={`${basePath}?mes=${proximo}`}>{formatMonth(proximo)} →</Link>
      {mes !== hoje && <Link href={`${basePath}?mes=${hoje}`}>Mês atual</Link>}
    </nav>
  )
}