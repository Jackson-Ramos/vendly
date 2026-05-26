import { Router } from 'express'
import db from '../db.js'
import { buildWhere } from '../filters.js'

const router = Router()

// Calcula o nº de meses (com casas decimais) da janela de análise.
// Quando o usuário não fixa inicio/fim, caímos para o intervalo coberto pelos
// dados de vendas — assim métricas de média mensal continuam fazendo sentido.
function resolvePeriodo({ inicio, fim }) {
  let ini = inicio
  let fi = fim
  if (!ini || !fi) {
    const row = db
      .prepare(`
        SELECT
          MIN(substr(Data,7,4)||'-'||substr(Data,4,2)||'-'||substr(Data,1,2)) AS dMin,
          MAX(substr(Data,7,4)||'-'||substr(Data,4,2)||'-'||substr(Data,1,2)) AS dMax
        FROM vendas_2025
      `)
      .get()
    ini = ini || row?.dMin
    fi  = fi  || row?.dMax
  }
  if (!ini || !fi) return { inicio: ini, fim: fi, meses: 1 }
  const dIni = new Date(ini + 'T00:00:00Z')
  const dFim = new Date(fi  + 'T00:00:00Z')
  const days = Math.max(1, (dFim - dIni) / 86400000 + 1)
  return { inicio: ini, fim: fi, meses: days / 30.4375 }
}

router.get('/ranking', (req, res) => {
  const periodo = resolvePeriodo(req.query)

  // Filtros de período aplicam só em compras/vendas/devoluções "do período".
  // Para o estoque virtual usamos os totais acumulados (sem janela de data) —
  // só filial, porque queremos o saldo "até hoje", não a movimentação do recorte.
  // Dimensão fornecedor sempre vem de Produtos.Cod_Fab (decisão acordada:
  // atribuir desempenho ao fornecedor atual do SKU, mesmo em compras passadas).
  const wVendasPer = buildWhere(req.query, {
    alias: 'v',
    columns: { filial: 'COD_FILIAL', vendedor: null, data: 'Data' },
  })
  const wComprasPer = buildWhere(req.query, {
    alias: 'c',
    columns: { filial: 'COD_FILIAL', vendedor: null, data: 'DATA_ENTRADA' },
  })
  const wDevPer = buildWhere(req.query, {
    alias: 'd',
    columns: { filial: 'Cod_Filial', vendedor: null, data: 'Data' },
  })
  // Versões só com filial (sem data) — para estoque virtual acumulado.
  const wVendasTot = buildWhere(
    { filial: req.query.filial },
    { alias: 'v', columns: { filial: 'COD_FILIAL', vendedor: null, data: null } },
  )
  const wComprasTot = buildWhere(
    { filial: req.query.filial },
    { alias: 'c', columns: { filial: 'COD_FILIAL', vendedor: null, data: null } },
  )
  const wDevTot = buildWhere(
    { filial: req.query.filial },
    { alias: 'd', columns: { filial: 'Cod_Filial', vendedor: null, data: null } },
  )

  // Estratégia: CTEs por fonte (período e total), depois LEFT JOIN contra
  // Fornecedor. Estoque virtual = compras_total + devolucoes_total - vendas_total
  // (devolução de venda é cliente retornando mercadoria, volta ao estoque).
  // Para ruptura/parados, agregamos primeiro por SKU e depois por fornecedor.
  const sql = `
    WITH compras_per AS (
      SELECT p.Cod_Fab AS codFab, SUM(c.QUANTIDADE) AS qtd, SUM(c.VALOR_TOTAL) AS valor
      FROM f_compras_2025 c
      INNER JOIN Produtos p ON p.Cod_Prod = c.CODPROD
      ${wComprasPer.sql}
      GROUP BY p.Cod_Fab
    ),
    vendas_per AS (
      SELECT p.Cod_Fab AS codFab, SUM(v.QUANTIDADE) AS qtd, SUM(v.VL_Total_Liquido) AS valor
      FROM vendas_2025 v
      INNER JOIN Produtos p ON p.Cod_Prod = v.COD_PROD
      ${wVendasPer.sql}
      GROUP BY p.Cod_Fab
    ),
    dev_per AS (
      SELECT p.Cod_Fab AS codFab, SUM(d.QUANTIDADE) AS qtd, SUM(d.VL_Total) AS valor
      FROM f_devolucoes_2025 d
      INNER JOIN Produtos p ON p.Cod_Prod = d.CodProd
      ${wDevPer.sql}
      GROUP BY p.Cod_Fab
    ),
    -- Estoque virtual por SKU (filtrado só por filial — saldo "até hoje"):
    -- compras + devoluções - vendas acumuladas. Permite contar ruptura/parados.
    estoque_sku AS (
      SELECT
        p.Cod_Prod AS codProd,
        p.Cod_Fab  AS codFab,
        (COALESCE(c.q, 0) + COALESCE(d.q, 0) - COALESCE(v.q, 0)) AS qtd
      FROM Produtos p
      LEFT JOIN (
        SELECT c.CODPROD AS codProd, SUM(c.QUANTIDADE) AS q
        FROM f_compras_2025 c ${wComprasTot.sql}
        GROUP BY c.CODPROD
      ) c ON c.codProd = p.Cod_Prod
      LEFT JOIN (
        SELECT v.COD_PROD AS codProd, SUM(v.QUANTIDADE) AS q
        FROM vendas_2025 v ${wVendasTot.sql}
        GROUP BY v.COD_PROD
      ) v ON v.codProd = p.Cod_Prod
      LEFT JOIN (
        SELECT d.CodProd AS codProd, SUM(d.QUANTIDADE) AS q
        FROM f_devolucoes_2025 d ${wDevTot.sql}
        GROUP BY d.CodProd
      ) d ON d.codProd = p.Cod_Prod
      WHERE p.Cod_Fab IS NOT NULL
        AND (COALESCE(c.q, 0) > 0 OR COALESCE(v.q, 0) > 0 OR COALESCE(d.q, 0) > 0)
    ),
    vendidos_na_janela AS (
      SELECT DISTINCT v.COD_PROD AS codProd
      FROM vendas_2025 v ${wVendasPer.sql}
    ),
    agg_estoque AS (
      SELECT
        es.codFab AS codFab,
        SUM(es.qtd)                                                      AS qtd,
        COUNT(DISTINCT CASE WHEN es.qtd > 0 THEN es.codProd END)         AS skusComEstoque,
        COUNT(DISTINCT CASE WHEN es.qtd <= 0 AND vj.codProd IS NOT NULL
                            THEN es.codProd END)                         AS skusRuptura,
        COUNT(DISTINCT CASE WHEN es.qtd > 0 AND vj.codProd IS NULL
                            THEN es.codProd END)                         AS skusParados
      FROM estoque_sku es
      LEFT JOIN vendidos_na_janela vj ON vj.codProd = es.codProd
      GROUP BY es.codFab
    )
    SELECT
      f.Soma_de_Cod_Fabric              AS codFornec,
      f.DESCRICAO                       AS fornecedor,
      COALESCE(cp.qtd, 0)               AS qtdComprada,
      COALESCE(cp.valor, 0)             AS valorComprado,
      COALESCE(vp.qtd, 0)               AS qtdVendida,
      COALESCE(vp.valor, 0)             AS valorVendido,
      COALESCE(dp.qtd, 0)               AS qtdDevolvida,
      COALESCE(dp.valor, 0)             AS valorDevolvido,
      COALESCE(ae.qtd, 0)               AS estoqueVirtual,
      COALESCE(ae.skusComEstoque, 0)    AS skusComEstoque,
      COALESCE(ae.skusRuptura, 0)       AS skusRuptura,
      COALESCE(ae.skusParados, 0)       AS skusParados
    FROM Fornecedor f
    LEFT JOIN compras_per  cp ON cp.codFab = f.Soma_de_Cod_Fabric
    LEFT JOIN vendas_per   vp ON vp.codFab = f.Soma_de_Cod_Fabric
    LEFT JOIN dev_per      dp ON dp.codFab = f.Soma_de_Cod_Fabric
    LEFT JOIN agg_estoque  ae ON ae.codFab = f.Soma_de_Cod_Fabric
    WHERE COALESCE(cp.qtd, 0) > 0
       OR COALESCE(vp.qtd, 0) > 0
       OR COALESCE(dp.qtd, 0) > 0
       OR COALESCE(ae.qtd, 0) <> 0
  `

  const params = {
    ...wVendasPer.params,
    ...wComprasPer.params,
    ...wDevPer.params,
    ...wVendasTot.params,
    ...wComprasTot.params,
    ...wDevTot.params,
  }

  const rows = db.prepare(sql).all(params)

  const enriched = rows.map(r => {
    const mediaMensalQtd    = periodo.meses > 0 ? r.qtdVendida   / periodo.meses : 0
    const mediaMensalValor  = periodo.meses > 0 ? r.valorVendido / periodo.meses : 0
    const coberturaMeses    = mediaMensalQtd > 0 && r.estoqueVirtual > 0
                                ? r.estoqueVirtual / mediaMensalQtd
                                : null
    const sellThrough       = r.qtdComprada > 0 ? r.qtdVendida / r.qtdComprada : null
    const pctDevolucao      = r.valorVendido > 0 ? (r.valorDevolvido / r.valorVendido) * 100 : 0
    const margemValor       = r.valorVendido - r.valorComprado
    const margemPct         = r.valorVendido > 0 ? (margemValor / r.valorVendido) * 100 : null

    return {
      ...r,
      mediaMensalQtd,
      mediaMensalValor,
      coberturaMeses,
      sellThrough,
      pctDevolucao,
      margemValor,
      margemPct,
    }
  })

  enriched.sort((a, b) => b.valorVendido - a.valorVendido)

  res.json({
    periodo: {
      inicio: periodo.inicio,
      fim: periodo.fim,
      meses: Number(periodo.meses.toFixed(2)),
    },
    fornecedores: enriched,
  })
})

router.get('/:codFornec/detalhes', (req, res) => {
  const codFornec = Number(req.params.codFornec)
  if (!Number.isFinite(codFornec)) {
    return res.status(400).json({ error: 'codFornec inválido' })
  }

  // Filtros (sem vendedor) por tabela.
  const wVendasPer = buildWhere(req.query, {
    alias: 'v',
    columns: { filial: 'COD_FILIAL', vendedor: null, data: 'Data' },
  })
  const wComprasPer = buildWhere(req.query, {
    alias: 'c',
    columns: { filial: 'COD_FILIAL', vendedor: null, data: 'DATA_ENTRADA' },
  })
  const wVendasTot = buildWhere(
    { filial: req.query.filial },
    { alias: 'v', columns: { filial: 'COD_FILIAL', vendedor: null, data: null } },
  )
  const wComprasTot = buildWhere(
    { filial: req.query.filial },
    { alias: 'c', columns: { filial: 'COD_FILIAL', vendedor: null, data: null } },
  )
  const wDevTot = buildWhere(
    { filial: req.query.filial },
    { alias: 'd', columns: { filial: 'Cod_Filial', vendedor: null, data: null } },
  )

  const fornecedorParams = { codFornec }
  const fornec = db
    .prepare(`SELECT Soma_de_Cod_Fabric AS codFornec, DESCRICAO AS fornecedor FROM Fornecedor WHERE Soma_de_Cod_Fabric = @codFornec`)
    .get(fornecedorParams)
  if (!fornec) return res.status(404).json({ error: 'Fornecedor não encontrado' })

  // Evolução mensal: compras vs vendas no período do filtro.
  const wComprasMes = wComprasPer.sql
    ? `${wComprasPer.sql} AND p.Cod_Fab = @codFornec`
    : `WHERE p.Cod_Fab = @codFornec`
  const wVendasMes = wVendasPer.sql
    ? `${wVendasPer.sql} AND p.Cod_Fab = @codFornec`
    : `WHERE p.Cod_Fab = @codFornec`

  const comprasMensal = db
    .prepare(`
      SELECT substr(c.DATA_ENTRADA,7,4)||'-'||substr(c.DATA_ENTRADA,4,2) AS mes,
             SUM(c.QUANTIDADE)  AS qtd,
             SUM(c.VALOR_TOTAL) AS valor
      FROM f_compras_2025 c
      INNER JOIN Produtos p ON p.Cod_Prod = c.CODPROD
      ${wComprasMes}
      GROUP BY mes
    `)
    .all({ ...wComprasPer.params, ...fornecedorParams })

  const vendasMensal = db
    .prepare(`
      SELECT substr(v.Data,7,4)||'-'||substr(v.Data,4,2) AS mes,
             SUM(v.QUANTIDADE)       AS qtd,
             SUM(v.VL_Total_Liquido) AS valor
      FROM vendas_2025 v
      INNER JOIN Produtos p ON p.Cod_Prod = v.COD_PROD
      ${wVendasMes}
      GROUP BY mes
    `)
    .all({ ...wVendasPer.params, ...fornecedorParams })

  // Combina os dois em uma linha por mês ordenada.
  const mesesSet = new Set([...comprasMensal.map(r => r.mes), ...vendasMensal.map(r => r.mes)])
  const compraMap = new Map(comprasMensal.map(r => [r.mes, r]))
  const vendaMap  = new Map(vendasMensal.map(r => [r.mes, r]))
  const evolucao = [...mesesSet]
    .sort()
    .map(mes => ({
      mes,
      qtdComprada:    compraMap.get(mes)?.qtd   || 0,
      valorComprado:  compraMap.get(mes)?.valor || 0,
      qtdVendida:     vendaMap.get(mes)?.qtd    || 0,
      valorVendido:   vendaMap.get(mes)?.valor  || 0,
    }))

  // SKUs do fornecedor com agregações acumuladas + vendas no período.
  // Permite identificar top giro, parados e ruptura sem segundo round-trip.
  const skusSql = `
    WITH compras_tot AS (
      SELECT c.CODPROD AS codProd, SUM(c.QUANTIDADE) AS qtd
      FROM f_compras_2025 c
      INNER JOIN Produtos p ON p.Cod_Prod = c.CODPROD
      ${wComprasTot.sql ? `${wComprasTot.sql} AND p.Cod_Fab = @codFornec` : `WHERE p.Cod_Fab = @codFornec`}
      GROUP BY c.CODPROD
    ),
    vendas_tot AS (
      SELECT v.COD_PROD AS codProd, SUM(v.QUANTIDADE) AS qtd
      FROM vendas_2025 v
      INNER JOIN Produtos p ON p.Cod_Prod = v.COD_PROD
      ${wVendasTot.sql ? `${wVendasTot.sql} AND p.Cod_Fab = @codFornec` : `WHERE p.Cod_Fab = @codFornec`}
      GROUP BY v.COD_PROD
    ),
    dev_tot AS (
      SELECT d.CodProd AS codProd, SUM(d.QUANTIDADE) AS qtd
      FROM f_devolucoes_2025 d
      INNER JOIN Produtos p ON p.Cod_Prod = d.CodProd
      ${wDevTot.sql ? `${wDevTot.sql} AND p.Cod_Fab = @codFornec` : `WHERE p.Cod_Fab = @codFornec`}
      GROUP BY d.CodProd
    ),
    vendas_per AS (
      SELECT v.COD_PROD AS codProd, SUM(v.QUANTIDADE) AS qtd, SUM(v.VL_Total_Liquido) AS valor
      FROM vendas_2025 v
      INNER JOIN Produtos p ON p.Cod_Prod = v.COD_PROD
      ${wVendasPer.sql ? `${wVendasPer.sql} AND p.Cod_Fab = @codFornec` : `WHERE p.Cod_Fab = @codFornec`}
      GROUP BY v.COD_PROD
    )
    SELECT
      p.Cod_Prod         AS codProd,
      p.DESC_COMPLETA    AS produto,
      COALESCE(ct.qtd, 0) AS qtdComprada,
      COALESCE(vt.qtd, 0) AS qtdVendidaTot,
      COALESCE(dt.qtd, 0) AS qtdDevolvida,
      (COALESCE(ct.qtd, 0) + COALESCE(dt.qtd, 0) - COALESCE(vt.qtd, 0)) AS estoqueVirtual,
      COALESCE(vp.qtd, 0)   AS qtdVendidaPer,
      COALESCE(vp.valor, 0) AS valorVendidoPer
    FROM Produtos p
    LEFT JOIN compras_tot ct ON ct.codProd = p.Cod_Prod
    LEFT JOIN vendas_tot  vt ON vt.codProd = p.Cod_Prod
    LEFT JOIN dev_tot     dt ON dt.codProd = p.Cod_Prod
    LEFT JOIN vendas_per  vp ON vp.codProd = p.Cod_Prod
    WHERE p.Cod_Fab = @codFornec
      AND (COALESCE(ct.qtd, 0) > 0 OR COALESCE(vt.qtd, 0) > 0 OR COALESCE(dt.qtd, 0) > 0)
  `

  const skus = db
    .prepare(skusSql)
    .all({
      ...wComprasTot.params,
      ...wVendasTot.params,
      ...wDevTot.params,
      ...wVendasPer.params,
      ...fornecedorParams,
    })

  // Particiona em buckets. Top giro = vendidos no período (decrescente).
  // Parados = estoque virtual > 0 e SEM venda no período.
  // Ruptura = estoque virtual ≤ 0 e COM venda no período (perdendo venda).
  const topGiro = skus
    .filter(s => s.qtdVendidaPer > 0)
    .sort((a, b) => b.qtdVendidaPer - a.qtdVendidaPer)
    .slice(0, 10)

  const parados = skus
    .filter(s => s.estoqueVirtual > 0 && s.qtdVendidaPer === 0)
    .sort((a, b) => b.estoqueVirtual - a.estoqueVirtual)
    .slice(0, 10)

  const ruptura = skus
    .filter(s => s.estoqueVirtual <= 0 && s.qtdVendidaPer > 0)
    .sort((a, b) => b.qtdVendidaPer - a.qtdVendidaPer)
    .slice(0, 10)

  res.json({
    fornecedor: fornec,
    evolucao,
    topGiro,
    parados,
    ruptura,
  })
})

export default router
