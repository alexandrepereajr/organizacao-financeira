import type { Category } from '@/features/categories/queries'
import { formatCents, formatMonth } from '@/features/purchases/calc'
import { deleteIncome, updateIncome } from './actions'
import { DestinationsEditor } from './DestinationsEditor'
import type { Income } from './queries'
import type { Destino, OpcaoDestino } from './types'
import styles from '@/components/ui.module.css'

type Props = {
  incomes: Income[]
  mes: string
  categories: Category[]
  contas: OpcaoDestino[]
  contatos: OpcaoDestino[]
  permitirDestinos: boolean
}

export function IncomeList({ incomes, mes, categories, contas, contatos, permitirDestinos }: Props) {
  if (incomes.length === 0) {
    return <p className={styles.vazio}>Nenhuma entrada neste mês.</p>
  }

  const total = incomes.reduce((soma, item) => soma + item.amountCents, 0)
  const nomes = new Map(categories.map((c) => [c.id, c.name]))
  const nomeContas = new Map(contas.map((c) => [c.id, c.name]))
  const nomeContatos = new Map(contatos.map((c) => [c.id, c.name]))

  function descreverDestino(destino: Destino): string {
    const quem =
      destino.recipient === 'account'
        ? (nomeContas.get(destino.id) ?? 'conta compartilhada')
        : (nomeContatos.get(destino.id) ?? 'pessoa')
    const valor =
      destino.kind === 'percent'
        ? `${destino.value}%`
        : formatCents(Math.round(destino.value * 100))
    return `${valor} para ${quem}`
  }

  return (
    <>
      <ul className={styles.lista}>
        {incomes.map((income) => {
          const emSerie = income.isRecurring && income.startMonth < mes
          const categoria = income.categoryId ? nomes.get(income.categoryId) : undefined
          const opcoes = categories.filter((c) => c.isActive || c.id === income.categoryId)

          return (
            <li key={income.id} className={styles.item}>
              <div className={styles.linha}>
                <span className={styles.nome}>{income.description}</span>
                <span>{formatCents(income.amountCents)}</span>
                <form action={deleteIncome}>
                  <input type="hidden" name="id" value={income.id} />
                  <input type="hidden" name="mes" value={mes} />
                  <button className={styles.remover} type="submit">
                    {emSerie ? 'Encerrar daqui para frente' : 'Remover'}
                  </button>
                </form>
              </div>

              {(income.isRecurring || categoria) && (
                <span className={styles.detalhe}>
                  {categoria}
                  {categoria && income.isRecurring ? ' · ' : ''}
                  {income.isRecurring &&
                    `Recorrente desde ${formatMonth(income.startMonth)}${
                      income.endMonth ? ` até ${formatMonth(income.endMonth)}` : ''
                    }`}
                </span>
              )}

              {income.destinos.length > 0 && (
                <span className={styles.detalhe}>
                  Destinado: {income.destinos.map(descreverDestino).join('; ')}
                </span>
              )}

              <details className={styles.editar}>
                <summary>Editar</summary>
                <form action={updateIncome} className={styles.form}>
                  <input type="hidden" name="id" value={income.id} />
                  <input type="hidden" name="mes" value={mes} />
                  {emSerie && (
                    <p className={styles.hint}>
                      A alteração vale deste mês em diante; os meses anteriores continuam como estavam.
                    </p>
                  )}
                  <div className={styles.campos}>
                    <label className={styles.label}>
                      Descrição
                      <input
                        className={styles.input}
                        type="text"
                        name="descricao"
                        defaultValue={income.description}
                        minLength={2}
                        maxLength={60}
                        required
                      />
                    </label>
                    <label className={styles.label}>
                      Valor (R$)
                      <input
                        className={styles.input}
                        type="number"
                        name="valor"
                        defaultValue={(income.amountCents / 100).toFixed(2)}
                        min={0.01}
                        step="0.01"
                        required
                      />
                    </label>
                  </div>
                  <label className={styles.label}>
                    Categoria
                    <select className={styles.input} name="categoria" defaultValue={income.categoryId ?? ''}>
                      <option value="">Sem categoria</option>
                      {opcoes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                  {permitirDestinos && (
                    <DestinationsEditor contas={contas} contatos={contatos} inicial={income.destinos} />
                  )}
                  <button className={styles.button} type="submit">Salvar</button>
                </form>
              </details>
            </li>
          )
        })}
      </ul>
      <p className={styles.total}>Total do mês: {formatCents(total)}</p>
    </>
  )
}