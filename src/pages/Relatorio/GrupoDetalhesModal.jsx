import { useEffect, useState } from 'react'
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
import { brl, int, mesLabel } from './format'

function compactBRL(value) {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000)     return `R$ ${(value / 1_000).toFixed(0)}k`
  return `R$ ${value}`
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.chartTooltip}>
      <div className={styles.chartTooltipLabel}>{mesLabel(label)} {label?.slice(0, 4)}</div>
      <div className={styles.chartTooltipValue}>{brl(payload[0].value)}</div>
    </div>
  )
}

function buildQuery(filters, extra) {
  const params = new URLSearchParams()
  if (filters.filial)   params.set('filial',   filters.filial)
  if (filters.vendedor) params.set('vendedor', filters.vendedor)
  if (filters.inicio)   params.set('inicio',   filters.inicio)
  if (filters.fim)      params.set('fim',      filters.fim)
  for (const [k, v] of Object.entries(extra)) params.set(k, v)
  return `?${params.toString()}`
}

function MiniTable({ title, rows, labelKey, labelHeader }) {
  return (
    <div className={styles.miniTableWrap}>
      <h3 className={styles.miniTableTitle}>{title}</h3>
      <div className={styles.miniTableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thLeft}>{labelHeader}</th>
              <th className={styles.thRight}>Qtd</th>
              <th className={styles.thRight}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={3} className={styles.empty}>Sem dados</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i}>
                <td className={styles.miniTableLabel}>{r[labelKey]}</td>
                <td className={styles.tdRight}>{int(r.qtd)}</td>
                <td className={styles.tdRight}>{brl(r.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function GrupoDetalhesModal({ grupo, filters, onClose }) {
  const [data, setData] = useState({ evolucao: [], cores: [], tamanhos: [], produtos: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    fetch(
      `/api/dashboard/grupo-detalhes${buildQuery(filters, { codGrupo: grupo.codGrupo })}`,
      { signal: ctrl.signal },
    )
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err); setLoading(false)
      })
    return () => ctrl.abort()
  }, [grupo.codGrupo, filters.filial, filters.vendedor, filters.inicio, filters.fim])

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div className={styles.modalContent} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className={styles.modalHeader}>
          <div className={styles.modalTitleGroup}>
            <span className={styles.modalEyebrow}>Grupo</span>
            <h2 className={styles.modalTitle}>{grupo.grupo}</h2>
          </div>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className={styles.modalBody}>
          {error && <div className={styles.errorBanner}>Erro ao carregar: {error.message}</div>}

          <section className={styles.modalChartSection}>
            <h3 className={styles.miniTableTitle}>Evolução no ano</h3>
            <div className={styles.modalChartWrapper}>
              {loading ? (
                <div className={styles.empty}>Carregando…</div>
              ) : data.evolucao.length === 0 ? (
                <div className={styles.empty}>Sem dados no período</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.evolucao} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
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
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#34343a' }} />
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

          <div className={styles.modalTablesGrid}>
            <MiniTable title="Cores mais vendidas"    rows={data.cores}    labelKey="cor"      labelHeader="Cor" />
            <MiniTable title="Tamanhos mais vendidos" rows={data.tamanhos} labelKey="tamanho"  labelHeader="Tamanho" />
            <MiniTable title="Produtos mais vendidos" rows={data.produtos} labelKey="produto"  labelHeader="Produto" />
          </div>
        </div>
      </div>
    </div>
  )
}
