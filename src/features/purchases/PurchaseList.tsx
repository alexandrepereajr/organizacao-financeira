import Link from 'next/link'
import { deletePurchase } from './actions'
import { formatCents, formatMonth } from './calc'
import { ConfirmSubmit } from './ConfirmSubmit'
import type { MonthPurchase } from './queries'
import styles from '@/components/ui.module.css'

type Props = {
  compras: MonthPurchase[]
  mes: string
  nomesCartoes: Map<string, string>
  nomesCategorias: Map<string, string>
}

function descreverCobranca(c: MonthPurchase): string {
  if (c.isRecurring) {
    return `Recorrente desde ${formatMonth(c.startMonth)}${c.endMonth ? ` até ${formatMonth(c.endMonth)}` : ''}`
  }
  if (c.installmentsCount > 1) {
    return `Parcela ${c.installment}/${c.installmentsCount} de ${formatCents(c.totalCents)}`
  }
  return 'À vista'
}

export function PurchaseList({ compras, mes, nomesCartoes, nomesCategorias }: Props) {
  if (compras.length === 0) {
    return <p className={styles.vazio}>Nenhuma compra cobrada neste mês.</p>
  }

  const total = compras.reduce((soma, c) => soma + c.amountCents, 0)

  return (
    <>
      <ul className={styles.lista}>
        {compras.map((c) => {
          // Recorrente que começou antes: excluir só encerra daqui para frente
          const emSerie = c.isRecurring && c.startMonth < mes
          const detalhes = [
            c.cardId ? (nomesCartoes.get(c.cardId) ?? 'Cartão') : 'Sem cartão',
            c.categoryId ? nomesCategorias.get(c.categoryId) : undefined,
            descreverCobranca(c),
            c.isPending ? 'Incompleta' : undefined,
          ].filter(Boolean)
          const confirmacao = emSerie
            ? `Encerrar "${c.name}" a partir de ${formatMonth(mes)}? Os meses anteriores continuam.`
            : c.installmentsCount > 1
              ? `Excluir "${c.name}" e todas as ${c.installmentsCount} parcelas? Não dá para desfazer.`
              : `Excluir "${c.name}"? Não dá para desfazer.`

          return (
            <li key={c.id} className={styles.item}>
              <div className={styles.linha}>
                <span className={styles.nome}>{c.name}</span>
                <span>{formatCents(c.amountCents)}</span>
              </div>
              <span className={styles.detalhe}>{detalhes.join(' · ')}</span>
              <div className={styles.linha}>
                <Link href={`/compras/${c.id}/editar?mes=${mes}`}>Editar</Link>
                <form action={deletePurchase}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="mes_lista" value={mes} />
                  <ConfirmSubmit className={styles.remover} mensagem={confirmacao}>
                    {emSerie ? 'Encerrar daqui para frente' : 'Excluir'}
                  </ConfirmSubmit>
                </form>
              </div>
            </li>
          )
        })}
      </ul>
      <p className={styles.total}>Total do mês (valor cheio): {formatCents(total)}</p>
    </>
  )
}
