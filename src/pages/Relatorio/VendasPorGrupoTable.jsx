import styles from './Relatorio.module.css'
import { brl } from './format'

export default function VendasPorGrupoTable({ data }) {
  const max = data[0]?.percentual ?? 0

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
                    <span className={styles.grupoName}>{g.grupo}</span>
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
    </section>
  )
}
