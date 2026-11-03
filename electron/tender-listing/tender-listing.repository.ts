import sql from 'mssql'
import { getLocalDbPool } from '../database/localdb.js'

export interface TenderListingInput {
  dateFrom: string
  dateTo: string
}

export interface TenderListingRow {
  checkNumber: string
  tenderType: string
  amount: number
  reference: string
  businessDate: string
}

function formatBusinessDate(value: unknown): string {
  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`
  }
  return String(value ?? '').slice(0, 10)
}

export async function getTenderListing(dateFrom: string, dateTo: string): Promise<TenderListingRow[]> {
  const pool = await getLocalDbPool()
  const result = await pool
    .request()
    .input('dtfrom', sql.Date, dateFrom)
    .input('dtto', sql.Date, dateTo)
    .query(`
      SELECT [checkNum], [TenderType], [Amount], [Reference], [businessdate]
      FROM [dbo].[v_TenderReference]
      WHERE [businessdate] BETWEEN @dtfrom AND @dtto
      ORDER BY [businessdate], [tendertype]
    `)

  return result.recordset.map((row) => ({
    checkNumber: String(row.checkNum ?? ''),
    tenderType: String(row.TenderType ?? ''),
    amount: Number(row.Amount ?? 0),
    reference: String(row.Reference ?? ''),
    businessDate: formatBusinessDate(row.businessdate),
  }))
}
