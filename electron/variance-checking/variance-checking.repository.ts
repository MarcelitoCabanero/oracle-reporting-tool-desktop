import sql from 'mssql'
import { getLocalDbPool } from '../database/localdb.js'
import type { VarianceCheckingInput, VarianceCheckingRow } from './variance-checking.types.js'

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}
function toDateString(value: unknown): string {
  if (!value) return ''
  const date = new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) return ''
  const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,'0'), d=String(date.getDate()).padStart(2,'0')
  return `${y}-${m}-${d}`
}
function formatReceiptDate(date: Date): string {
  const m=String(date.getMonth()+1).padStart(2,'0'), d=String(date.getDate()).padStart(2,'0')
  const h=String(date.getHours()).padStart(2,'0'), min=String(date.getMinutes()).padStart(2,'0')
  return `${m}/${d}/${date.getFullYear()} ${h}:${min}`
}
export async function getVarianceRows(input: VarianceCheckingInput): Promise<VarianceCheckingRow[]> {
  const pool=await getLocalDbPool()
  const result=await pool.request()
    .input('fromDate',sql.Date,input.dateFrom)
    .input('toDate',sql.Date,input.dateTo)
    .query(`
      SELECT CheckNumber AS checkNumber, BusinessDate AS businessDate,
        SUM(CASE WHEN Transtype='Item Sale' THEN NetSales+TaxCollected ELSE 0 END) AS gross,
        SUM(CASE WHEN Transtype='Tender' THEN amt ELSE 0 END) AS totalTender,
        SUM(CASE WHEN Transtype='Item Sale' THEN NetSales+TaxCollected ELSE 0 END)
        - SUM(CASE WHEN Transtype='Tender' THEN amt ELSE 0 END) AS variance
      FROM dbo.v_salesdetails
      WHERE Transtype IN ('Item Sale','Tender')
        AND BusinessDate BETWEEN @fromDate AND @toDate
      GROUP BY BusinessDate, CheckNumber
      HAVING SUM(CASE WHEN Transtype='Item Sale' THEN NetSales+TaxCollected ELSE 0 END)
        - SUM(CASE WHEN Transtype='Tender' THEN amt ELSE 0 END) <> 0
      ORDER BY BusinessDate DESC, CheckNumber
    `)
  return result.recordset.map(row=>({
    checkNumber:String(row.checkNumber??''), businessDate:toDateString(row.businessDate),
    gross:toNumber(row.gross), totalTender:toNumber(row.totalTender), variance:toNumber(row.variance),
  }))
}
export async function getVarianceReceipt(checkNumber: string): Promise<string[]> {
  const pool=await getLocalDbPool()
  const result=await pool.request().input('checkNumber',sql.Int,Number(checkNumber)).query(`
    SELECT checkNum, transDateTime, journalText
    FROM dbo.POS_JOURNAL_LOG
    WHERE checkNum=@checkNumber AND type IN (128,5)
    ORDER BY transDateTime
  `)
  const lines:string[]=[]; let last=''
  for(const row of result.recordset){
    const current=String(row.checkNum??''), raw=String(row.journalText??'')
    const dt=row.transDateTime?new Date(row.transDateTime):null
    if(last!==current){
      if(last!==''){lines.push('='.repeat(60));lines.push('')}
      lines.push(`CHECK #: ${current} (VARIANCE)`)
      if(dt) lines.push(`Date/Time: ${formatReceiptDate(dt)}`)
      lines.push('-'.repeat(60))
    }
    lines.push(...raw.split(/\r?\n/)); last=current
  }
  if(lines.length===0) lines.push(`No receipt data found for Check #: ${checkNumber}`)
  return lines
}
