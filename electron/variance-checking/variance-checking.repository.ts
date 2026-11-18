import sql from 'mssql'
import { getHqDbPool } from '../database/hqdb.js'
import {
  bindDateRangesPredicate,
  splitDateRangeByHqPosted,
  type DateRangeChunk,
} from '../database/hybrid-date-split.js'
import { getLocalDbPool } from '../database/localdb.js'
import type {
  VarianceCheckingInput,
  VarianceCheckingRow,
} from './variance-checking.types.js'

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  const result = Number(value)
  return Number.isFinite(result) ? result : 0
}

function toDateString(value: unknown): string {
  if (!value) return ''
  if (value instanceof Date) {
    const y = value.getUTCFullYear()
    const m = String(value.getUTCMonth() + 1).padStart(2, '0')
    const d = String(value.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const date = new Date(value as string | number)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatReceiptDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${m}/${d}/${date.getFullYear()} ${h}:${min}`
}

async function queryLocalVarianceForRanges(
  ranges: DateRangeChunk[],
  employeeName?: string,
  workstation?: string,
): Promise<VarianceCheckingRow[]> {
  if (ranges.length === 0) return []

  const pool = await getLocalDbPool()
  const request = pool
    .request()
    .input('employeeName', sql.VarChar, employeeName ?? null)
    .input('workstation', sql.VarChar, workstation ?? null)
  const dateFilter = bindDateRangesPredicate(
    request,
    'BusinessDate',
    ranges,
    'locVar',
  )

  const result = await request.query(`
    SELECT CheckNumber AS checkNumber, BusinessDate AS businessDate,
      SUM(CASE WHEN Transtype='Item Sale' THEN NetSales+TaxCollected ELSE 0 END) AS gross,
      SUM(CASE WHEN Transtype='Tender' THEN amt ELSE 0 END) AS totalTender,
      SUM(CASE WHEN Transtype='Item Sale' THEN NetSales+TaxCollected ELSE 0 END)
      - SUM(CASE WHEN Transtype='Tender' THEN amt ELSE 0 END) AS variance
    FROM dbo.v_salesdetails
    WHERE Transtype IN ('Item Sale','Tender')
      AND ${dateFilter}
      AND (@employeeName IS NULL OR emp_name = @employeeName)
      AND (@workstation IS NULL OR Workstation = @workstation)
    GROUP BY BusinessDate, CheckNumber
    HAVING
      ABS(
        CAST(
          ROUND(
            SUM(CASE WHEN Transtype='Item Sale' THEN NetSales+TaxCollected ELSE 0 END)
            - SUM(CASE WHEN Transtype='Tender' THEN amt ELSE 0 END),
            2
          ) AS DECIMAL(18, 2)
        )
      ) > 0.01
    ORDER BY BusinessDate DESC, CheckNumber
  `)

  return result.recordset
    .map((row) => ({
      checkNumber: String(row.checkNumber ?? ''),
      businessDate: toDateString(row.businessDate),
      gross: toNumber(row.gross),
      totalTender: toNumber(row.totalTender),
      variance: toNumber(row.variance),
    }))
    .filter((row) => isRealVariance(row.variance))
}

async function queryHqVarianceForRanges(
  locationName: string,
  ranges: DateRangeChunk[],
  employeeName?: string,
  workstation?: string,
): Promise<VarianceCheckingRow[]> {
  if (ranges.length === 0) return []

  const pool = await getHqDbPool()
  const request = pool
    .request()
    .input('locationName', sql.VarChar(50), locationName)
    .input('employeeName', sql.VarChar(50), employeeName ?? null)
    .input('workstation', sql.VarChar(50), workstation ?? null)
  const dateFilter = bindDateRangesPredicate(
    request,
    'v.businessdate',
    ranges,
    'hqVar',
  )

  const result = await request.query(`
    SELECT
      COALESCE(
        NULLIF(LTRIM(RTRIM(CAST(f.checknum AS varchar(50)))), ''),
        CAST(v.GUESTCHECKID AS varchar(50))
      ) AS checkNumber,
      v.businessdate AS businessDate,
      SUM(CASE WHEN v.TRANSACTIONTYPE = 'Item Sale' THEN v.NetSales + v.TaxCollected ELSE 0 END) AS gross,
      SUM(CASE WHEN v.TRANSACTIONTYPE = 'Tender' THEN v.LINETOTAL ELSE 0 END) AS totalTender,
      SUM(CASE WHEN v.TRANSACTIONTYPE = 'Item Sale' THEN v.NetSales + v.TaxCollected ELSE 0 END)
      - SUM(CASE WHEN v.TRANSACTIONTYPE = 'Tender' THEN v.LINETOTAL ELSE 0 END) AS variance
    FROM dbo.v_salesdetails v
    OUTER APPLY (
      SELECT TOP 1 checknum
      FROM dbo.FCR_INVOICE_DATA f
      WHERE f.guestcheckid = v.GUESTCHECKID
        AND f.locationame = v.locationname
        AND f.Businessdate = v.businessdate
    ) f
    WHERE v.locationname = @locationName
      AND v.TRANSACTIONTYPE IN ('Item Sale', 'Tender')
      AND ${dateFilter}
      AND (@employeeName IS NULL OR v.CHECKEMPNAME = @employeeName)
      AND (@workstation IS NULL OR v.uwsid = @workstation)
    GROUP BY v.businessdate, v.GUESTCHECKID, f.checknum
    HAVING
      ABS(
        CAST(
          ROUND(
            SUM(CASE WHEN v.TRANSACTIONTYPE = 'Item Sale' THEN v.NetSales + v.TaxCollected ELSE 0 END)
            - SUM(CASE WHEN v.TRANSACTIONTYPE = 'Tender' THEN v.LINETOTAL ELSE 0 END),
            2
          ) AS DECIMAL(18, 2)
        )
      ) > 0.01
    ORDER BY v.businessdate DESC, checkNumber
  `)

  return result.recordset
    .map((row) => ({
      checkNumber: String(row.checkNumber ?? ''),
      businessDate: toDateString(row.businessDate),
      gross: toNumber(row.gross),
      totalTender: toNumber(row.totalTender),
      variance: toNumber(row.variance),
    }))
    .filter((row) => isRealVariance(row.variance))
}

function isRealVariance(variance: number): boolean {
  return Math.abs(Math.round(variance * 100)) > 1
}

export async function getVarianceRows(
  input: VarianceCheckingInput,
): Promise<VarianceCheckingRow[]> {
  const split = await splitDateRangeByHqPosted(input.dateFrom, input.dateTo, {
    sourceTable: 'v_salesdetails',
  })

  let hqRows: VarianceCheckingRow[] = []
  let localRanges = split.localRanges

  if (split.hqRanges.length > 0 && split.locationName) {
    try {
      hqRows = await queryHqVarianceForRanges(
        split.locationName,
        split.hqRanges,
        input.employeeName,
        input.workstation,
      )
    } catch (error) {
      console.warn(
        'HQDB getVarianceRows failed; falling back to LocalDB:',
        error,
      )
      hqRows = []
      localRanges = [{ from: input.dateFrom, to: input.dateTo }]
    }
  }

  const localRows = await queryLocalVarianceForRanges(
    localRanges,
    input.employeeName,
    input.workstation,
  )

  return [...hqRows, ...localRows]
    .filter((row) => isRealVariance(row.variance))
    .sort((a, b) => {
      const dateCompare = b.businessDate.localeCompare(a.businessDate)
      if (dateCompare !== 0) return dateCompare
      return a.checkNumber.localeCompare(b.checkNumber, undefined, { numeric: true })
    })
}

export async function getVarianceReceipt(checkNumber: string): Promise<string[]> {
  const pool = await getLocalDbPool()
  const result = await pool
    .request()
    .input('checkNumber', sql.Int, Number(checkNumber))
    .query(`
      SELECT checkNum, transDateTime, journalText
      FROM dbo.POS_JOURNAL_LOG
      WHERE checkNum=@checkNumber AND type IN (128,5)
      ORDER BY transDateTime
    `)
  const lines: string[] = []
  let last = ''
  for (const row of result.recordset) {
    const current = String(row.checkNum ?? '')
    const raw = String(row.journalText ?? '')
    const dt = row.transDateTime ? new Date(row.transDateTime) : null
    if (last !== current) {
      if (last !== '') {
        lines.push('='.repeat(60))
        lines.push('')
      }
      lines.push(`CHECK #: ${current} (VARIANCE)`)
      if (dt) lines.push(`Date/Time: ${formatReceiptDate(dt)}`)
      lines.push('-'.repeat(60))
    }
    lines.push(...raw.split(/\r?\n/))
    last = current
  }
  if (lines.length === 0) {
    lines.push(`No receipt data found for Check #: ${checkNumber}`)
  }
  return lines
}
