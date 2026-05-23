const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
})

const intFormatter = new Intl.NumberFormat('pt-BR')

export function brl(value) {
  return brlFormatter.format(value ?? 0)
}

export function int(value) {
  return intFormatter.format(value ?? 0)
}

export function pct(value) {
  return `${(value ?? 0).toFixed(1)}%`
}

const MES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function mesLabel(yyyymm) {
  if (!yyyymm) return ''
  const [, m] = yyyymm.split('-')
  return MES_LABELS[Number(m) - 1] ?? yyyymm
}
