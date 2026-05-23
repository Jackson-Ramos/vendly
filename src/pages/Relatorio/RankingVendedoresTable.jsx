import styles from './Relatorio.module.css'
import { brl, int } from './format'

export default function RankingVendedoresTable({ data }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Ranking de Vendedores</h2>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thRank}>#</th>
              <th className={styles.thLeft}>Vendedor</th>
              <th className={styles.thRight}>Valor</th>
              <th className={styles.thRight}>Vendas</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={4} className={styles.empty}>Sem dados</td></tr>
            )}
            {data.map((v, i) => (
              <tr key={v.codVendedor}>
                <td className={styles.rank}>{i + 1}</td>
                <td>{v.vendedor}</td>
                <td className={styles.tdRight}>{brl(v.valor)}</td>
                <td className={styles.tdRight}>{int(v.qtd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
