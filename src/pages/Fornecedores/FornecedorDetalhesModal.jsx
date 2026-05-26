import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import baseStyles from '../Relatorio/Relatorio.module.css'
import styles from './Fornecedores.module.css'
import { brl, int, mesLabel } from '../Relatorio/format'

function compactBRL(value) {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000)     return `R$ ${(value / 1_000).toFixed(0)}k`
  return `R$ ${value}`
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={baseStyles.chartTooltip}>
      <div className={baseStyles.chartTooltipLabel}>{mesLabel(label)} {label?.slice(0, 4)}</div>
      {payload.map(p => (
        <div key={p.dataKey} className={baseStyles.chartTooltipValue} style={{ color: p.color }}>
          {p.name}: {brl(p.value)}
        </div>
      ))}
    </div>
  )
}

function buildQuery(filters) {
  const params = new URLSearchParams()
  if (filters.filial) params.set('filial', filters.filial)
  if (filters.inicio) params.set('inicio', filters.inicio)
  if (filters.fim)    params.set('fim',    filters.fim)
  const q = params.toString()
  return q ? `?${q}` : ''
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

function buildCsv(fornecedor, filters, data) {
  const lines = []
  lines.push(csvRow(['Fornecedor', fornecedor.fornecedor]))
  lines.push(csvRow(['Código', fornecedor.codFornec]))
  if (filters.filial) lines.push(csvRow(['Filial', filters.filial]))
  if (filters.inicio || filters.fim) {
    lines.push(csvRow(['Período', `${filters.inicio || '...'} a ${filters.fim || '...'}`]))
  }
  lines.push('')

  // Cada seção vira um bloco de colunas; juntamos lado a lado com uma coluna
  // vazia de separação. Linhas curtas são preenchidas com células em branco
  // pra manter o alinhamento das colunas das outras seções.
  const sections = [
    {
      title: 'Evolução mensal',
      headers: ['Mês', 'Comprado (R$)', 'Vendido (R$)'],
      rows: (data.evolucao ?? []).map(r => [r.mes, csvNum(r.valorComprado), csvNum(r.valorVendido)]),
    },
    {
      title: 'Top giro no período',
      headers: ['Código', 'Produto', 'Estoque', 'Qtd. vendida'],
      rows: (data.topGiro ?? []).map(r => [r.codProd, r.produto, csvNum(r.estoqueVirtual, 0), csvNum(r.qtdVendidaPer, 0)]),
    },
    {
      title: 'SKUs em ruptura',
      headers: ['Código', 'Produto', 'Estoque', 'Qtd. vendida'],
      rows: (data.ruptura ?? []).map(r => [r.codProd, r.produto, csvNum(r.estoqueVirtual, 0), csvNum(r.qtdVendidaPer, 0)]),
    },
    {
      title: 'SKUs parados',
      headers: ['Código', 'Produto', 'Estoque', 'Qtd. comprada'],
      rows: (data.parados ?? []).map(r => [r.codProd, r.produto, csvNum(r.estoqueVirtual, 0), csvNum(r.qtdComprada, 0)]),
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

function SkuMiniTable({ title, rows, emptyMsg, valueLabel, valueKey, format }) {
  return (
    <div className={baseStyles.miniTableWrap}>
      <h3 className={baseStyles.miniTableTitle}>{title}</h3>
      <div className={baseStyles.miniTableScroll}>
        <table className={baseStyles.table}>
          <thead>
            <tr>
              <th className={baseStyles.thLeft}>Produto</th>
              <th className={baseStyles.thRight}>Estoque</th>
              <th className={baseStyles.thRight}>{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={3} className={baseStyles.empty}>{emptyMsg}</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.codProd}>
                <td className={baseStyles.miniTableLabel}>{r.produto}</td>
                <td className={baseStyles.tdRight}>{int(r.estoqueVirtual)}</td>
                <td className={baseStyles.tdRight}>{format(r[valueKey])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function FornecedorDetalhesModal({ fornecedor, filters, onClose }) {
  const [data, setData] = useState({ evolucao: [], topGiro: [], parados: [], ruptura: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchKey = `${fornecedor.codFornec}|${filters.filial}|${filters.inicio}|${filters.fim}`
  const [prevFetchKey, setPrevFetchKey] = useState(fetchKey)
  if (fetchKey !== prevFetchKey) {
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
    fetch(
      `/api/fornecedores/${fornecedor.codFornec}/detalhes${buildQuery(filters)}`,
      { signal: ctrl.signal },
    )
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err); setLoading(false)
      })
    return () => ctrl.abort()
  }, [fornecedor.codFornec, filters.filial, filters.inicio, filters.fim])

  return (
    <div className={baseStyles.modalOverlay} onClick={onClose} role="presentation">
      <div className={baseStyles.modalContent} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className={baseStyles.modalHeader}>
          <div className={baseStyles.modalTitleGroup}>
            <span className={baseStyles.modalEyebrow}>Fornecedor</span>
            <h2 className={baseStyles.modalTitle}>{fornecedor.fornecedor}</h2>
          </div>
          <div className={styles.modalHeaderActions}>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={() => {
                const lines = buildCsv(fornecedor, filters, data)
                const slug = slugify(fornecedor.fornecedor) || `cod-${fornecedor.codFornec}`
                downloadCsv(`fornecedor-${slug}.csv`, lines)
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
              className={baseStyles.modalCloseBtn}
              onClick={onClose}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        </header>

        <div className={baseStyles.modalBody}>
          {error && <div className={baseStyles.errorBanner}>Erro ao carregar: {error.message}</div>}

          <section className={baseStyles.modalChartSection}>
            <div className={baseStyles.modalChartHeader}>
              <h3 className={baseStyles.miniTableTitle}>Compras vs. Vendas no período</h3>
            </div>
            <div className={baseStyles.modalChartWrapper}>
              {data.evolucao.length === 0 ? (
                <div className={baseStyles.empty}>{loading ? 'Carregando…' : 'Sem dados no período'}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.evolucao} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
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
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(94,106,210,0.08)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#8a8f98' }} />
                    <Bar  dataKey="valorComprado" name="Comprado" fill="#3a3d72" radius={[2, 2, 0, 0]} />
                    <Line type="monotone" dataKey="valorVendido" name="Vendido" stroke="#5e6ad2" strokeWidth={2} dot={{ r: 3, fill: '#5e6ad2' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <div className={baseStyles.modalTablesGrid}>
            <SkuMiniTable
              title="Top giro no período"
              rows={data.topGiro}
              emptyMsg="Sem vendas no período"
              valueLabel="Vendido"
              valueKey="qtdVendidaPer"
              format={int}
            />
            <SkuMiniTable
              title="SKUs em ruptura"
              rows={data.ruptura}
              emptyMsg="Nenhum SKU em ruptura"
              valueLabel="Vendido"
              valueKey="qtdVendidaPer"
              format={int}
            />
            <SkuMiniTable
              title="SKUs parados"
              rows={data.parados}
              emptyMsg="Nenhum SKU parado"
              valueLabel="Comprado"
              valueKey="qtdComprada"
              format={int}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
