import { useState } from 'react'
import styles from './Relatorio.module.css'
import { brl } from './format'
import GrupoDetalhesModal from './GrupoDetalhesModal'

export default function VendasPorGrupoTable({ data, filters }) {
  const max = data[0]?.percentual ?? 0
  const [openGrupo, setOpenGrupo] = useState(null)

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Vendas por Grupo</h2>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thLeft}>Grupo</th>
              <th className={styles.thRight}>Valor</th>
              <th className={styles.thRight}>%</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={3} className={styles.empty}>Sem dados</td></tr>
            )}
            {data.map(g => (
              <tr key={g.codGrupo}>
                <td>
                  <div className={styles.grupoCell}>
                    <div className={styles.grupoNameRow}>
                      <button
                        type="button"
                        className={styles.grupoExpandBtn}
                        onClick={() => setOpenGrupo(g)}
                        aria-label={`Ver detalhes de ${g.grupo}`}
                        title="Ver detalhes"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <path d="M2 2h3M2 2v3M10 2H7M10 2v3M2 10h3M2 10V7M10 10H7M10 10V7"
                                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </button>
                      <span className={styles.grupoName}>{g.grupo}</span>
                    </div>
                    <div className={styles.bar}>
                      <div
                        className={styles.barFill}
                        style={{ width: max > 0 ? `${(g.percentual / max) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </td>
                <td className={styles.tdRight}>{brl(g.valor)}</td>
                <td className={styles.tdRight}>{g.percentual.toFixed(1)}%</td>
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
