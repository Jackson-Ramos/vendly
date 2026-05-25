import { useEffect, useState } from 'react'
import styles from './Relatorio.module.css'
import { brl } from './format'
import GrupoDetalhesModal from './GrupoDetalhesModal'

const DIMS = [
  { key: 'cor',     label: 'Cor',     title: 'Vendas por Cor',     header: 'Cor' },
  { key: 'tamanho', label: 'Tamanho', title: 'Vendas por Tamanho', header: 'Tamanho' },
  { key: 'grupo',   label: 'Grupo',   title: 'Vendas por Grupo',   header: 'Grupo' },
]

function buildQuery(filters, dim) {
  const params = new URLSearchParams()
  if (filters.filial)   params.set('filial',   filters.filial)
  if (filters.vendedor) params.set('vendedor', filters.vendedor)
  if (filters.inicio)   params.set('inicio',   filters.inicio)
  if (filters.fim)      params.set('fim',      filters.fim)
  if (dim)              params.set('dim',      dim)
  const q = params.toString()
  return q ? `?${q}` : ''
}

export default function VendasPorGrupoTable({ filters }) {
  const [dim, setDim] = useState('grupo')
  const [data, setData] = useState([])
  const [openGrupo, setOpenGrupo] = useState(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`/api/dashboard/vendas-por-grupo${buildQuery(filters, dim)}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') console.error(err) })
    return () => ctrl.abort()
  }, [filters.filial, filters.vendedor, filters.inicio, filters.fim, dim])

  const cfg = DIMS.find(d => d.key === dim)
  const max = data[0]?.percentual ?? 0
  const isGrupo = dim === 'grupo'

  return (
    <section className={styles.card}>
      <div className={styles.chartHeader}>
        <h2 className={styles.cardTitle}>{cfg.title}</h2>
        <div className={styles.periodToggle} role="tablist">
          {DIMS.map(d => (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={dim === d.key}
              className={`${styles.periodBtn} ${dim === d.key ? styles.periodBtnActive : ''}`}
              onClick={() => setDim(d.key)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thLeft}>{cfg.header}</th>
              <th className={styles.thRight}>Valor</th>
              <th className={styles.thRight}>%</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={3} className={styles.empty}>Sem dados</td></tr>
            )}
            {data.map(r => (
              <tr key={r.codigo}>
                <td>
                  <div className={styles.grupoCell}>
                    <div className={styles.grupoNameRow}>
                      {isGrupo && (
                        <button
                          type="button"
                          className={styles.grupoExpandBtn}
                          onClick={() => setOpenGrupo({ codGrupo: r.codigo, grupo: r.descricao })}
                          aria-label={`Ver detalhes de ${r.descricao}`}
                          title="Ver detalhes"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                            <path d="M2 2h3M2 2v3M10 2H7M10 2v3M2 10h3M2 10V7M10 10H7M10 10V7"
                                  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                      <span className={styles.grupoName}>{r.descricao}</span>
                    </div>
                    <div className={styles.bar}>
                      <div
                        className={styles.barFill}
                        style={{ width: max > 0 ? `${(r.percentual / max) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </td>
                <td className={styles.tdRight}>{brl(r.valor)}</td>
                <td className={styles.tdRight}>{r.percentual.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openGrupo && (
        <GrupoDetalhesModal
          grupo={openGrupo}
          filters={filters}
          onClose={() => setOpenGrupo(null)}
        />
      )}
    </section>
  )
}
