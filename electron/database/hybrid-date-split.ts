import sql from 'mssql'
import { getActiveSessionLocationName } from '../auth/auth.service.js'
import { getHqDbPool } from './hqdb.js'
import { getLocalDbPool } from './localdb.js'

export interface DateRangeChunk {
  from: string
  to: string
}

export interface HybridDateSplitResult {
  locationName: string
  hqDates: string[]
  localDates: string[]
  hqRanges: DateRangeChunk[]
  localRanges: DateRangeChunk[]
  warning?: string
}

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function normalizeSqlDate(value: unknown): string {
  if (value instanceof Date) {
    return formatUtcDate(value)
  }
  const str = String(value ?? '').trim()
  return str.slice(0, 10)
}

export function enumerateDates(dateFrom: string, dateTo: string): string[] {
  const start = new Date(`${dateFrom}T00:00:00Z`)
  const end = new Date(`${dateTo}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return []
  }

  const dates: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    dates.push(formatUtcDate(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

export function compressDateRanges(sortedDates: string[]): DateRangeChunk[] {
  if (sortedDates.length === 0) {
    return []
  }

  const ranges: DateRangeChunk[] = []
  let rangeStart = sortedDates[0]
  let prevDate = sortedDates[0]

  for (let i = 1; i < sortedDates.length; i += 1) {
    const current = sortedDates[i]
    const prevPlusOne = new Date(`${prevDate}T00:00:00Z`)
    prevPlusOne.setUTCDate(prevPlusOne.getUTCDate() + 1)

    if (formatUtcDate(prevPlusOne) === current) {
      prevDate = current
    } else {
      ranges.push({ from: rangeStart, to: prevDate })
      rangeStart = current
      prevDate = current
    }
  }

  ranges.push({ from: rangeStart, to: prevDate })
  return ranges
}

export function bindDateRangesPredicate(
  request: sql.Request,
  columnExpr: string,
  ranges: DateRangeChunk[],
  paramPrefix = 'dr',
): string {
  const clauses = ranges.map((range, index) => {
    const fromParam = `${paramPrefix}From${index}`
    const toParam = `${paramPrefix}To${index}`
    request.input(fromParam, sql.Date, range.from)
    request.input(toParam, sql.Date, range.to)
    return `(${columnExpr} BETWEEN @${fromParam} AND @${toParam})`
  })

  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`
}

export async function resolveActiveLocationName(
  explicitLocationName?: string,
): Promise<string> {
  const trimmedExplicit = explicitLocationName?.trim()
  if (trimmedExplicit && trimmedExplicit.toLowerCase() !== 'admin') {
    return trimmedExplicit
  }

  const sessionLocation = getActiveSessionLocationName()
  if (sessionLocation) {
    return sessionLocation
  }

  const localPool = await getLocalDbPool()
  const result = await localPool.request().query(`
    SELECT TOP 1 LTRIM(RTRIM(locationname)) AS locationName
    FROM dbo.dts_location
    WHERE IsActive = 1
      AND LOWER(LTRIM(RTRIM(ISNULL(access, '')))) <> 'admin'
      AND LTRIM(RTRIM(ISNULL(locationname, ''))) <> ''
    ORDER BY locationid ASC
  `)

  const dbLocation = String(result.recordset[0]?.locationName ?? '').trim()
  return dbLocation
}

export async function splitDateRangeByHqPosted(
  dateFrom: string,
  dateTo: string,
  options?: {
    locationName?: string
    sourceTable?: 'agg_daily_dsr' | 'v_salesdetails'
  },
): Promise<HybridDateSplitResult> {
  const allDates = enumerateDates(dateFrom, dateTo)
  const sourceTable = options?.sourceTable ?? 'v_salesdetails'

  let locationName = ''
  try {
    locationName = await resolveActiveLocationName(options?.locationName)
  } catch (error) {
    console.warn('Unable to resolve active store locationName for HQDB split:', error)
  }

  if (!locationName) {
    return {
      locationName: '',
      hqDates: [],
      localDates: allDates,
      hqRanges: [],
      localRanges: compressDateRanges(allDates),
      warning:
        'Store location could not be resolved for HQ database lookup. Showing available Local POS data only.',
    }
  }

  try {
    const hqPool = await getHqDbPool()
    const tableSql =
      sourceTable === 'agg_daily_dsr' ? 'dbo.agg_daily_dsr' : 'dbo.v_salesdetails'

    const result = await hqPool
      .request()
      .input('locationName', sql.VarChar(50), locationName)
      .input('dateFrom', sql.Date, dateFrom)
      .input('dateTo', sql.Date, dateTo)
      .query(`
        SELECT DISTINCT CAST(businessdate AS date) AS businessDate
        FROM ${tableSql}
        WHERE locationname = @locationName
          AND businessdate BETWEEN @dateFrom AND @dateTo
      `)

    const postedSet = new Set<string>(
      result.recordset
        .map((row) => normalizeSqlDate(row.businessDate))
        .filter(Boolean),
    )

    const hqDates = allDates.filter((d) => postedSet.has(d))
    const localDates = allDates.filter((d) => !postedSet.has(d))

    return {
      locationName,
      hqDates,
      localDates,
      hqRanges: compressDateRanges(hqDates),
      localRanges: compressDateRanges(localDates),
    }
  } catch (error) {
    console.warn(
      `HQDB lookup failed on ${sourceTable} for ${locationName} (${dateFrom}..${dateTo}); falling back to LocalDB.`,
      error,
    )
    return {
      locationName,
      hqDates: [],
      localDates: allDates,
      hqRanges: [],
      localRanges: compressDateRanges(allDates),
      warning:
        'HQ database could not be reached. Showing available Local POS data only (purged historical dates may be incomplete).',
    }
  }
}
