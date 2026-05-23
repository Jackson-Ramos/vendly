import { Router } from 'express'
import db from '../db.js'

const router = Router()

const filiaisStmt = db.prepare(`
  SELECT DISTINCT f.Cod_Filial AS cod, f.Filial AS nome
  FROM Filial f
  INNER JOIN vendas_2025 v ON v.COD_FILIAL = f.Cod_Filial
  ORDER BY f.Filial
`)

const vendedoresStmt = db.prepare(`
  SELECT DISTINCT u.CodVend AS cod, u.VENDEDOR AS nome
  FROM Usur u
  INNER JOIN vendas_2025 v ON v.COD_VENDEDOR = u.CodVend
  ORDER BY u.VENDEDOR
`)

const rangeStmt = db.prepare(`
  SELECT
    MIN(substr(Data,7,4)||'-'||substr(Data,4,2)||'-'||substr(Data,1,2)) AS dataMin,
    MAX(substr(Data,7,4)||'-'||substr(Data,4,2)||'-'||substr(Data,1,2)) AS dataMax
  FROM vendas_2025
`)

router.get('/', (req, res) => {
  res.json({
    filiais: filiaisStmt.all(),
    vendedores: vendedoresStmt.all(),
    ...rangeStmt.get(),
  })
})

export default router
