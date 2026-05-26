import styles from './Relatorio.module.css'

const PRESETS = [
  { key: 'atual', label: 'Mês atual', months: 0 },
  { key: '3m',   label: '3 meses',   months: 3 },
  { key: '6m',   label: '6 meses',   months: 6 },
  { key: '12m',  label: '12 meses',  months: 12 },
]

function isoMinusMonths(isoDate, months) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCMonth(dt.getUTCMonth() - months)
  dt.setUTCDate(dt.getUTCDate() + 1)
  return dt.toISOString().slice(0, 10)
}

function firstDayOfMonth(isoDate) {
  if (!isoDate) return ''
  const [y, m] = isoDate.split('-')
  return `${y}-${m}-01`
}

export default function FiltersBar({ filters, onChange, onClear, meta }) {
  function applyPreset(months) {
    const fim = meta.dataMax || ''
    const inicio = months === 0 ? firstDayOfMonth(fim) : isoMinusMonths(fim, months)
    onChange({ inicio, fim })
  }

  return (
    <div className={styles.filtersBar}>
      <div className={styles.filterField}>
        <label className={styles.filterLabel}>Filial</label>
        <select
          className={styles.select}
          value={filters.filial}
          onChange={e => onChange({ filial: e.target.value })}
        >
          <option value="">Todas</option>
          {meta.filiais.map(f => (
            <option key={f.cod} value={f.cod}>{f.nome}</option>
          ))}
        </select>
      </div>

      <div className={styles.filterField}>
        <label className={styles.filterLabel}>Vendedor</label>
        <select
          className={styles.select}
          value={filters.vendedor}
          onChange={e => onChange({ vendedor: e.target.value })}
        >
          <option value="">Todos</option>
          {meta.vendedores.map(v => (
            <option key={v.cod} value={v.cod}>{v.nome}</option>
          ))}
        </select>
      </div>

      <div className={styles.filterField}>
        <label className={styles.filterLabel}>De</label>
        <input
          type="date"
          className={styles.input}
          value={filters.inicio}
          min={meta.dataMin}
          max={meta.dataMax}
          onChange={e => onChange({ inicio: e.target.value })}
        />
      </div>

      <div className={styles.filterField}>
        <label className={styles.filterLabel}>Até</label>
        <input
          type="date"
          className={styles.input}
          value={filters.fim}
          min={meta.dataMin}
          max={meta.dataMax}
          onChange={e => onChange({ fim: e.target.value })}
        />
      </div>

      <div className={styles.filterField}>
        <label className={styles.filterLabel}>Janela</label>
        <div className={styles.periodToggle} role="tablist">
          {PRESETS.map(p => (
            <button
              key={p.key}
              type="button"
              className={styles.periodBtn}
              onClick={() => applyPreset(p.months)}
              disabled={!meta.dataMax}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <button className={styles.clearBtn} onClick={onClear}>Limpar</button>
    </div>
  )
}
