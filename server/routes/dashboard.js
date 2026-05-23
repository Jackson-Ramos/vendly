import { Router } from 'express'
import db from '../db.js'
import { buildWhere } from '../filters.js'

const router = Router()

router.get('/kpis', (req, res) => {
  const { sql: where, params } = buildWhere(req.query)
  const row = db
    .prepare(`
      SELECT
        COALESCE(SUM(v.VL_Total), 0)         AS vendaBruta,
        COALESCE(SUM(v.VL_Total_Liquido), 0) AS vendaLiquida,
        COUNT(DISTINCT v.COD_VENDA)          AS qtdVendas
      FROM vendas_2025 v
      ${where}
    `)
    .get(params)

  // Devoluções: f_devolucoes_2025 só tem Cod_Filial/Cod_Usur (operador, não vendedor),
  // então aplicamos só filial + período. O denominador da % também ignora o filtro de
  // vendedor para manter numerador e denominador na mesma base (% da filial no período).
  const { sql: whereDev, params: paramsDev } = buildWhere(req.query, {
    alias: 'd',
    columns: { filial: 'Cod_Filial', vendedor: null, data: 'Data' },
  })
  const devRow = db
    .prepare(`SELECT COALESCE(SUM(d.VL_Total), 0) AS valorDevolucao FROM f_devolucoes_2025 d ${whereDev}`)
    .get(paramsDev)

  const { sql: whereBase, params: paramsBase } = buildWhere(
    { ...req.query, vendedor: '' }
  )
  const baseRow = db
    .prepare(`SELECT COALESCE(SUM(v.VL_Total), 0) AS vendaBrutaBase FROM vendas_2025 v ${whereBase}`)
    .get(paramsBase)

  const ticketMedio = row.qtdVendas > 0 ? row.vendaLiquida / row.qtdVendas : 0
  const percentualDevolucao =
    baseRow.vendaBrutaBase > 0 ? (devRow.valorDevolucao / baseRow.vendaBrutaBase) * 100 : 0

  res.json({
    ...row,
    ticketMedio,
    valorDevolucao: devRow.valorDevolucao,
    percentualDevolucao,
  })
})

router.get('/vendas-por-grupo', (req, res) => {
  const { sql: where, params } = buildWhere(req.query)
  const rows = db
    .prepare(`
      SELECT
        g.COD_GRUPO        AS codGrupo,
        g.DESCRICAO        AS grupo,
        SUM(v.VL_Total_Liquido) AS valor
      FROM vendas_2025 v
      INNER JOIN Produtos p ON p.Cod_Prod = v.COD_PROD
      INNER JOIN Grupo g    ON g.COD_GRUPO = p.COD_GRUPO
      ${where}
      GROUP BY g.COD_GRUPO, g.DESCRICAO
      ORDER BY valor DESC
    `)
    .all(params)

  const total = rows.reduce((acc, r) => acc + r.valor, 0)
  res.json(
    rows.map(r => ({
      ...r,
      percentual: total > 0 ? (r.valor / total) * 100 : 0,
    }))
  )
})

router.get('/ranking-vendedores', (req, res) => {
  const { sql: where, params } = buildWhere(req.query)
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const rows = db
    .prepare(`
      SELECT
        u.CodVend                AS codVendedor,
        u.VENDEDOR               AS vendedor,
        SUM(v.VL_Total_Liquido)  AS valor,
        COUNT(DISTINCT v.COD_VENDA) AS qtd
      FROM vendas_2025 v
      INNER JOIN Usur u ON u.CodVend = v.COD_VENDEDOR
      ${where}
      GROUP BY u.CodVend, u.VENDEDOR
      ORDER BY valor DESC
      LIMIT @limit
    `)
    .all({ ...params, limit })
  res.json(rows)
})

router.get('/evolucao-mensal', (req, res) => {
  const { sql: where, params } = buildWhere(req.query)
  const rows = db
    .prepare(`
      SELECT
        substr(v.Data,7,4)||'-'||substr(v.Data,4,2) AS mes,
        SUM(v.VL_Total)         AS vendaBruta,
        SUM(v.VL_Total_Liquido) AS vendaLiquida
      FROM vendas_2025 v
      ${where}
      GROUP BY mes
      ORDER BY mes
    `)
    .all(params)
  res.json(rows)
})

export default router
