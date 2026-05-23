// Builds a parameterized WHERE clause based on optional filters:
// filial, vendedor, inicio/fim (YYYY-MM-DD).
//
// The Data column is TEXT 'DD/MM/YYYY HH:MM:SS' — we rearrange it to YYYYMMDD
// so it can be compared lexicographically against the filter bounds.
//
// `columns` lets callers override which physical columns the filters apply to,
// since vendas_2025 uses COD_FILIAL/COD_VENDEDOR/Data and f_devolucoes_2025 uses
// Cod_Filial/Cod_Usur/Data. Set a column to null to skip that filter entirely
// (e.g. devolução has no reliable vendedor link).
export function buildWhere(
  { filial, vendedor, inicio, fim },
  {
    alias = 'v',
    columns = { filial: 'COD_FILIAL', vendedor: 'COD_VENDEDOR', data: 'Data' },
  } = {}
) {
  const where = []
  const params = {}

  if (filial && columns.filial) {
    where.push(`${alias}.${columns.filial} = @filial`)
    params.filial = Number(filial)
  }
  if (vendedor && columns.vendedor) {
    where.push(`${alias}.${columns.vendedor} = @vendedor`)
    params.vendedor = Number(vendedor)
  }
  if (inicio && columns.data) {
    where.push(`substr(${alias}.${columns.data},7,4)||substr(${alias}.${columns.data},4,2)||substr(${alias}.${columns.data},1,2) >= @inicioKey`)
    params.inicioKey = inicio.replaceAll('-', '')
  }
  if (fim && columns.data) {
    where.push(`substr(${alias}.${columns.data},7,4)||substr(${alias}.${columns.data},4,2)||substr(${alias}.${columns.data},1,2) <= @fimKey`)
    params.fimKey = fim.replaceAll('-', '')
  }

  return {
    sql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  }
}
