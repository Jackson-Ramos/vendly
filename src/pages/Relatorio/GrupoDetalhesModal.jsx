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

// Formatação BR pra CSV: vírgula decimal, sem separador de milhar (Excel-pt-BR
// interpreta como número automaticamente).
function csvNum(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return ''
  return Number(value).toFixed(digits).replace('.', ',')
}

function csvCell(value) {
  if (value == null) return ''
  const s = String(value)
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function csvRow(cells) {
  return cells.map(csvCell).join(';')
}

function slugify(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function downloadCsv(filename, lines) {
  // BOM + CRLF: Excel-pt-BR abre direto como tabela com acentos corretos.
  const content = '﻿' + lines.join('\r\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function buildCsv(grupo, filters, selectedMonth, data) {
  const lines = []
  lines.push(csvRow(['Grupo', grupo.grupo]))
  lines.push(csvRow(['Código', grupo.codGrupo]))
  if (filters.filial)   lines.push(csvRow(['Filial', filters.filial]))
  if (filters.vendedor) lines.push(csvRow(['Vendedor', filters.vendedor]))
  if (filters.inicio || filters.fim) {
    lines.push(csvRow(['Período', `${filters.inicio || '...'} a ${filters.fim || '...'}`]))
  }
  if (selectedMonth) lines.push(csvRow(['Mês', `${mesLabel(selectedMonth)}/${selectedMonth.slice(0, 4)}`]))
  lines.push('')

  // Cada seção vira um bloco de colunas; juntamos lado a lado com uma coluna
  // vazia de separação. Linhas curtas são preenchidas com células em branco
  // pra manter o alinhamento das colunas das outras seções.
  const sections = [
    {
      title: 'Evolução no ano',
      headers: ['Mês', 'Venda líquida (R$)'],
      rows: (data.evolucao ?? []).map(r => [r.mes, csvNum(r.vendaLiquida)]),
    },
    {
      title: 'Cores mais vendidas',
      headers: ['Cor', 'Qtd', 'Valor (R$)'],
      rows: (data.cores ?? []).map(r => [r.cor, csvNum(r.qtd, 0), csvNum(r.valor)]),
    },
    {
      title: 'Tamanhos mais vendidos',
      headers: ['Tamanho', 'Qtd', 'Valor (R$)'],
      rows: (data.tamanhos ?? []).map(r => [r.tamanho, csvNum(r.qtd, 0), csvNum(r.valor)]),
    },
    {
      title: 'Produtos mais vendidos',
      headers: ['Produto', 'Qtd', 'Valor (R$)'],
      rows: (data.produtos ?? []).map(r => [r.produto, csvNum(r.qtd, 0), csvNum(r.valor)]),
    },
  ]

  const maxRows = Math.max(0, ...sections.map(s => s.rows.length))

  function joinAcross(cellsBySection) {
    const out = []
    sections.forEach((s, i) => {
      const width = s.headers.length
      const cells = cellsBySection[i] ?? []
      for (let k = 0; k < width; k++) out.push(cells[k] ?? '')
      if (i < sections.length - 1) out.push('')
    })
    return csvRow(out)
  }

  lines.push(joinAcross(sections.map(s => [s.title])))
  lines.push(joinAcross(sections.map(s => s.headers)))
  for (let r = 0; r < maxRows; r++) {
    lines.push(joinAcross(sections.map(s => s.rows[r] ?? [])))
  }

  return lines
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
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
  const [selectedMonth, setSelectedMonth] = useState(null)

  // Reseta o mês selecionado quando filtros ou grupo mudam — o mês antigo pode
  // não existir mais no novo recorte.
  const resetKey = `${grupo.codGrupo}|${filters.filial}|${filters.vendedor}|${filters.inicio}|${filters.fim}`
  const [prevResetKey, setPrevResetKey] = useState(resetKey)

  const fetchKey = `${grupo.codGrupo}|${filters.filial}|${filters.vendedor}|${filters.inicio}|${filters.fim}|${selectedMonth}`
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey)

  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    setSelectedMonth(null)
    const newFetchKey = `${grupo.codGrupo}|${filters.filial}|${filters.vendedor}|${filters.inicio}|${filters.fim}|null`
    setPrevFetchKey(newFetchKey)
    setLoading(true)
    setError(null)
  } else if (fetchKey !== prevFetchKey) {
    setPrevFetchKey(fetchKey)
    setLoading(true)
    setError(null)
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const ctrl = new AbortController()
    const extra = { codGrupo: grupo.codGrupo }
    if (selectedMonth) extra.mes = selectedMonth
    fetch(
      `/api/dashboard/grupo-detalhes${buildQuery(filters, extra)}`,
      { signal: ctrl.signal },
    )
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err); setLoading(false)
      })
    return () => ctrl.abort()
  }, [grupo.codGrupo, filters.filial, filters.vendedor, filters.inicio, filters.fim, selectedMonth])

  function handleChartClick(e) {
    if (!e?.activeLabel) return
    setSelectedMonth(prev => prev === e.activeLabel ? null : e.activeLabel)
  }

  const renderDot = (props) => {
    const { cx, cy, payload } = props
    const isSelected = payload.mes === selectedMonth
    return (
      <circle
        cx={cx}
        cy={cy}
        r={isSelected ? 5 : 3}
        fill={isSelected ? '#828fff' : '#5e6ad2'}
        stroke={isSelected ? '#f7f8f8' : 'none'}
        strokeWidth={isSelected ? 2 : 0}
      />
    )
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div className={styles.modalContent} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className={styles.modalHeader}>
          <div className={styles.modalTitleGroup}>
            <span className={styles.modalEyebrow}>Grupo</span>
            <h2 className={styles.modalTitle}>{grupo.grupo}</h2>
          </div>
          <div className={styles.modalHeaderActions}>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={() => {
                const lines = buildCsv(grupo, filters, selectedMonth, data)
                const slug = slugify(grupo.grupo) || `cod-${grupo.codGrupo}`
                downloadCsv(`grupo-${slug}.csv`, lines)
              }}
              disabled={loading || !!error}
              aria-label="Exportar para Excel"
              title="Exportar para Excel"
            >
              <DownloadIcon />
              <span>Exportar</span>
            </button>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={onClose}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        </header>

        <div className={styles.modalBody}>
          {error && <div className={styles.errorBanner}>Erro ao carregar: {error.message}</div>}

          <section className={styles.modalChartSection}>
            <div className={styles.modalChartHeader}>
              <h3 className={styles.miniTableTitle}>Evolução no ano</h3>
              {selectedMonth && (
                <button
                  type="button"
                  className={styles.monthChip}
                  onClick={() => setSelectedMonth(null)}
                  title="Limpar filtro de mês"
                >
                  Mês: {mesLabel(selectedMonth)}/{selectedMonth.slice(0, 4)}
                  <span className={styles.monthChipX} aria-hidden="true">×</span>
                </button>
              )}
            </div>
            <div className={styles.modalChartWrapper}>
              {data.evolucao.length === 0 ? (
                <div className={styles.empty}>{loading ? 'Carregando…' : 'Sem dados no período'}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.evolucao}
                    margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                    onClick={handleChartClick}
                    style={{ cursor: 'pointer' }}
                  >
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
                      dot={renderDot}
                      activeDot={{ r: 6, fill: '#828fff', strokeWidth: 0 }}
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
