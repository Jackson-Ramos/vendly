import { useMemo, useState } from 'react'
import styles from './Fornecedores.module.css'
import baseStyles from '../Relatorio/Relatorio.module.css'
import { brl, int } from '../Relatorio/format'

// Regras do semáforo (calculadas no front pra ficar fácil ajustar):
// 🔴 vermelho: cobertura > 12m OU sell-through < 30% OU % devolução > 15%
// 🟡 amarelo:  cobertura entre 6–12m OU sell-through 30–60% OU % dev 5–15%
// 🟢 verde:    caso contrário (e com vendas no período)
function calcSemaforo(f) {
  if (f.valorVendido === 0 && f.valorComprado === 0) return 'neutro'
  const dev = f.pctDevolucao
  const cob = f.coberturaMeses
  const st  = f.sellThrough
  if ((cob !== null && cob > 12) || (st !== null && st < 0.3) || dev > 15) return 'vermelho'
  if ((cob !== null && cob > 6)  || (st !== null && st < 0.6) || dev > 5)  return 'amarelo'
  return 'verde'
}

const COLUMNS = [
  { key: 'fornecedor',     label: 'Fornecedor',  align: 'left',  sortable: true },
  { key: 'valorVendido',   label: 'Vendido',     align: 'right', sortable: true, format: brl },
  { key: 'valorComprado',  label: 'Comprado',    align: 'right', sortable: true, format: brl },
  { key: 'margemPct',      label: 'Margem %',    align: 'right', sortable: true, format: v => v == null ? '—' : `${v.toFixed(1)}%` },
  { key: 'estoqueVirtual', label: 'Estoque',     align: 'right', sortable: true, format: int, tip: 'Estoque virtual = compras + devoluções − vendas (saldo do ano)' },
  { key: 'coberturaMeses', label: 'Cobertura',   align: 'right', sortable: true, format: v => v == null ? '—' : `${v.toFixed(1)} m`, tip: 'Estoque virtual / média mensal vendida' },
  { key: 'sellThrough',    label: 'Sell-through',align: 'right', sortable: true, format: v => v == null ? '—' : `${(v * 100).toFixed(0)}%`, tip: 'Vendido / Comprado no período' },
  { key: 'pctDevolucao',   label: '% Devolução', align: 'right', sortable: true, format: v => `${v.toFixed(1)}%` },
  { key: 'skusRuptura',    label: 'SKUs ruptura',align: 'right', sortable: true, format: int, tip: 'SKUs com estoque ≤ 0 e venda no período' },
  { key: 'skusParados',    label: 'SKUs parados',align: 'right', sortable: true, format: int, tip: 'SKUs com estoque > 0 e sem venda no período' },
]

const SEM_COLOR = {
  verde:    '#3ec77b',
  amarelo:  '#eab308',
  vermelho: '#ef4444',
  neutro:   '#34343a',
}

export default function FornecedoresTable({ fornecedores, onOpenFornecedor }) {
  const [sortKey, setSortKey] = useState('valorVendido')
  const [sortDir, setSortDir] = useState('desc')

  const sorted = useMemo(() => {
    const list = [...fornecedores]
    list.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (sortKey === 'fornecedor') {
        return sortDir === 'asc'
          ? String(av || '').localeCompare(String(bv || ''))
          : String(bv || '').localeCompare(String(av || ''))
      }
      const ax = av == null ? -Infinity : av
      const bx = bv == null ? -Infinity : bv
      return sortDir === 'asc' ? ax - bx : bx - ax
    })
    return list
  }, [fornecedores, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'fornecedor' ? 'asc' : 'desc')
    }
  }

  return (
    <section className={baseStyles.card}>
      <div className={baseStyles.chartHeader}>
        <h2 className={baseStyles.cardTitle}>Ranking de Fornecedores</h2>
      </div>

      <div className={styles.tableScrollX}>
        <table className={baseStyles.table}>
          <thead>
            <tr>
              <th className={styles.thSem} aria-label="Semáforo" />
              {COLUMNS.map(c => (
                <th
                  key={c.key}
                  className={c.align === 'right' ? baseStyles.thRight : baseStyles.thLeft}
                  onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                  style={c.sortable ? { cursor: 'pointer' } : undefined}
                  title={c.tip}
                >
                  {c.label}
                  {sortKey === c.key && (
                    <span className={styles.sortArrow}>{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 1} className={baseStyles.empty}>Sem dados</td></tr>
            )}
            {sorted.map(f => {
              const sem = calcSemaforo(f)
              return (
                <tr
                  key={f.codFornec}
                  className={styles.rowClickable}
                  onClick={() => onOpenFornecedor?.(f)}
                >
                  <td className={styles.tdSem}>
                    <span className={styles.semDot} style={{ backgroundColor: SEM_COLOR[sem] }} title={sem} />
                  </td>
                  {COLUMNS.map(c => (
                    <td
                      key={c.key}
                      className={c.align === 'right' ? baseStyles.tdRight : undefined}
                    >
                      {c.key === 'fornecedor'
                        ? <span className={styles.fornecedorName}>{f[c.key]}</span>
                        : c.format(f[c.key])}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
