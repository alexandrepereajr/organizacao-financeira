import Link from 'next/link'
import { loadLedger } from '@/features/ledger/queries'
import type { LedgerData } from '@/features/ledger/types'
import { hojeEmSaoPaulo } from '@/features/purchases/calc'
import { montarBlocos } from '@/features/spreadsheet/aggregate'
import { formatMonthShort } from '@/features/spreadsheet/format'
import { GridTable } from '@/features/spreadsheet/GridTable'
import { MonthNav } from '@/features/spreadsheet/MonthNav'
import type { Modo } from '@/features/spreadsheet/types'
import styles from '@/features/spreadsheet/spreadsheet.module.css'
import { listAccounts } from '@/features/accounts/queries'

export const instant = false

const QUANTIDADE_MESES = 12
const PASSO = 6
const MES = /^\d{4}-(0[1-9]|1[0-2])$/

type Props = { searchParams: Promise<{ inicio?: string; modo?: string }> }

export default async function PlanilhaPage({ searchParams }: Props) {
  const { inicio: inicioParam, modo: modoParam } = await searchParams
  const hoje = hojeEmSaoPaulo().slice(0, 7)
  const inicio = inicioParam && MES.test(inicioParam) ? inicioParam : hoje
  const contas = await listAccounts()
  const compartilhada = contas?.find((conta) => conta.isActive)?.isShared ?? false
  // Conta compartilhada não tem "minha parte": as compras pertencem aos participantes
  const modo: Modo = compartilhada || modoParam === 'cheio' ? 'cheio' : 'minha'

  let dados: LedgerData | null = null
  try {
    dados = await loadLedger(inicio, QUANTIDADE_MESES)
  } catch (erro) {
    console.error('Falha ao carregar a planilha:', erro)
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Planilha</h1>
          <Link href="/">Voltar</Link>
        </header>

        {dados ? (
          <>
            <MonthNav
              inicio={inicio}
              fim={dados.months[dados.months.length - 1]}
              hoje={hoje}
              modo={modo}
              passo={PASSO}
              mostrarModos={!compartilhada}
            />
            {montarBlocos(dados, modo).map((bloco) => (
              <GridTable key={bloco.id} bloco={bloco} colunas={dados.months.map(formatMonthShort)} />
            ))}
          </>
        ) : (
          <p role="alert" className={styles.erro}>
            Não foi possível carregar a planilha. Confira se a migration 8 foi executada e tente de novo.
          </p>
        )}
      </div>
    </main>
  )
}