import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import styles from './Relatorio.module.css'
import { brl, mesLabel } from './format'

function compactBRL(value) {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000)     return `R$ ${(value / 1_000).toFixed(0)}k`
  return `R$ ${value}`
}

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.chartTooltip}>
      <div className={styles.chartTooltipLabel}>{mesLabel(label)} {label?.slice(0, 4)}</div>
      <div className={styles.chartTooltipValue}>{brl(payload[0].value)}</div>
    </div>
  )
}

export default function EvolucaoMensalChart({ data }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Evolução de Vendas</h2>
      <div className={styles.chartWrapper}>
        {data.length === 0 ? (
          <div className={styles.empty}>Sem dados no período</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid stroke="#23252a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="mes"
                tickFormatter={mesLabel}
                stroke="#62666d"
                tick={{ fill: '#8a8f98', fontSize: 12 }}
                axisLine={{ stroke: '#23252a' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={compactBRL}
                stroke="#62666d"
                tick={{ fill: '#8a8f98', fontSize: 12 }}
                axisLine={{ stroke: '#23252a' }}
                tickLine={false}
                width={64}
              />
              <Tooltip content={<TooltipContent />} cursor={{ stroke: '#34343a' }} />
              <Line
                type="monotone"
                dataKey="vendaLiquida"
                stroke="#5e6ad2"
                strokeWidth={2}
                dot={{ r: 3, fill: '#5e6ad2', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#828fff', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
