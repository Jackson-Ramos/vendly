import styles from '../Relatorio/Relatorio.module.css'

// Presets de janela de análise (escolha mais comum em decisão de compra).
// Usa o intervalo de datas conhecido pelo backend (meta.dataMax) como âncora.
const PRESETS = [
  { key: '3m',  label: '3 meses',  months: 3 },
  { key: '6m',  label: '6 meses',  months: 6 },
  { key: '12m', label: '12 meses', months: 12 },
]

function isoMinusMonths(isoDate, months) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCMonth(dt.getUTCMonth() - months)
  dt.setUTCDate(dt.getUTCDate() + 1) // inclusivo
  return dt.toISOString().slice(0, 10)
}

export default function FornecedoresFiltersBar({ filters, onChange, onClear, meta, fornecedores = [] }) {
  function applyPreset(months) {
    const fim = meta.dataMax || ''
    const inicio = isoMinusMonths(fim, months)
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
        <label className={styles.filterLabel}>Fornecedor</label>
        <select
          className={styles.select}
          value={filters.codFornec}
          onChange={e => onChange({ codFornec: e.target.value })}
        >
          <option value="">Todos</option>
          {fornecedores.map(f => (
            <option key={f.codFornec} value={f.codFornec}>{f.fornecedor}</option>
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
