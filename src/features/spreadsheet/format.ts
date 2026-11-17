const NOMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function formatMonthShort(ym: string): string {
  const [ano, mes] = ym.split('-')
  return `${NOMES[Number(mes) - 1]}/${ano.slice(2)}`
}