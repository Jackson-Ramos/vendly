import { useMemo, useState } from 'react'
import styles from './Relatorio.module.css'
import FiltersBar from './FiltersBar'
import KpiCards from './KpiCards'
import EvolucaoMensalChart from './EvolucaoMensalChart'
import VendasPorGrupoTable from './VendasPorGrupoTable'
import RankingVendedoresTable from './RankingVendedoresTable'
import { useDashboardData, useFiltersMetadata } from './useDashboardData'

const EMPTY_FILTERS = { filial: '', vendedor: '', inicio: '', fim: '' }

export default function Relatorio() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const meta = useFiltersMetadata()
  const memoFilters = useMemo(() => filters, [filters.filial, filters.vendedor, filters.inicio, filters.fim])
  const { kpis, vendasPorGrupo, ranking, evolucao, loading, error } = useDashboardData(memoFilters)

  function handleChange(patch) {
    setFilters(prev => ({ ...prev, ...patch }))
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>Relatório</h1>
        <FiltersBar
          filters={filters}
          meta={meta}
          onChange={handleChange}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />
      </header>

      {error && <div className={styles.errorBanner}>Erro ao carregar dados: {error.message}</div>}

      <div className={`${styles.body} ${loading ? styles.bodyLoading : ''}`}>
        <KpiCards kpis={kpis} />

        <div className={styles.row2}>
          <EvolucaoMensalChart data={evolucao} />
          <VendasPorGrupoTable data={vendasPorGrupo} />
        </div>

        <RankingVendedoresTable data={ranking} />
      </div>
    </div>
  )
}
