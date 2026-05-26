import baseStyles from '../Relatorio/Relatorio.module.css'
import styles from './Fornecedores.module.css'
import { brl, int } from '../Relatorio/format'

// KPIs agregados a partir do ranking carregado — todos derivados pra evitar
// uma rota extra. Foco em sinais de alerta úteis pra decisão de compra.
function aggregate(fornecedores) {
  const COBERTURA_ALTA = 6 // > 6 meses de cobertura → estoque demais
  const PCT_DEV_ALTA   = 10 // % devolução acima disso → qualidade

  let totalCompra = 0
  let totalVenda  = 0
  let totalDev    = 0
  let ativos      = 0
  let comRuptura  = 0
  let estoqueAlto = 0
  let devAlta     = 0

  for (const f of fornecedores) {
    totalCompra += f.valorComprado
    totalVenda  += f.valorVendido
    totalDev    += f.valorDevolvido
    if (f.valorVendido > 0 || f.valorComprado > 0) ativos++
    if (f.skusRuptura > 0) comRuptura++
    if (f.coberturaMeses !== null && f.coberturaMeses > COBERTURA_ALTA) estoqueAlto++
    if (f.pctDevolucao > PCT_DEV_ALTA) devAlta++
  }

  return { totalCompra, totalVenda, totalDev, ativos, comRuptura, estoqueAlto, devAlta }
}

export default function FornecedoresKpiCards({ fornecedores, activeKpi, onToggleKpi }) {
  const k = aggregate(fornecedores)

  const cards = [
    { label: 'Fornecedores ativos',     value: int(k.ativos) },
    { label: 'Total comprado',          value: brl(k.totalCompra) },
    { label: 'Total vendido',           value: brl(k.totalVenda) },
    { label: 'Com SKUs em ruptura',     value: int(k.comRuptura),  warn: k.comRuptura > 0,  kpiKey: 'ruptura' },
    { label: 'Cobertura > 6 meses',     value: int(k.estoqueAlto), warn: k.estoqueAlto > 0, kpiKey: 'cobertura' },
    { label: '% devolução > 10%',       value: int(k.devAlta),     warn: k.devAlta > 0,     kpiKey: 'devolucao' },
  ]

  return (
    <div className={styles.kpiGrid}>
      {cards.map(c => {
        const clickable = Boolean(c.kpiKey && onToggleKpi)
        const isActive = clickable && activeKpi === c.kpiKey
        const className = [
          baseStyles.kpiCard,
          clickable ? styles.kpiCardClickable : '',
          isActive ? styles.kpiCardActive : '',
        ].filter(Boolean).join(' ')

        const content = (
          <>
            <div className={baseStyles.kpiLabel}>{c.label}</div>
            <div className={baseStyles.kpiValue} style={c.warn ? { color: '#f0a0a0' } : undefined}>
              {c.value}
            </div>
          </>
        )

        if (!clickable) {
          return <div key={c.label} className={className}>{content}</div>
        }

        return (
          <button
            key={c.label}
            type="button"
            className={className}
            onClick={() => onToggleKpi(c.kpiKey)}
            aria-pressed={isActive}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
