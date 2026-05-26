import { useEffect, useMemo, useState } from 'react'
import styles from './Relatorio.module.css'
import FiltersBar from './FiltersBar'
import KpiCards from './KpiCards'
import EvolucaoMensalChart from './EvolucaoMensalChart'
import VendasPorGrupoTable from './VendasPorGrupoTable'
import RankingVendedoresTable from './RankingVendedoresTable'
import { useDashboardData, useFiltersMetadata } from './useDashboardData'

const EMPTY_FILTERS = { filial: '', vendedor: '', inicio: '', fim: '' }

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  )
}

export default function Relatorio() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const meta = useFiltersMetadata()
  const memoFilters = useMemo(() => filters, [filters.filial, filters.vendedor, filters.inicio, filters.fim])
  const { kpis, ranking, loading, error } = useDashboardData(memoFilters)

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  function handleChange(patch) {
    setFilters(prev => ({ ...prev, ...patch }))
  }

  useEffect(() => {
    if (!filtersOpen) return
    function onKey(e) { if (e.key === 'Escape') setFiltersOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [filtersOpen])

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>Relatório</h1>

        <button
          type="button"
          className={styles.filterIconBtn}
          onClick={() => setFiltersOpen(true)}
          aria-label="Abrir filtros"
        >
          <FilterIcon />
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <span className={styles.filterBadge}>{activeFiltersCount}</span>
          )}
        </button>

        <div className={styles.filtersInlineWrap}>
          <FiltersBar
            filters={filters}
            meta={meta}
            onChange={handleChange}
            onClear={() => setFilters(EMPTY_FILTERS)}
          />
        </div>
      </header>

      {error && <div className={styles.errorBanner}>Erro ao carregar dados: {error.message}</div>}

      <div className={`${styles.body} ${loading ? styles.bodyLoading : ''}`}>
        {loading && (
          <div className={styles.spinnerOverlay} aria-live="polite" aria-busy="true">
            <div className={styles.spinner} role="status" aria-label="Carregando" />
          </div>
        )}
        <KpiCards kpis={kpis} />

        <div className={styles.row2}>
          <EvolucaoMensalChart filters={memoFilters} />
          <VendasPorGrupoTable filters={memoFilters} />
        </div>

        <RankingVendedoresTable data={ranking} />
      </div>

      {filtersOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setFiltersOpen(false)}
          role="presentation"
        >
          <div
            className={styles.filtersModalContent}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
          >
            <header className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <h2 className={styles.modalTitle}>Filtros</h2>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setFiltersOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>
            <div className={styles.filtersModalBody}>
              <FiltersBar
                filters={filters}
                meta={meta}
                onChange={handleChange}
                onClear={() => setFilters(EMPTY_FILTERS)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
