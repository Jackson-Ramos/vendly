import styles from './Relatorio.module.css'
import { brl, int, pct } from './format'

export default function KpiCards({ kpis }) {
  const cards = [
    { label: 'Venda Bruta',     value: brl(kpis?.vendaBruta) },
    { label: 'Venda Líquida',   value: brl(kpis?.vendaLiquida) },
    { label: 'Ticket Médio',    value: brl(kpis?.ticketMedio) },
    { label: 'Qtd. de Vendas',  value: int(kpis?.qtdVendas) },
    { label: '% Devolução',     value: pct(kpis?.percentualDevolucao) },
  ]

  return (
    <div className={styles.kpiGrid}>
      {cards.map(c => (
        <div key={c.label} className={styles.kpiCard}>
          <div className={styles.kpiLabel}>{c.label}</div>
          <div className={styles.kpiValue}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}
