import { useEffect, useState } from 'react'

function toQuery(filters) {
  const params = new URLSearchParams()
  if (filters.filial)   params.set('filial',   filters.filial)
  if (filters.vendedor) params.set('vendedor', filters.vendedor)
  if (filters.inicio)   params.set('inicio',   filters.inicio)
  if (filters.fim)      params.set('fim',      filters.fim)
  const q = params.toString()
  return q ? `?${q}` : ''
}

export function useDashboardData(filters) {
  const [data, setData] = useState({
    kpis: null,
    ranking: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const filterKey = `${filters.filial}|${filters.vendedor}|${filters.inicio}|${filters.fim}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setLoading(true)
    setError(null)
  }

  useEffect(() => {
    const ctrl = new AbortController()
    const q = toQuery(filters)

    Promise.all([
      fetch(`/api/dashboard/kpis${q}`,              { signal: ctrl.signal }).then(r => r.json()),
      fetch(`/api/dashboard/ranking-vendedores${q}`,{ signal: ctrl.signal }).then(r => r.json()),
    ])
      .then(([kpis, ranking]) => {
        setData({ kpis, ranking })
        setLoading(false)
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err)
        setLoading(false)
      })

    return () => ctrl.abort()
  }, [filters.filial, filters.vendedor, filters.inicio, filters.fim])

  return { ...data, loading, error }
}

export function useFiltersMetadata() {
  const [meta, setMeta] = useState({ filiais: [], vendedores: [], dataMin: '', dataMax: '' })

  useEffect(() => {
    fetch('/api/filters')
      .then(r => r.json())
      .then(setMeta)
      .catch(() => {})
  }, [])

  return meta
}
