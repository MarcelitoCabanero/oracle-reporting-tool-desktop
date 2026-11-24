import sql from 'mssql'
import { getHqDbPool } from '../database/hqdb.js'
import { normalizeSqlDate, resolveActiveLocationName } from '../database/hybrid-date-split.js'

export interface FinanceInsightTotals {
  netSales: number
  guests: number
  checks: number
}

export interface FinanceInsightStoreOverviewRow {
  locationName: string
  netSales: number
  checks: number
  guests: number
  apc: number
}

export interface FinanceInsightDistributionRow {
  revenueCenter: string
  qty: number
  netSales: number
  share: number
}

export interface FinanceInsightDistributionStoreRow {
  locationName: string
  qty: number
  netSales: number
  share: number
  byCenter: Record<string, { qty: number; netSales: number }>
}

export interface FinanceInsightGrowthRow {
  ym: string
  locationName: string
  netSales: number
  guests: number
  checks: number
}

export interface FinanceInsightLoadInput {
  dateFrom: string
  dateTo: string
}

export interface FinanceInsightLoadResult {
  locationName: string
  orgLocationRef: string
  overview: {
    range: { dateFrom: string; dateTo: string; prevFrom: string; prevTo: string }
    daily: Array<{ date: string; netSales: number; guests: number; checks: number; apc: number }>
    byStore: FinanceInsightStoreOverviewRow[]
    kpis: {
      current: FinanceInsightTotals
      previous: FinanceInsightTotals
    }
  }
  distribution: {
    total: number
    totalQty: number
    rows: FinanceInsightDistributionRow[]
    byStore: FinanceInsightDistributionStoreRow[]
  }
  growth: {
    range: { dateFrom: string; dateTo: string }
    rows: FinanceInsightGrowthRow[]
  }
  warning?: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function num(val: unknown): number {
  const n = Number(val ?? 0)
  return Number.isFinite(n) ? n : 0
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000,
  )
}

async function resolveStoreFromOracleDb(
  pool: sql.ConnectionPool,
): Promise<{ locationName: string; orgLocationRef: string }> {
  const locationName = await resolveActiveLocationName()
  if (!locationName) {
    throw new Error('Active store location could not be resolved.')
  }

  const res = await pool
    .request()
    .input('locationName', sql.VarChar(50), locationName)
    .query(`
      SELECT TOP 1
        LTRIM(RTRIM(LOCATIONNAME)) AS locationName,
        LTRIM(RTRIM(ISNULL(ORGLOCATIONREF, ''))) AS orgLocationRef
      FROM dbo.dts_location
      WHERE LOCATIONNAME = @locationName
    `)

  const row = res.recordset[0]
  return {
    locationName: String(row?.locationName ?? locationName).trim(),
    orgLocationRef: String(row?.orgLocationRef ?? '').trim() || 'Store',
  }
}

async function queryTotals(
  pool: sql.ConnectionPool,
  locationName: string,
  dateFrom: string,
  dateTo: string,
): Promise<FinanceInsightTotals> {
  const [dsrRes, chkRes] = await Promise.all([
    pool
      .request()
      .input('locationName', sql.VarChar(50), locationName)
      .input('dateFrom', sql.Date, dateFrom)
      .input('dateTo', sql.Date, dateTo)
      .query(`
        SELECT
          ISNULL(SUM(netsales), 0) AS netSales,
          ISNULL(SUM(numguest), 0) AS guests
        FROM dbo.agg_daily_dsr
        WHERE locationname = @locationName
          AND businessdate BETWEEN @dateFrom AND @dateTo
      `),
    pool
      .request()
      .input('locationName', sql.VarChar(50), locationName)
      .input('dateFrom', sql.Date, dateFrom)
      .input('dateTo', sql.Date, dateTo)
      .query(`
        SELECT ISNULL(SUM(check_count), 0) AS checks
        FROM dbo.agg_daily_checkcount
        WHERE locationname = @locationName
          AND businessdate BETWEEN @dateFrom AND @dateTo
      `),
  ])

  return {
    netSales: num(dsrRes.recordset[0]?.netSales),
    guests: num(dsrRes.recordset[0]?.guests),
    checks: num(chkRes.recordset[0]?.checks),
  }
}

async function queryDailyOverview(
  pool: sql.ConnectionPool,
  locationName: string,
  dateFrom: string,
  dateTo: string,
): Promise<Array<{ date: string; netSales: number; guests: number; checks: number; apc: number }>> {
  const [dsrRes, chkRes] = await Promise.all([
    pool
      .request()
      .input('locationName', sql.VarChar(50), locationName)
      .input('dateFrom', sql.Date, dateFrom)
      .input('dateTo', sql.Date, dateTo)
      .query(`
        SELECT
          CAST(businessdate AS date) AS businessDate,
          ISNULL(SUM(netsales), 0) AS netSales,
          ISNULL(SUM(numguest), 0) AS guests
        FROM dbo.agg_daily_dsr
        WHERE locationname = @locationName
          AND businessdate BETWEEN @dateFrom AND @dateTo
        GROUP BY CAST(businessdate AS date)
        ORDER BY CAST(businessdate AS date)
      `),
    pool
      .request()
      .input('locationName', sql.VarChar(50), locationName)
      .input('dateFrom', sql.Date, dateFrom)
      .input('dateTo', sql.Date, dateTo)
      .query(`
        SELECT
          CAST(businessdate AS date) AS businessDate,
          ISNULL(SUM(check_count), 0) AS checks
        FROM dbo.agg_daily_checkcount
        WHERE locationname = @locationName
          AND businessdate BETWEEN @dateFrom AND @dateTo
        GROUP BY CAST(businessdate AS date)
      `),
  ])

  const checkMap = new Map<string, number>()
  for (const r of chkRes.recordset) {
    const date = normalizeSqlDate(r.businessDate)
    if (date) checkMap.set(date, num(r.checks))
  }

  return dsrRes.recordset.map((r) => {
    const date = normalizeSqlDate(r.businessDate)
    const netSales = num(r.netSales)
    const guests = num(r.guests)
    const checks = checkMap.get(date) ?? 0
    return {
      date,
      netSales,
      guests,
      checks,
      apc: guests > 0 ? netSales / guests : 0,
    }
  })
}

async function queryDistribution(
  pool: sql.ConnectionPool,
  locationName: string,
  dateFrom: string,
  dateTo: string,
): Promise<{
  total: number
  totalQty: number
  rows: FinanceInsightDistributionRow[]
  byStore: FinanceInsightDistributionStoreRow[]
}> {
  const res = await pool
    .request()
    .input('locationName', sql.VarChar(50), locationName)
    .input('dateFrom', sql.Date, dateFrom)
    .input('dateTo', sql.Date, dateTo)
    .query(`
      SELECT
        revenuecentername AS revenueCenter,
        ISNULL(SUM(qty), 0) AS qty,
        ISNULL(SUM(netsales), 0) AS netSales
      FROM dbo.agg_daily_revenuecenter
      WHERE locationname = @locationName
        AND businessdate BETWEEN @dateFrom AND @dateTo
      GROUP BY revenuecentername
      ORDER BY SUM(netsales) DESC
    `)

  const rawRows = res.recordset.map((r) => ({
    revenueCenter: String(r.revenueCenter ?? '').trim() || 'Unspecified',
    qty: num(r.qty),
    netSales: num(r.netSales),
  }))

  const total = rawRows.reduce((s, r) => s + r.netSales, 0)
  const totalQty = rawRows.reduce((s, r) => s + r.qty, 0)
  const rows: FinanceInsightDistributionRow[] = rawRows.map((r) => ({
    ...r,
    share: total > 0 ? (r.netSales / total) * 100 : 0,
  }))

  const byStore: FinanceInsightDistributionStoreRow[] =
    rows.length > 0
      ? [
          {
            locationName,
            qty: totalQty,
            netSales: total,
            share: 100,
            byCenter: Object.fromEntries(
              rawRows.map((r) => [r.revenueCenter, { qty: r.qty, netSales: r.netSales }]),
            ),
          },
        ]
      : []

  return { total, totalQty, rows, byStore }
}

async function queryGrowth(
  pool: sql.ConnectionPool,
  locationName: string,
): Promise<{
  range: { dateFrom: string; dateTo: string }
  rows: FinanceInsightGrowthRow[]
}> {
  const now = new Date()
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 24, 1))
  const startStr = start.toISOString().slice(0, 10)
  const endStr = addDays(end.toISOString().slice(0, 10), -1)

  const [dsrRes, chkRes] = await Promise.all([
    pool
      .request()
      .input('locationName', sql.VarChar(50), locationName)
      .input('dateFrom', sql.Date, startStr)
      .input('dateTo', sql.Date, endStr)
      .query(`
        SELECT
          FORMAT(businessdate, 'yyyy-MM') AS ym,
          ISNULL(SUM(netsales), 0) AS netSales,
          ISNULL(SUM(numguest), 0) AS guests
        FROM dbo.agg_daily_dsr
        WHERE locationname = @locationName
          AND businessdate BETWEEN @dateFrom AND @dateTo
        GROUP BY FORMAT(businessdate, 'yyyy-MM')
        ORDER BY FORMAT(businessdate, 'yyyy-MM')
      `),
    pool
      .request()
      .input('locationName', sql.VarChar(50), locationName)
      .input('dateFrom', sql.Date, startStr)
      .input('dateTo', sql.Date, endStr)
      .query(`
        SELECT
          FORMAT(businessdate, 'yyyy-MM') AS ym,
          ISNULL(SUM(check_count), 0) AS checks
        FROM dbo.agg_daily_checkcount
        WHERE locationname = @locationName
          AND businessdate BETWEEN @dateFrom AND @dateTo
        GROUP BY FORMAT(businessdate, 'yyyy-MM')
      `),
  ])

  const checkMap = new Map<string, number>()
  for (const r of chkRes.recordset) {
    checkMap.set(String(r.ym), num(r.checks))
  }

  return {
    range: { dateFrom: startStr, dateTo: endStr },
    rows: dsrRes.recordset.map((r) => {
      const ym = String(r.ym)
      return {
        ym,
        locationName,
        netSales: num(r.netSales),
        guests: num(r.guests),
        checks: checkMap.get(ym) ?? 0,
      }
    }),
  }
}

export async function loadFinanceInsightData(
  input: FinanceInsightLoadInput,
): Promise<FinanceInsightLoadResult> {
  const dateFrom = String(input.dateFrom ?? '').trim()
  const dateTo = String(input.dateTo ?? '').trim()

  if (!DATE_RE.test(dateFrom) || !DATE_RE.test(dateTo)) {
    throw new Error('dateFrom and dateTo (YYYY-MM-DD) are required.')
  }
  if (dateFrom > dateTo) {
    throw new Error('Date From cannot be greater than Date To.')
  }
  const span = daysBetween(dateFrom, dateTo)
  if (span > 800) {
    throw new Error('Date range cannot exceed 800 days.')
  }

  const pool = await getHqDbPool()
  const store = await resolveStoreFromOracleDb(pool)

  const spanDays = span + 1
  const prevTo = addDays(dateFrom, -1)
  const prevFrom = addDays(prevTo, -(spanDays - 1))

  const [daily, currentTotals, previousTotals, distRes, growthRes] = await Promise.all([
    queryDailyOverview(pool, store.locationName, dateFrom, dateTo),
    queryTotals(pool, store.locationName, dateFrom, dateTo),
    queryTotals(pool, store.locationName, prevFrom, prevTo),
    queryDistribution(pool, store.locationName, dateFrom, dateTo),
    queryGrowth(pool, store.locationName),
  ])

  const byStore: FinanceInsightStoreOverviewRow[] =
    daily.length > 0
      ? [
          {
            locationName: store.locationName,
            netSales: currentTotals.netSales,
            checks: currentTotals.checks,
            guests: currentTotals.guests,
            apc: currentTotals.guests > 0 ? currentTotals.netSales / currentTotals.guests : 0,
          },
        ]
      : []

  return {
    locationName: store.locationName,
    orgLocationRef: store.orgLocationRef,
    overview: {
      range: { dateFrom, dateTo, prevFrom, prevTo },
      daily,
      byStore,
      kpis: {
        current: currentTotals,
        previous: previousTotals,
      },
    },
    distribution: distRes,
    growth: growthRes,
  }
}
