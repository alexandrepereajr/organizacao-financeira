export const LIMITE_CENTAVOS = 99_999_999_999

export function toCents(texto: string): number | null {
  if (!texto.trim()) return null
  const valor = Number(texto)
  if (!Number.isFinite(valor) || valor <= 0) return null
  return Math.round(valor * 100)
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export function formatPercent(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(valor)
}

// ym no formato "AAAA-MM"
export function addMonths(ym: string, n: number): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym)
  if (!m) return null
  const total = Number(m[1]) * 12 + (Number(m[2]) - 1) + n
  const year = Math.floor(total / 12)
  const month = (total % 12) + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

export function formatMonth(ym: string | null): string {
  if (!ym) return ''
  const [year, month] = ym.split('-')
  return `${month}/${year}`
}

export function dataValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false
  const data = new Date(`${texto}T00:00:00Z`)
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === texto
}

// Só deve ser chamada no servidor, depois de ler dados da requisição
export function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

/**
 * Percentuais da divisão. manuals: número digitado, ou null para automático.
 * Quem é automático divide igualmente o que sobrou depois dos manuais.
 */
export function resolvePercents(manuals: (number | null)[]): number[] {
  const travado = manuals.reduce<number>((acc, m) => acc + (m ?? 0), 0)
  const automaticos = manuals.filter((m) => m === null).length
  const cada = automaticos > 0 ? Math.max(100 - travado, 0) / automaticos : 0
  return manuals.map((m) => (m === null ? cada : m))
}

/** Devolve a mensagem de erro da divisão, ou null se estiver válida. */
export function validateShares(isMe: boolean[], percents: number[]): string | null {
  if (percents.some((p) => !Number.isFinite(p) || p < 0 || p > 100)) {
    return 'Informe percentuais entre 0% e 100%.'
  }
  const soma = percents.reduce((a, b) => a + b, 0)
  if (Math.abs(soma - 100) > 0.005) {
    return `A divisão soma ${formatPercent(soma)}%. O total precisa ser 100%.`
  }
  if (percents.some((p, i) => !isMe[i] && p <= 0)) {
    return 'Cada pessoa adicionada precisa ter mais de 0%. Remova quem não participa.'
  }
  return null
}

/** Reparte totalCents proporcionalmente aos pesos, sem sobra nem falta de centavos. */
export function allocateCents(totalCents: number, weights: number[]): number[] {
  const soma = weights.reduce((a, b) => a + b, 0)
  if (soma <= 0) return weights.map(() => 0)

  const exatos = weights.map((w) => (totalCents * w) / soma)
  const base = exatos.map((v) => Math.floor(v))
  let resto = totalCents - base.reduce((a, b) => a + b, 0)

  const ordem = exatos
    .map((v, i) => ({ i, fracao: v - Math.floor(v) }))
    .sort((a, b) => b.fracao - a.fracao)

  for (const { i } of ordem) {
    if (resto <= 0) break
    base[i] += 1
    resto -= 1
  }
  while (resto < 0) {
    const maior = base.indexOf(Math.max(...base))
    base[maior] -= 1
    resto += 1
  }
  return base
}