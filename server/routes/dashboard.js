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

router.get('/grupo-detalhes', (req, res) => {
  const codGrupo = Number(req.query.codGrupo)
  if (!Number.isFinite(codGrupo)) {
    return res.status(400).json({ error: 'codGrupo obrigatório' })
  }

  const { sql: where, params } = buildWhere(req.query)
  const grupoClause = where ? `${where} AND p.COD_GRUPO = @codGrupo` : `WHERE p.COD_GRUPO = @codGrupo`
  const allParams = { ...params, codGrupo }

  const evolucao = db
    .prepare(`
      SELECT
        substr(v.Data,7,4)||'-'||substr(v.Data,4,2) AS mes,
        SUM(v.VL_Total_Liquido) AS vendaLiquida
      FROM vendas_2025 v
      INNER JOIN Produtos p ON p.Cod_Prod = v.COD_PROD
      ${grupoClause}
      GROUP BY mes
      ORDER BY mes
    `)
    .all(allParams)

  const cores = db
    .prepare(`
      SELECT
        COALESCE(c.DESCRICAO, '(sem cor)') AS cor,
        SUM(v.VL_Total_Liquido) AS valor,
        SUM(v.QUANTIDADE)       AS qtd
      FROM vendas_2025 v
      INNER JOIN Produtos p ON p.Cod_Prod = v.COD_PROD
      LEFT  JOIN Cores    c ON c.CodCor   = p.CodCor
      ${grupoClause}
      GROUP BY c.DESCRICAO
      ORDER BY valor DESC
      LIMIT 10
    `)
    .all(allParams)

  const tamanhos = db
    .prepare(`
      SELECT
        COALESCE(t.DESCRICAO, '(sem tamanho)') AS tamanho,
        SUM(v.VL_Total_Liquido) AS valor,
        SUM(v.QUANTIDADE)       AS qtd
      FROM vendas_2025 v
      INNER JOIN Produtos p ON p.Cod_Prod = v.COD_PROD
      LEFT  JOIN Tamanho  t ON t.CodTamanho = p.CODTAMANHO
      ${grupoClause}
      GROUP BY t.DESCRICAO
      ORDER BY valor DESC
      LIMIT 10
    `)
    .all(allParams)

  const produtos = db
    .prepare(`
      SELECT
        p.Cod_Prod              AS codProd,
        p.DESC_COMPLETA         AS produto,
        SUM(v.VL_Total_Liquido) AS valor,
        SUM(v.QUANTIDADE)       AS qtd
      FROM vendas_2025 v
      INNER JOIN Produtos p ON p.Cod_Prod = v.COD_PROD
      ${grupoClause}
      GROUP BY p.Cod_Prod, p.DESC_COMPLETA
      ORDER BY valor DESC
      LIMIT 10
    `)
    .all(allParams)

  res.json({ evolucao, cores, tamanhos, produtos })
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

// Evolução diária. O parâmetro `periodo` (mes|semana) define a janela em torno
// de uma data âncora: 'mes' = 1º ao último dia do mês; 'semana' = janela
// domingo–sábado contendo a data. Sem âncora explícita, usamos a última data
// que casa com os filtros. Os filtros do topo (filial/vendedor/inicio/fim)
// continuam sendo aplicados — dias fora deles retornam 0.
router.get('/evolucao-diaria', (req, res) => {
  const periodo = req.query.periodo === 'semana' ? 'semana' : 'mes'

  // Âncoras explícitas:
  //   mes=YYYY-MM      → 1º do mês indicado
  //   semana=YYYY-MM-DD → sábado final da janela (a janela é o domingo–sábado terminando nessa data)
  // Sem âncora, usamos MAX(Data) do recorte filtrado.
  let y, m, d
  if (periodo === 'mes' && /^\d{4}-\d{2}$/.test(req.query.mes || '')) {
    y = Number(req.query.mes.slice(0, 4))
    m = Number(req.query.mes.slice(5, 7))
    d = 1
  } else if (periodo === 'semana' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.semana || '')) {
    y = Number(req.query.semana.slice(0, 4))
    m = Number(req.query.semana.slice(5, 7))
    d = Number(req.query.semana.slice(8, 10))
  } else {
    const { sql: anchorWhere, params: anchorParams } = buildWhere(req.query)
    const anchor = db
      .prepare(`
        SELECT MAX(substr(v.Data,7,4)||substr(v.Data,4,2)||substr(v.Data,1,2)) AS k
        FROM vendas_2025 v
        ${anchorWhere}
      `)
      .get(anchorParams)

    if (!anchor?.k) return res.json([])

    y = Number(anchor.k.slice(0, 4))
    m = Number(anchor.k.slice(4, 6))
    d = Number(anchor.k.slice(6, 8))

    // Para 'semana', alinhamos a janela ao sábado da semana Dom-Sáb contendo
    // a âncora — assim o intervalo retornado bate com as opções do seletor
    // no frontend (todas começam num domingo).
    if (periodo === 'semana') {
      const anchorDate = new Date(Date.UTC(y, m - 1, d))
      const daysToSat = (6 - anchorDate.getUTCDay() + 7) % 7
      anchorDate.setUTCDate(anchorDate.getUTCDate() + daysToSat)
      y = anchorDate.getUTCFullYear()
      m = anchorDate.getUTCMonth() + 1
      d = anchorDate.getUTCDate()
    }
  }

  const pad = n => String(n).padStart(2, '0')
  const toKey = dt => `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`

  const days = []
  if (periodo === 'semana') {
    const end = new Date(Date.UTC(y, m - 1, d))
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(end)
      dt.setUTCDate(end.getUTCDate() - i)
      days.push(toKey(dt))
    }
  } else {
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
    for (let dd = 1; dd <= last; dd++) {
      days.push(`${y}${pad(m)}${pad(dd)}`)
    }
  }

  const startKey = days[0]
  const endKey = days[days.length - 1]

  const { sql: where, params } = buildWhere(req.query)
  const dateClause =
    `substr(v.Data,7,4)||substr(v.Data,4,2)||substr(v.Data,1,2) >= @windowStart AND ` +
    `substr(v.Data,7,4)||substr(v.Data,4,2)||substr(v.Data,1,2) <= @windowEnd`
  const finalWhere = where ? `${where} AND ${dateClause}` : `WHERE ${dateClause}`

  const rows = db
    .prepare(`
      SELECT
        substr(v.Data,7,4)||substr(v.Data,4,2)||substr(v.Data,1,2) AS dia,
        SUM(v.VL_Total_Liquido) AS vendaLiquida
      FROM vendas_2025 v
      ${finalWhere}
      GROUP BY dia
    `)
    .all({ ...params, windowStart: startKey, windowEnd: endKey })

  const map = new Map(rows.map(r => [r.dia, r.vendaLiquida]))
  res.json(days.map(k => ({ dia: k, vendaLiquida: map.get(k) || 0 })))
})

export default router
