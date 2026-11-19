import sql from 'mssql'

import { getHqDbPool } from '../database/hqdb.js'
import {
  bindDateRangesPredicate,
  normalizeSqlDate,
  splitDateRangeByHqPosted,
  type DateRangeChunk,
} from '../database/hybrid-date-split.js'
import { getLocalDbPool } from '../database/localdb.js'

import type {
  CancelItemRow,
  VoidSummaryInput,
  VoidSummaryResult,
  VoidTransactionItem,
} from './void-summary.types.js'

interface RawInvoiceRow {
  fcrInvNum: string
  checkNum: string
  posName: string
  businessDate: string
  transDatetime: Date | null
  grossSale: number
}

const NO_WARNING_LOSS =
  'HQ database could not be reached. Showing available Local POS data only (purged historical dates may be incomplete).'

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value as string)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatTimestamp(d: Date | null): string {
  if (!d) return ''
  return d.toISOString().replace('T', ' ').substring(0, 19)
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m < 60) return `${m}m ${String(s).padStart(2, '0')}s`
  const h = Math.floor(m / 60)
  return `${h}h ${String(m % 60).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

async function queryLocalInvoices(ranges: DateRangeChunk[]): Promise<RawInvoiceRow[]> {
  if (ranges.length === 0) return []

  const pool = await getLocalDbPool()
  const request = pool.request()
  const dateFilter = bindDateRangesPredicate(
    request,
    'CAST(f.MicrosBsnzDate AS date)',
    ranges,
    'locVoid',
  )
  const dateFilterSub = bindDateRangesPredicate(
    request,
    'CAST(MicrosBsnzDate AS date)',
    ranges,
    'locVoidSub',
  )

  const result = await request.query(`
    SELECT
      f.FCRInvNumber AS fcrInvNum,
      f.MicrosChkNum AS checkNum,
      ISNULL(uw.posname, CAST(f.PCWSID AS varchar(20))) AS posName,
      CAST(f.MicrosBsnzDate AS date) AS businessDate,
      f.FCRBsnzDate AS transDatetime,
      f.Subtotal14 AS grossSale
    FROM dbo.FCR_INVOICE_DATA f
    LEFT JOIN dbo.dts_workstation uw ON f.PCWSID = uw.pcwsid
    WHERE f.FCRInvNumber IN (
        SELECT FCRInvNumber
        FROM dbo.FCR_INVOICE_DATA
        WHERE ${dateFilterSub}
          AND ISNULL(FCRInvNumber, '') <> ''
        GROUP BY FCRInvNumber
        HAVING COUNT(*) > 1
      )
      AND ${dateFilter}
      AND ISNULL(f.FCRInvNumber, '') <> ''
    ORDER BY f.FCRInvNumber, f.FCRBsnzDate ASC
  `)

  return result.recordset.map((row) => ({
    fcrInvNum: String(row.fcrInvNum ?? '').trim(),
    checkNum: String(row.checkNum ?? '').trim(),
    posName: String(row.posName ?? '').trim(),
    businessDate: normalizeSqlDate(row.businessDate),
    transDatetime: toDate(row.transDatetime),
    grossSale: toNumber(row.grossSale),
  }))
}

async function queryHqInvoices(
  locationName: string,
  ranges: DateRangeChunk[],
): Promise<RawInvoiceRow[]> {
  if (ranges.length === 0) return []

  const pool = await getHqDbPool()
  const request = pool.request()
  request.input('locationName', sql.VarChar(50), locationName)
  const dateFilter = bindDateRangesPredicate(request, 'Businessdate', ranges, 'hqVoid')
  const dateFilterSub = bindDateRangesPredicate(request, 'Businessdate', ranges, 'hqVoidSub')

  const result = await request.query(`
    SELECT
      FCRINVNUM AS fcrInvNum,
      checknum AS checkNum,
      posname AS posName,
      CAST(Businessdate AS date) AS businessDate,
      Transdatetime AS transDatetime,
      GrossSale AS grossSale
    FROM dbo.FCR_INVOICE_DATA
    WHERE FCRINVNUM IN (
        SELECT FCRINVNUM
        FROM dbo.FCR_INVOICE_DATA
        WHERE ${dateFilterSub}
          AND locationame = @locationName
          AND FCRINVNUM <> ''
        GROUP BY FCRINVNUM
        HAVING COUNT(*) > 1
      )
      AND ${dateFilter}
      AND locationame = @locationName
      AND FCRINVNUM <> ''
    ORDER BY FCRINVNUM, Transdatetime ASC
  `)

  return result.recordset.map((row) => ({
    fcrInvNum: String(row.fcrInvNum ?? '').trim(),
    checkNum: String(row.checkNum ?? '').trim(),
    posName: String(row.posName ?? '').trim(),
    businessDate: normalizeSqlDate(row.businessDate),
    transDatetime: toDate(row.transDatetime),
    grossSale: toNumber(row.grossSale),
  }))
}

async function queryLocalCancelItems(ranges: DateRangeChunk[]): Promise<CancelItemRow[]> {
  if (ranges.length === 0) return []

  const pool = await getLocalDbPool()
  const request = pool.request()
  const dateFilter = bindDateRangesPredicate(request, 'BusinessDate', ranges, 'locCancel')

  const result = await request.query(`
    SELECT
      BusinessDate AS businessDate,
      sys_datetime AS transDatetime,
      FCRInvNumber AS fcrInvNum,
      CheckNumber AS checkNum,
      ObjectNumber AS itemNumber,
      itemname AS itemName,
      qty,
      amt
    FROM dbo.v_salesdetails
    WHERE ${dateFilter}
      AND Transtype = 'Item Sale'
      AND amt < 0
      AND ISNULL(FCRInvNumber, '') <> ''
    ORDER BY CheckNumber, sys_datetime ASC
  `)

  return result.recordset.map((row) => mapCancelRow(row))
}

async function queryHqCancelItems(
  locationName: string,
  ranges: DateRangeChunk[],
): Promise<CancelItemRow[]> {
  if (ranges.length === 0) return []

  const pool = await getHqDbPool()
  const request = pool.request()
  request.input('locationName', sql.VarChar(50), locationName)
  const dateFilter = bindDateRangesPredicate(request, 'v.businessdate', ranges, 'hqCancel')

  const result = await request.query(`
    SELECT
      v.businessdate AS businessDate,
      v.transdatetime AS transDatetime,
      v.FCRINVNUM AS fcrInvNum,
      f.checknum AS checkNum,
      v.ITEMNUMBER AS itemNumber,
      v.ITEMNAME AS itemName,
      v.LINECOUNT AS qty,
      v.LINETOTAL AS amt
    FROM dbo.v_salesdetails v
    OUTER APPLY (
      SELECT TOP 1 checknum
      FROM dbo.FCR_INVOICE_DATA f
      WHERE v.GUESTCHECKID = f.guestcheckid
        AND v.locationname = f.locationame
    ) f
    WHERE ${dateFilter}
      AND v.locationname = @locationName
      AND v.FCRINVNUM <> ''
      AND v.TRANSACTIONTYPE = 'Item Sale'
      AND v.LINETOTAL < 0
    ORDER BY v.GUESTCHECKID, v.transdatetime ASC
  `)

  return result.recordset.map((row) => mapCancelRow(row))
}

function mapCancelRow(row: Record<string, unknown>): CancelItemRow {
  return {
    businessDate: normalizeSqlDate(row.businessDate),
    transDatetime: formatTimestamp(toDate(row.transDatetime)),
    fcrInvNum: String(row.fcrInvNum ?? '').trim(),
    checkNum: row.checkNum != null && String(row.checkNum).trim() !== '' ? String(row.checkNum).trim() : '-',
    itemNumber: String(row.itemNumber ?? '').trim(),
    itemName: String(row.itemName ?? '').trim(),
    lineCount: Math.abs(toNumber(row.qty)),
    lineTotal: Math.abs(toNumber(row.amt)),
  }
}

function buildVoidItems(rows: RawInvoiceRow[]): VoidTransactionItem[] {
  const grouped = new Map<string, RawInvoiceRow[]>()
  for (const row of rows) {
    if (!row.fcrInvNum) continue
    const list = grouped.get(row.fcrInvNum) ?? []
    list.push(row)
    grouped.set(row.fcrInvNum, list)
  }

  const items: VoidTransactionItem[] = []
  for (const [invNum, list] of grouped.entries()) {
    list.sort((a, b) => (a.transDatetime?.getTime() ?? 0) - (b.transDatetime?.getTime() ?? 0))
    const first = list[0]
    const last = list[list.length - 1]
    // Only genuine voids: the same invoice number recorded more than once.
    if (list.length < 2) continue

    const diffMs = Math.max(
      0,
      (last.transDatetime?.getTime() ?? 0) - (first.transDatetime?.getTime() ?? 0),
    )
    const intervalSeconds = Math.round(diffMs / 1000)

    items.push({
      fcrInvNum: invNum,
      checkNum: first.checkNum || last.checkNum || '-',
      posName: first.posName || last.posName || '-',
      businessDate: first.businessDate,
      startTime: formatTimestamp(first.transDatetime),
      voidTime: formatTimestamp(last.transDatetime),
      intervalSeconds,
      intervalFormatted: formatDuration(intervalSeconds),
      voidAmount: Math.max(...list.map((r) => Math.abs(r.grossSale))),
      transactionCount: list.length,
      records: list.map((r) => ({
        transdatetime: formatTimestamp(r.transDatetime),
        grossSale: r.grossSale,
        posname: r.posName,
        checknum: r.checkNum,
      })),
    })
  }

  items.sort((a, b) => b.startTime.localeCompare(a.startTime))
  return items
}

export async function loadVoidSummaryReportData(
  input: VoidSummaryInput,
): Promise<Omit<VoidSummaryResult, 'success' | 'message'>> {
  const split = await splitDateRangeByHqPosted(input.dateFrom, input.dateTo, {
    sourceTable: 'v_salesdetails',
  })

  let hqInvoices: RawInvoiceRow[] = []
  let hqCancel: CancelItemRow[] = []
  let localRanges = split.localRanges
  let warning = split.warning

  if (split.hqRanges.length > 0 && split.locationName) {
    try {
      ;[hqInvoices, hqCancel] = await Promise.all([
        queryHqInvoices(split.locationName, split.hqRanges),
        queryHqCancelItems(split.locationName, split.hqRanges),
      ])
    } catch (error) {
      console.warn('HQDB Void Summary query failed; falling back to LocalDB for full date range:', error)
      hqInvoices = []
      hqCancel = []
      localRanges = [{ from: input.dateFrom, to: input.dateTo }]
      warning = NO_WARNING_LOSS
    }
  }

  const [localInvoices, localCancel] = await Promise.all([
    queryLocalInvoices(localRanges),
    queryLocalCancelItems(localRanges),
  ])

  const voidItems = buildVoidItems([...hqInvoices, ...localInvoices])
  const voidInvoiceSet = new Set(voidItems.map((v) => v.fcrInvNum.toLowerCase()))

  const cancelItems = [...hqCancel, ...localCancel]
    .filter((c) => !voidInvoiceSet.has(c.fcrInvNum.toLowerCase()))
    .sort((a, b) => b.transDatetime.localeCompare(a.transDatetime))

  const totalVoidAmount = voidItems.reduce((s, v) => s + v.voidAmount, 0)
  const totalInterval = voidItems.reduce((s, v) => s + v.intervalSeconds, 0)
  const avgIntervalSeconds = voidItems.length ? Math.round(totalInterval / voidItems.length) : 0

  const checkSet = new Set(cancelItems.map((c) => c.fcrInvNum).filter(Boolean))

  return {
    warning,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    voidSummary: {
      totalVoidCount: voidItems.length,
      totalVoidAmount,
      avgIntervalSeconds,
      avgIntervalFormatted: formatDuration(avgIntervalSeconds),
    },
    voidItems,
    cancelSummary: {
      totalCancelledQty: cancelItems.reduce((s, c) => s + c.lineCount, 0),
      totalCancelledAmount: cancelItems.reduce((s, c) => s + c.lineTotal, 0),
      rowCount: cancelItems.length,
      uniqueChecks: checkSet.size,
    },
    cancelItems,
  }
}
