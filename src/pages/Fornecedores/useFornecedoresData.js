import { useEffect, useState } from 'react'

function toQuery(filters) {
  const params = new URLSearchParams()
  if (filters.filial) params.set('filial', filters.filial)
  if (filters.inicio) params.set('inicio', filters.inicio)
  if (filters.fim)    params.set('fim',    filters.fim)
  const q = params.toString()
  return q ? `?${q}` : ''
}

export function useFornecedoresRanking(filters) {
  const [data, setData] = useState({ periodo: null, fornecedores: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const filterKey = `${filters.filial}|${filters.inicio}|${filters.fim}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setLoading(true)
    setError(null)
  }

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`/api/fornecedores/ranking${toQuery(filters)}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err); setLoading(false)
      })
    return () => ctrl.abort()
  }, [filters.filial, filters.inicio, filters.fim])

  return { ...data, loading, error }
}
