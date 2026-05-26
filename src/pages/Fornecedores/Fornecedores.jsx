import { useEffect, useMemo, useState } from 'react'
import baseStyles from '../Relatorio/Relatorio.module.css'
import styles from './Fornecedores.module.css'
import { useFiltersMetadata } from '../Relatorio/useDashboardData'
import { useFornecedoresRanking } from './useFornecedoresData'
import FornecedoresFiltersBar from './FornecedoresFiltersBar'
import FornecedoresKpiCards from './FornecedoresKpiCards'
import FornecedoresTable from './FornecedoresTable'
import FornecedorDetalhesModal from './FornecedorDetalhesModal'

// Sem vendedor: filtro irrelevante pra decisão de compra de fornecedor.
// `codFornec` filtra a tela localmente (não vai pra rota /ranking) — assim o
// select continua tendo a lista completa pra escolher.
const EMPTY_FILTERS = { filial: '', inicio: '', fim: '', codFornec: '' }

// Predicados dos KPIs clicáveis. Mantidos aqui pra ficarem alinhados com o
// que `FornecedoresKpiCards` conta.
const KPI_PREDICATES = {
  ruptura:   f => f.skusRuptura > 0,
  cobertura: f => f.coberturaMeses !== null && f.coberturaMeses > 6,
  devolucao: f => f.pctDevolucao > 10,
}

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

export default function Fornecedores() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openFornecedor, setOpenFornecedor] = useState(null)
  // Drill-down a partir dos cards de alerta (ruptura/cobertura/devolução).
  // Filtra só a tabela — os contadores dos cards continuam vendo o universo
  // completo pós-filtros pra não zerar quando o usuário clica.
  const [kpiFilter, setKpiFilter] = useState(null)
  const meta = useFiltersMetadata()
  const memoFilters = useMemo(
    () => filters,
    [filters.filial, filters.inicio, filters.fim],
  )
  const { fornecedores, periodo, loading, error } = useFornecedoresRanking(memoFilters)

  // Lista pro select ordenada alfabeticamente (independe do filtro local).
  const fornecedoresOrdenados = useMemo(
    () => [...fornecedores].sort((a, b) => String(a.fornecedor).localeCompare(String(b.fornecedor))),
    [fornecedores],
  )

  // Filtro local por fornecedor: aplica em cima do resultado do backend.
  const fornecedoresVisiveis = useMemo(() => {
    if (!filters.codFornec) return fornecedores
    const cod = Number(filters.codFornec)
    return fornecedores.filter(f => f.codFornec === cod)
  }, [fornecedores, filters.codFornec])

  // Aplicação do drill-down dos cards em cima do conjunto já filtrado.
  const fornecedoresTabela = useMemo(() => {
    if (!kpiFilter) return fornecedoresVisiveis
    const pred = KPI_PREDICATES[kpiFilter]
    return pred ? fornecedoresVisiveis.filter(pred) : fornecedoresVisiveis
  }, [fornecedoresVisiveis, kpiFilter])

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  // Mudar filtros invalida o drill-down (universo muda → contagem dos cards
  // também), então limpamos junto.
  function handleChange(patch) {
    setFilters(prev => ({ ...prev, ...patch }))
    setKpiFilter(null)
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS)
    setKpiFilter(null)
  }

  function handleToggleKpi(key) {
    setKpiFilter(prev => (prev === key ? null : key))
  }

  useEffect(() => {
    if (!filtersOpen) return
    function onKey(e) { if (e.key === 'Escape') setFiltersOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [filtersOpen])

  return (
    <div className={baseStyles.root}>
      <header className={baseStyles.header}>
        <h1 className={baseStyles.title}>Fornecedores</h1>

        <button
          type="button"
          className={baseStyles.filterIconBtn}
          onClick={() => setFiltersOpen(true)}
          aria-label="Abrir filtros"
        >
          <FilterIcon />
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <span className={baseStyles.filterBadge}>{activeFiltersCount}</span>
          )}
        </button>

        <div className={baseStyles.filtersInlineWrap}>
          <FornecedoresFiltersBar
            filters={filters}
            meta={meta}
            fornecedores={fornecedoresOrdenados}
            onChange={handleChange}
            onClear={handleClearFilters}
          />
        </div>
      </header>

      {error && <div className={baseStyles.errorBanner}>Erro ao carregar dados: {error.message}</div>}

      <div className={`${baseStyles.body} ${loading ? baseStyles.bodyLoading : ''}`}>
        <FornecedoresKpiCards
          fornecedores={fornecedoresVisiveis}
          activeKpi={kpiFilter}
          onToggleKpi={handleToggleKpi}
        />

        <div className={styles.virtualStockNotice}>
          <strong>Como interpretar os indicadores:</strong>{' '}
          <span>🔴 <strong>vermelho</strong>: cobertura &gt; 12m OU sell-through &lt; 30% OU % devolução &gt; 15%.</span>{' '}
          <span>🟡 <strong>amarelo</strong>: cobertura entre 6–12m OU sell-through 30–60% OU % devolução 5–15%.</span>{' '}
          <span>🟢 <strong>verde</strong>: caso contrário (e com vendas no período).</span>
          {periodo?.meses ? (
            <> Janela atual: <strong>{periodo.meses.toFixed(1)} meses</strong>.</>
          ) : null}
        </div>

        <FornecedoresTable
          fornecedores={fornecedoresTabela}
          onOpenFornecedor={setOpenFornecedor}
        />
      </div>

      {openFornecedor && (
        <FornecedorDetalhesModal
          fornecedor={openFornecedor}
          filters={memoFilters}
          onClose={() => setOpenFornecedor(null)}
        />
      )}

      {filtersOpen && (
        <div
          className={baseStyles.modalOverlay}
          onClick={() => setFiltersOpen(false)}
          role="presentation"
        >
          <div
            className={baseStyles.filtersModalContent}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
          >
            <header className={baseStyles.modalHeader}>
              <div className={baseStyles.modalTitleGroup}>
                <h2 className={baseStyles.modalTitle}>Filtros</h2>
              </div>
              <button
                type="button"
                className={baseStyles.modalCloseBtn}
                onClick={() => setFiltersOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>
            <div className={baseStyles.filtersModalBody}>
              <FornecedoresFiltersBar
                filters={filters}
                meta={meta}
                fornecedores={fornecedoresOrdenados}
                onChange={handleChange}
                onClear={handleClearFilters}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
