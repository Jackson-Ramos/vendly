import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import styles from './Relatorio.module.css'
import { brl, mesLabel, MES_LABELS } from './format'

const pad2 = n => String(n).padStart(2, '0')

function monthOptions(year) {
  return MES_LABELS.map((label, i) => ({
    value: `${year}-${pad2(i + 1)}`,
    label,
  }))
}

// Semanas Dom-Sáb cujo "ano dominante" (quarta-feira, ponto médio) está em
// `year`. `value` é o sábado final (YYYY-MM-DD) — o backend recebe esse
// parâmetro e devolve o domingo–sábado terminando nessa data. Usar a quarta
// como referência evita que semanas que cruzam a virada de ano fiquem
// associadas ao ano errado (ex.: Dom 28/dez/2025 – Sáb 3/jan/2026 pertence
// a 2025, não a 2026).
function weekOptions(year) {
  const weeks = []
  const wed = new Date(Date.UTC(year, 0, 1))
  while (wed.getUTCDay() !== 3) wed.setUTCDate(wed.getUTCDate() + 1)
  while (wed.getUTCFullYear() === year) {
    const start = new Date(wed)
    start.setUTCDate(start.getUTCDate() - 3)
    const end = new Date(wed)
    end.setUTCDate(end.getUTCDate() + 3)
    weeks.push({
      value: `${end.getUTCFullYear()}-${pad2(end.getUTCMonth() + 1)}-${pad2(end.getUTCDate())}`,
      label: `${pad2(start.getUTCDate())}/${pad2(start.getUTCMonth() + 1)} – ${pad2(end.getUTCDate())}/${pad2(end.getUTCMonth() + 1)}`,
    })
    wed.setUTCDate(wed.getUTCDate() + 7)
  }
  return weeks
}

// Ano dominante de uma semana cujo sábado final é `yyyymmdd` (YYYY-MM-DD).
// Mesma lógica do weekOptions: usa a quarta-feira (sábado - 3 dias).
function weekDominantYear(yyyymmdd) {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  const wed = new Date(Date.UTC(y, m - 1, d))
  wed.setUTCDate(wed.getUTCDate() - 3)
  return wed.getUTCFullYear()
}

function compactBRL(value) {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000)     return `R$ ${(value / 1_000).toFixed(0)}k`
  return `R$ ${value}`
}

const DOW_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function diaTickMes(yyyymmdd) {
  return String(Number(yyyymmdd.slice(6, 8)))
}

function diaTickSemana(yyyymmdd) {
  const y = Number(yyyymmdd.slice(0, 4))
  const m = Number(yyyymmdd.slice(4, 6)) - 1
  const d = Number(yyyymmdd.slice(6, 8))
  return DOW_LABELS[new Date(y, m, d).getDay()]
}

function diaFullLabel(yyyymmdd) {
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`
}

function AnoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.chartTooltip}>
      <div className={styles.chartTooltipLabel}>{mesLabel(label)} {label?.slice(0, 4)}</div>
      <div className={styles.chartTooltipValue}>{brl(payload[0].value)}</div>
    </div>
  )
}

function DiaTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.chartTooltip}>
      <div className={styles.chartTooltipLabel}>{diaFullLabel(payload[0].payload.dia)}</div>
      <div className={styles.chartTooltipValue}>{brl(payload[0].value)}</div>
    </div>
  )
}

function buildQuery(filters, extra = {}) {
  const params = new URLSearchParams()
  if (filters.filial)   params.set('filial',   filters.filial)
  if (filters.vendedor) params.set('vendedor', filters.vendedor)
  if (filters.inicio)   params.set('inicio',   filters.inicio)
  if (filters.fim)      params.set('fim',      filters.fim)
  for (const [k, v] of Object.entries(extra)) params.set(k, v)
  return `?${params.toString()}`
}

const PERIODS = [
  { key: 'ano',    label: 'Ano' },
  { key: 'mes',    label: 'Mês' },
  { key: 'semana', label: 'Semana' },
]

export default function EvolucaoMensalChart({ filters }) {
  const [periodo, setPeriodo] = useState('ano')
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [data, setData] = useState([])

  // Invalida o mês/semana selecionados (drill-down) quando filtros mudam. Faz
  // isso no render — padrão recomendado pelo React em vez de useEffect com setState.
  const filterSig = `${filters.filial}|${filters.vendedor}|${filters.inicio}|${filters.fim}`
  const [prevSig, setPrevSig] = useState(filterSig)
  if (filterSig !== prevSig) {
    setPrevSig(filterSig)
    setSelectedMonth(null)
    setSelectedWeek(null)
  }

  // Limpa `data` quando o período muda — o shape difere entre 'ano' ({mes,...})
  // e 'mes'/'semana' ({dia,...}) e renderizar shape errado quebra os ticks.
  // O setState durante render só vale no próximo render, então também usamos
  // `displayData` para que o render atual já trabalhe com a lista vazia.
  const [prevPeriodo, setPrevPeriodo] = useState(periodo)
  const periodoChanged = prevPeriodo !== periodo
  if (periodoChanged) {
    setPrevPeriodo(periodo)
    setData([])
  }
  const displayData = periodoChanged ? [] : data

  function changePeriod(p) {
    if (p !== 'mes') setSelectedMonth(null)
    if (p !== 'semana') setSelectedWeek(null)
    setPeriodo(p)
  }

  function handleAnoClick(e) {
    if (!e?.activeLabel) return
    setSelectedMonth(e.activeLabel)
    setPeriodo('mes')
  }

  useEffect(() => {
    const ctrl = new AbortController()
    let url
    if (periodo === 'ano') {
      url = `/api/dashboard/evolucao-mensal${buildQuery(filters)}`
    } else {
      const extra = { periodo }
      if (periodo === 'mes' && selectedMonth) extra.mes = selectedMonth
      if (periodo === 'semana' && selectedWeek) extra.semana = selectedWeek
      url = `/api/dashboard/evolucao-diaria${buildQuery(filters, extra)}`
    }
    fetch(url, { signal: ctrl.signal })
      .then(r => r.json())
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') console.error(err) })
    return () => ctrl.abort()
  }, [filters.filial, filters.vendedor, filters.inicio, filters.fim, periodo, selectedMonth, selectedWeek])

  // Valor atualmente exibido no seletor: prioriza a seleção explícita; senão,
  // deriva do próprio displayData (a âncora do backend define o período).
  let currentMesValue = ''
  if (periodo === 'mes') {
    if (selectedMonth) {
      currentMesValue = selectedMonth
    } else if (displayData.length > 0) {
      const d0 = displayData[0].dia
      currentMesValue = `${d0.slice(0, 4)}-${d0.slice(4, 6)}`
    }
  }

  let currentSemanaValue = ''
  if (periodo === 'semana') {
    if (selectedWeek) {
      currentSemanaValue = selectedWeek
    } else if (displayData.length > 0) {
      const dn = displayData[displayData.length - 1].dia
      currentSemanaValue = `${dn.slice(0, 4)}-${dn.slice(4, 6)}-${dn.slice(6, 8)}`
    }
  }

  const optionYear =
    periodo === 'mes' && currentMesValue
      ? Number(currentMesValue.slice(0, 4))
      : periodo === 'semana' && currentSemanaValue
      ? weekDominantYear(currentSemanaValue)
      : new Date().getFullYear()

  let semanaData = displayData
  if (periodo === 'semana' && displayData.length) {
    let maxV = -Infinity
    let minV = Infinity
    let maxIdx = -1
    let minIdx = -1
    displayData.forEach((d, i) => {
      if (d.vendaLiquida > maxV) { maxV = d.vendaLiquida; maxIdx = i }
      if (d.vendaLiquida > 0 && d.vendaLiquida < minV) { minV = d.vendaLiquida; minIdx = i }
    })
    if (maxV === minV) { maxIdx = -1; minIdx = -1 }
    semanaData = displayData.map((d, i) => ({
      ...d,
      fill: i === maxIdx ? '#3fb950' : i === minIdx ? '#e35d6a' : '#5e6ad2',
    }))
  }

  return (
    <section className={styles.card}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleGroup}>
          <h2 className={styles.cardTitle}>Evolução de Vendas</h2>
          {periodo === 'mes' && (
            <select
              className={styles.chartPeriodSelect}
              value={currentMesValue}
              onChange={e => setSelectedMonth(e.target.value)}
              aria-label="Selecionar mês"
            >
              {!currentMesValue && <option value="" disabled>Carregando…</option>}
              {monthOptions(optionYear).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label} {optionYear}</option>
              ))}
            </select>
          )}
          {periodo === 'semana' && (
            <select
              className={styles.chartPeriodSelect}
              value={currentSemanaValue}
              onChange={e => setSelectedWeek(e.target.value)}
              aria-label="Selecionar semana"
            >
              {!currentSemanaValue && <option value="" disabled>Carregando…</option>}
              {weekOptions(optionYear).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
        <div className={styles.periodToggle} role="tablist">
          {PERIODS.map(p => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={periodo === p.key}
              className={`${styles.periodBtn} ${periodo === p.key ? styles.periodBtnActive : ''}`}
              onClick={() => changePeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.chartWrapper}>
        {displayData.length === 0 ? (
          <div className={styles.empty}>Sem dados no período</div>
        ) : periodo === 'ano' ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={displayData}
              margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
              onClick={handleAnoClick}
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
              <Tooltip content={<AnoTooltip />} cursor={{ stroke: '#34343a' }} />
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
        ) : periodo === 'mes' ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid stroke="#23252a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="dia"
                tickFormatter={diaTickMes}
                stroke="#62666d"
                tick={{ fill: '#8a8f98', fontSize: 11 }}
                axisLine={{ stroke: '#23252a' }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tickFormatter={compactBRL}
                stroke="#62666d"
                tick={{ fill: '#8a8f98', fontSize: 12 }}
                axisLine={{ stroke: '#23252a' }}
                tickLine={false}
                width={64}
              />
              <Tooltip content={<DiaTooltip />} cursor={{ stroke: '#34343a' }} />
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
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={semanaData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid stroke="#23252a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="dia"
                tickFormatter={diaTickSemana}
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
              <Tooltip content={<DiaTooltip />} cursor={{ fill: '#1a1c1f' }} />
              <Bar dataKey="vendaLiquida" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
