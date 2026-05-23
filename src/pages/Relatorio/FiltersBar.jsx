import styles from './Relatorio.module.css'

export default function FiltersBar({ filters, onChange, onClear, meta }) {
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

      <button className={styles.clearBtn} onClick={onClear}>Limpar</button>
    </div>
  )
}
