import type { LedgerData } from '@/features/ledger/types'
import { formatCents } from '@/features/purchases/calc'
import type { Bloco, Celula, Linha, Modo } from './types'

function soma(valores: (number | null)[]): (number | null)[] {
  return valores
}

function diferenca(a: (number | null)[], b: (number | null)[]): (number | null)[] {
  return a.map((valor, i) => (valor === null && b[i] === null ? null : (valor ?? 0) - (b[i] ?? 0)))
}

export function montarBlocos(dados: LedgerData, modo: Modo): Bloco[] {
  const n = dados.months.length
  const coluna = new Map(dados.months.map((m, i) => [m, i]))
  const vazios = () => Array<number | null>(n).fill(null)
  const cartoes = new Map(dados.cards.map((c) => [c.id, c]))

  // Bloco 1: compras
  const celulasPorCompra = new Map<string, Celula[]>()
  const totalCompras = vazios()

  for (const linha of dados.installments) {
    const compra = dados.purchases[linha.purchaseId]
    const col = coluna.get(linha.month)
    if (!compra || col === undefined) continue
    if (modo === 'cheio' && !compra.isOwner && !compra.isLinked) continue

    const cents = modo === 'minha' ? linha.myCents : linha.amountCents
    if (cents <= 0) continue

    const celulas = celulasPorCompra.get(compra.id) ?? Array<Celula>(n).fill(null)
    celulas[col] = {
      cents,
      nota: compra.installmentsCount > 1 ? `${linha.number}/${compra.installmentsCount}` : undefined,
    }
    celulasPorCompra.set(compra.id, celulas)
    totalCompras[col] = (totalCompras[col] ?? 0) + cents
  }

  const linhasCompras: Linha[] = [...celulasPorCompra.keys()]
    .map((id) => dados.purchases[id])
    .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate) || a.description.localeCompare(b.description))
    .map((compra) => ({
      chave: compra.id,
      rotulo: compra.description,
      sub:
        (compra.isOwner
          ? (compra.cardId ? cartoes.get(compra.cardId)?.name : undefined) ?? 'Sem cartão'
          : `de ${compra.ownerName}`) +
        (compra.isRecurring ? ' · recorrente' : '') +
        (compra.isPending ? ' · incompleta' : ''),
      celulas: celulasPorCompra.get(compra.id) ?? [],
    }))

  const blocoCompras: Bloco = {
    id: 'compras',
    titulo: modo === 'minha' ? 'Compras (minha parte)' : 'Compras (valor cheio)',
    vazio: 'Nenhuma compra neste período.',
    linhas: linhasCompras,
    rodape: [{ chave: 'total', rotulo: 'Total do mês', valores: soma(totalCompras) }],
  }

  // Bloco 2: cartões (sempre valor cheio, porque a fatura cobra tudo)
  const calculado = new Map<string, number[]>()
  for (const linha of dados.installments) {
    const compra = dados.purchases[linha.purchaseId]
    const col = coluna.get(linha.month)
    if (!compra || col === undefined || !compra.cardId) continue
    if (!cartoes.has(compra.cardId)) continue

    const valores = calculado.get(compra.cardId) ?? Array<number>(n).fill(0)
    valores[col] += linha.amountCents
    calculado.set(compra.cardId, valores)
  }

  const faturas = new Map(dados.invoices.map((f) => [`${f.cardId}|${f.month}`, f.amountCents]))
  const totalCalculado = vazios()
  const totalConsiderado = vazios()
  const linhasCartoes: Linha[] = []

  for (const cartao of dados.cards) {
    const valores = calculado.get(cartao.id)
    const temFatura = dados.months.some((m) => faturas.has(`${cartao.id}|${m}`))
    if (!valores && !temFatura && (!cartao.isActive || !cartao.isOwn)) continue

    const celulas: Celula[] = dados.months.map((mes, col) => {
      const calc = valores?.[col] ?? 0
      const fatura = faturas.get(`${cartao.id}|${mes}`)
      if (calc === 0 && fatura === undefined) return null

      totalCalculado[col] = (totalCalculado[col] ?? 0) + calc
      totalConsiderado[col] = (totalConsiderado[col] ?? 0) + (fatura ?? calc)

      return {
        cents: calc,
        nota: fatura !== undefined ? `fatura ${formatCents(fatura)}` : undefined,
        alerta: fatura !== undefined && fatura !== calc,
      }
    })

    linhasCartoes.push({
      chave: cartao.id,
      rotulo: cartao.name,
      sub: !cartao.isOwn ? `de ${cartao.ownerName}` : cartao.isActive ? undefined : 'Inativo',
      celulas,
    })
  }

  const blocoCartoes: Bloco = {
    id: 'cartoes',
    titulo: 'Cartões (valor cheio)',
    vazio: 'Nenhum cartão cadastrado.',
    linhas: linhasCartoes,
    rodape: [
      { chave: 'calculado', rotulo: 'Total calculado', valores: totalCalculado },
      { chave: 'considerado', rotulo: 'Total (fatura, quando houver)', valores: totalConsiderado },
    ],
  }

  // Bloco 3: entradas
  const porDescricao = new Map<string, number[]>()
  const totalEntradas = vazios()
  for (const entrada of dados.incomes) {
    const col = coluna.get(entrada.month)
    if (col === undefined) continue
    const valores = porDescricao.get(entrada.description) ?? Array<number>(n).fill(0)
    valores[col] += entrada.amountCents
    porDescricao.set(entrada.description, valores)
    totalEntradas[col] = (totalEntradas[col] ?? 0) + entrada.amountCents
  }

  const blocoEntradas: Bloco = {
    id: 'entradas',
    titulo: 'Entradas',
    vazio: 'Nenhuma entrada neste período.',
    linhas: [...porDescricao.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([descricao, valores]) => ({
        chave: descricao,
        rotulo: descricao,
        celulas: valores.map((cents): Celula => (cents === 0 ? null : { cents })),
      })),
    rodape: [{ chave: 'total', rotulo: 'Total de entradas', valores: totalEntradas }],
  }

  // Bloco 4: resultado
  const blocoResultado: Bloco = {
    id: 'resultado',
    titulo: 'Resultado do mês',
    vazio: '',
    linhas: [],
    rodape: [
      {
        chave: 'menos-compras',
        rotulo: modo === 'minha' ? 'Entradas menos compras (minha parte)' : 'Entradas menos compras (valor cheio)',
        valores: diferenca(totalEntradas, totalCompras),
        destacarNegativo: true,
      },
      {
        chave: 'menos-cartoes',
        rotulo: 'Entradas menos cartões',
        valores: diferenca(totalEntradas, totalConsiderado),
        destacarNegativo: true,
      },
    ],
  }

  return [blocoCompras, blocoCartoes, blocoEntradas, blocoResultado]
}