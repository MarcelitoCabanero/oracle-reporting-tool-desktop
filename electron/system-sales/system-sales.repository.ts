import sql from 'mssql'

import { getHqDbPool } from '../database/hqdb.js'
import {
  bindDateRangesPredicate,
  resolveActiveLocationName,
  splitDateRangeByHqPosted,
  type DateRangeChunk,
} from '../database/hybrid-date-split.js'
import { getLocalDbPool } from '../database/localdb.js'

import type {
  SystemSalesDateRangeInput,
  SystemSalesSummary,
  SystemSalesTender,
} from './system-sales.types.js'

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function emptySummary(): SystemSalesSummary {
  return {
    netSales: 0,
    taxCollected: 0,
    vatableSales: 0,
    vatExemptSales: 0,
    vatZeroRatedSales: 0,
    lessVat: 0,
    lessSC: 0,
    lessPWD: 0,
    lessEmployee: 0,
    lessNationalAthlete: 0,
    lessSoloParent: 0,
    gcSales: 0,
    gcExcess: 0,
    otherDiscount: 0,
    voidAmount: 0,
    voidCount: 0,
    outstanding: 0,
    varianceAmount: 0,
  }
}

function sumSummaries(
  a: SystemSalesSummary,
  b: SystemSalesSummary,
): SystemSalesSummary {
  return {
    netSales: a.netSales + b.netSales,
    taxCollected: a.taxCollected + b.taxCollected,
    vatableSales: a.vatableSales + b.vatableSales,
    vatExemptSales: a.vatExemptSales + b.vatExemptSales,
    vatZeroRatedSales: a.vatZeroRatedSales + b.vatZeroRatedSales,
    lessVat: a.lessVat + b.lessVat,
    lessSC: a.lessSC + b.lessSC,
    lessPWD: a.lessPWD + b.lessPWD,
    lessEmployee: a.lessEmployee + b.lessEmployee,
    lessNationalAthlete: a.lessNationalAthlete + b.lessNationalAthlete,
    lessSoloParent: a.lessSoloParent + b.lessSoloParent,
    gcSales: a.gcSales + b.gcSales,
    gcExcess: a.gcExcess + b.gcExcess,
    otherDiscount: a.otherDiscount + b.otherDiscount,
    voidAmount: a.voidAmount + b.voidAmount,
    voidCount: a.voidCount + b.voidCount,
    outstanding: a.outstanding + b.outstanding,
    varianceAmount: a.varianceAmount + b.varianceAmount,
  }
}

function mergeTenders(
  hqTenders: SystemSalesTender[],
  localTenders: SystemSalesTender[],
): SystemSalesTender[] {
  const merged = new Map<string, SystemSalesTender>()

  for (const item of [...localTenders, ...hqTenders]) {
    const trimmed = item.tenderName.trim()
    if (!trimmed) continue
    const key = trimmed.toUpperCase()
    const existing = merged.get(key)
    if (existing) {
      existing.qty += item.qty
      existing.amount += item.amount
    } else {
      merged.set(key, {
        tenderName: trimmed,
        qty: item.qty,
        amount: item.amount,
      })
    }
  }

  return Array.from(merged.values()).sort((a, b) =>
    a.tenderName.localeCompare(b.tenderName),
  )
}

export async function getWorkstations(): Promise<string[]> {
  const workstationMap = new Map<string, string>()

  try {
    const localPool = await getLocalDbPool()
    const localResult = await localPool.request().query(`
      SELECT DISTINCT Workstation
      FROM dbo.v_salesdetails
      WHERE Workstation IS NOT NULL AND LTRIM(RTRIM(Workstation)) <> ''
      ORDER BY Workstation
    `)
    for (const row of localResult.recordset) {
      const ws = String(row.Workstation ?? '').trim()
      if (ws) workstationMap.set(ws.toUpperCase(), ws)
    }
  } catch (error) {
    console.warn('Unable to read workstations from LocalDB:', error)
  }

  try {
    const locationName = await resolveActiveLocationName()
    if (locationName) {
      const hqPool = await getHqDbPool()
      const hqResult = await hqPool
        .request()
        .input('locationName', sql.VarChar(50), locationName)
        .query(`
          SELECT DISTINCT uwsid AS Workstation
          FROM dbo.v_salesdetails
          WHERE locationname = @locationName
            AND uwsid IS NOT NULL
            AND LTRIM(RTRIM(uwsid)) <> ''
          ORDER BY uwsid
        `)
      for (const row of hqResult.recordset) {
        const ws = String(row.Workstation ?? '').trim()
        if (ws && !workstationMap.has(ws.toUpperCase())) {
          workstationMap.set(ws.toUpperCase(), ws)
        }
      }
    }
  } catch (error) {
    console.warn('Unable to read workstations from HQDB:', error)
  }

  return Array.from(workstationMap.values()).sort((a, b) => a.localeCompare(b))
}

async function queryLocalSummaryForRanges(
  ranges: DateRangeChunk[],
  workstation?: string,
): Promise<SystemSalesSummary> {
  if (ranges.length === 0) {
    return emptySummary()
  }

  const pool = await getLocalDbPool()
  const request = pool.request()
  request.input('workstation', sql.VarChar, workstation ?? null)
  const dateFilterS = bindDateRangesPredicate(request, 's.BusinessDate', ranges, 'locS')
  const dateFilterBase = bindDateRangesPredicate(request, 'BusinessDate', ranges, 'locB')
  const dateFilterOs = bindDateRangesPredicate(request, 'os.BusinessDate', ranges, 'locOs')

  const result = await request.query(`
    WITH VoidedInvoices AS (
      SELECT FCRInvNumber
      FROM dbo.v_salesdetails
      WHERE ${dateFilterBase}
        AND (@workstation IS NULL OR Workstation = @workstation)
      GROUP BY FCRInvNumber
      HAVING COUNT(DISTINCT CheckNumber) > 1
    ),
    GCExcess AS (
      SELECT
        FCRInvNumber,
        CheckNumber,
        MAX(GC_excess) AS GC_excess
      FROM dbo.v_salesdetails
      WHERE ${dateFilterBase}
        AND (@workstation IS NULL OR Workstation = @workstation)
        AND GC_excess <> 0
      GROUP BY FCRInvNumber, CheckNumber
    ),
    Outstanding AS (
      SELECT c.Checknumber, c.Checkclose, c.Due
      FROM CHECKS c
      WHERE c.checkclose IS NULL
        AND (@workstation IS NULL OR EXISTS (
          SELECT 1 FROM dbo.v_salesdetails os
          WHERE os.CheckNumber = c.CheckNumber
            AND ${dateFilterOs}
            AND os.Workstation = @workstation
        ))
    ),
    VarianceByCheck AS (
      SELECT BusinessDate, CheckNumber,
        SUM(CASE WHEN Transtype = 'Item Sale' THEN NetSales + TaxCollected ELSE 0 END) AS Gross,
        SUM(CASE WHEN Transtype = 'Tender' THEN amt ELSE 0 END) AS TotalTender
      FROM dbo.v_salesdetails
      WHERE Transtype IN ('Item Sale', 'Tender')
        AND ${dateFilterBase}
        AND (@workstation IS NULL OR Workstation = @workstation)
      GROUP BY BusinessDate, CheckNumber
      HAVING
        SUM(CASE WHEN Transtype = 'Item Sale' THEN NetSales + TaxCollected ELSE 0 END)
        - SUM(CASE WHEN Transtype = 'Tender' THEN amt ELSE 0 END) <> 0
    )
    SELECT
      SUM(s.NetSales) AS netSales,
      SUM(s.TaxCollected) AS taxCollected,
      SUM(s.LessVAT) AS lessVat,
      SUM(s.LessSC) AS lessSC,
      SUM(s.LessPWD) AS lessPWD,
      SUM(s.LessEmp) AS lessEmployee,
      SUM(s.LessNationalAth) AS lessNationalAthlete,
      SUM(s.LessSoloParent) AS lessSoloParent,
      SUM(
        CASE
          WHEN s.Transtype = 'Service Charge' THEN s.amt
          ELSE 0
        END
      ) AS gcSales,
      ISNULL((SELECT SUM(GC_excess) FROM GCExcess), 0) AS gcExcess,
      SUM(s.other_disc) AS otherDiscount,
      SUM(
        CASE
          WHEN s.amt > 0
            AND s.Transtype = 'Item Sale'
            AND v.FCRInvNumber IS NOT NULL
          THEN s.amt
          ELSE 0
        END
      ) AS voidAmount,
      (SELECT COUNT(*) FROM VoidedInvoices) AS voidCount,
      SUM(s.VatableSales) AS vatableSales,
      SUM(
        CASE
          WHEN s.order_type IN ('Senior Citizen', 'PWD') THEN s.NetSales
          ELSE 0
        END
      ) AS vatExemptSales,
      SUM(
        CASE
          WHEN s.order_type = 'Zero Rated' THEN s.NetSales
          ELSE 0
        END
      ) AS vatZeroRatedSales,
      ISNULL((SELECT SUM(Due) FROM Outstanding), 0) AS outstanding,
      ISNULL((SELECT SUM(Gross - TotalTender) FROM VarianceByCheck), 0) AS varianceAmount
    FROM dbo.v_salesdetails s
    LEFT JOIN VoidedInvoices v
      ON v.FCRInvNumber = s.FCRInvNumber
    WHERE ${dateFilterS}
      AND (@workstation IS NULL OR s.Workstation = @workstation)
  `)

  const row = result.recordset[0]
  return {
    netSales: toNumber(row?.netSales),
    taxCollected: toNumber(row?.taxCollected),
    lessVat: toNumber(row?.lessVat),
    lessSC: toNumber(row?.lessSC),
    lessPWD: toNumber(row?.lessPWD),
    lessEmployee: toNumber(row?.lessEmployee),
    lessNationalAthlete: toNumber(row?.lessNationalAthlete),
    lessSoloParent: toNumber(row?.lessSoloParent),
    gcSales: toNumber(row?.gcSales),
    gcExcess: toNumber(row?.gcExcess),
    otherDiscount: toNumber(row?.otherDiscount),
    voidAmount: toNumber(row?.voidAmount),
    voidCount: toNumber(row?.voidCount),
    vatableSales: toNumber(row?.vatableSales),
    vatExemptSales: toNumber(row?.vatExemptSales),
    vatZeroRatedSales: toNumber(row?.vatZeroRatedSales),
    outstanding: toNumber(row?.outstanding),
    varianceAmount: toNumber(row?.varianceAmount),
  }
}

async function queryLocalTendersForRanges(
  ranges: DateRangeChunk[],
  workstation?: string,
): Promise<SystemSalesTender[]> {
  if (ranges.length === 0) {
    return []
  }

  const pool = await getLocalDbPool()
  const request = pool.request()
  request.input('workstation', sql.VarChar, workstation ?? null)
  const dateFilter = bindDateRangesPredicate(request, 'BusinessDate', ranges, 'locT')

  const result = await request.query(`
    SELECT
      itemname,
      SUM(qty) AS qty,
      SUM(amt) AS amt
    FROM dbo.v_salesdetails
    WHERE Transtype = 'Tender'
      AND ${dateFilter}
      AND (@workstation IS NULL OR Workstation = @workstation)
    GROUP BY Transtype, itemname
    ORDER BY itemname
  `)

  return result.recordset.map((row) => ({
    tenderName: String(row.itemname ?? ''),
    qty: toNumber(row.qty),
    amount: toNumber(row.amt),
  }))
}

async function queryHqStoreWideSummaryForRanges(
  locationName: string,
  ranges: DateRangeChunk[],
): Promise<SystemSalesSummary> {
  if (ranges.length === 0) {
    return emptySummary()
  }

  const pool = await getHqDbPool()
  const dsrReq = pool.request()
  dsrReq.input('locationName', sql.VarChar(50), locationName)
  const dsrDateFilter = bindDateRangesPredicate(dsrReq, 'businessdate', ranges, 'hqDsr')

  const varReq = pool.request()
  varReq.input('locationName', sql.VarChar(50), locationName)
  const varDateFilter = bindDateRangesPredicate(varReq, 'businessdate', ranges, 'hqVar')

  const [dsrRes, varRes] = await Promise.all([
    dsrReq.query(`
      SELECT
        ISNULL(SUM(netsales), 0) AS netSales,
        ISNULL(SUM(vat_12), 0) AS taxCollected,
        ISNULL(SUM(netsales_vatable), 0) AS vatableSales,
        ISNULL(SUM(netsales_vatex), 0) AS vatExemptSales,
        ISNULL(SUM(zerorated), 0) AS vatZeroRatedSales,
        ISNULL(SUM(lessvat), 0) AS lessVat,
        ISNULL(SUM(sc), 0) AS lessSC,
        ISNULL(SUM(pwd), 0) AS lessPWD,
        ISNULL(SUM(lessemp), 0) AS lessEmployee,
        ISNULL(SUM(lessNationalAth), 0) AS lessNationalAthlete,
        ISNULL(SUM(lessSolo), 0) AS lessSoloParent,
        ISNULL(SUM(lessotherDisc), 0) AS otherDiscount,
        ISNULL(SUM(gc_sales), 0) AS gcSales,
        ISNULL(SUM(gc_excess), 0) AS gcExcess,
        ISNULL(SUM(voidtotal_amt), 0) AS voidAmount,
        ISNULL(SUM(voidtotal_qty), 0) AS voidCount
      FROM dbo.agg_daily_dsr
      WHERE locationname = @locationName
        AND ${dsrDateFilter}
    `),
    varReq.query(`
      WITH VarianceByCheck AS (
        SELECT businessdate, GUESTCHECKID,
          SUM(CASE WHEN TRANSACTIONTYPE = 'Item Sale' THEN NetSales + TaxCollected ELSE 0 END) AS Gross,
          SUM(CASE WHEN TRANSACTIONTYPE = 'Tender' THEN LINETOTAL ELSE 0 END) AS TotalTender
        FROM dbo.v_salesdetails
        WHERE locationname = @locationName
          AND TRANSACTIONTYPE IN ('Item Sale', 'Tender')
          AND ${varDateFilter}
        GROUP BY businessdate, GUESTCHECKID
        HAVING
          ROUND(
            SUM(CASE WHEN TRANSACTIONTYPE = 'Item Sale' THEN NetSales + TaxCollected ELSE 0 END)
            - SUM(CASE WHEN TRANSACTIONTYPE = 'Tender' THEN LINETOTAL ELSE 0 END),
            2
          ) <> 0
      )
      SELECT ISNULL(SUM(Gross - TotalTender), 0) AS varianceAmount
      FROM VarianceByCheck
    `),
  ])

  const row = dsrRes.recordset[0]
  const varRow = varRes.recordset[0]

  return {
    netSales: toNumber(row?.netSales),
    taxCollected: toNumber(row?.taxCollected),
    vatableSales: toNumber(row?.vatableSales),
    vatExemptSales: toNumber(row?.vatExemptSales),
    vatZeroRatedSales: toNumber(row?.vatZeroRatedSales),
    lessVat: toNumber(row?.lessVat),
    lessSC: toNumber(row?.lessSC),
    lessPWD: toNumber(row?.lessPWD),
    lessEmployee: toNumber(row?.lessEmployee),
    lessNationalAthlete: toNumber(row?.lessNationalAthlete),
    lessSoloParent: toNumber(row?.lessSoloParent),
    gcSales: toNumber(row?.gcSales),
    gcExcess: toNumber(row?.gcExcess),
    otherDiscount: toNumber(row?.otherDiscount),
    voidAmount: toNumber(row?.voidAmount),
    voidCount: toNumber(row?.voidCount),
    outstanding: 0,
    varianceAmount: toNumber(varRow?.varianceAmount),
  }
}

async function queryHqLineSummaryForRanges(
  locationName: string,
  ranges: DateRangeChunk[],
  workstation?: string,
): Promise<SystemSalesSummary> {
  if (ranges.length === 0) {
    return emptySummary()
  }

  const pool = await getHqDbPool()
  const request = pool.request()
  request.input('locationName', sql.VarChar(50), locationName)
  request.input('workstation', sql.VarChar(50), workstation ?? null)
  const dateFilterVs = bindDateRangesPredicate(request, 'vs.businessdate', ranges, 'hqVs')
  const dateFilterBase = bindDateRangesPredicate(request, 'businessdate', ranges, 'hqVb')

  const result = await request.query(`
    WITH VarianceByCheck AS (
      SELECT businessdate, GUESTCHECKID,
        SUM(CASE WHEN TRANSACTIONTYPE = 'Item Sale' THEN NetSales + TaxCollected ELSE 0 END) AS Gross,
        SUM(CASE WHEN TRANSACTIONTYPE = 'Tender' THEN LINETOTAL ELSE 0 END) AS TotalTender
      FROM dbo.v_salesdetails
      WHERE locationname = @locationName
        AND TRANSACTIONTYPE IN ('Item Sale', 'Tender')
        AND ${dateFilterBase}
        AND (@workstation IS NULL OR uwsid = @workstation)
      GROUP BY businessdate, GUESTCHECKID
      HAVING
        ROUND(
          SUM(CASE WHEN TRANSACTIONTYPE = 'Item Sale' THEN NetSales + TaxCollected ELSE 0 END)
          - SUM(CASE WHEN TRANSACTIONTYPE = 'Tender' THEN LINETOTAL ELSE 0 END),
          2
        ) <> 0
    )
    SELECT
      ISNULL(SUM(vs.NetSales), 0) AS netSales,
      ISNULL(SUM(vs.TaxCollected), 0) AS taxCollected,
      ISNULL(SUM(vs.LessVAT), 0) AS lessVat,
      ISNULL(SUM(vs.LessSC), 0) AS lessSC,
      ISNULL(SUM(vs.LessPWD), 0) AS lessPWD,
      ISNULL(SUM(vs.lessEMP), 0) AS lessEmployee,
      ISNULL(SUM(vs.lessNationalAth), 0) AS lessNationalAthlete,
      ISNULL(SUM(vs.lessSoloParent), 0) AS lessSoloParent,
      ISNULL(
        SUM(
          CASE
            WHEN vs.TRANSACTIONTYPE = 'Srvc Charge'
              AND ISNULL(vs.REFERENCEINFO, '') <> 'Charged Tip'
            THEN vs.LINETOTAL
            ELSE 0
          END
        ),
        0
      ) AS gcSales,
      ISNULL(
        SUM(
          CASE
            WHEN vs.TRANSACTIONTYPE = 'Srvc Charge'
              AND vs.REFERENCEINFO = 'Charged Tip'
            THEN vs.LINETOTAL
            ELSE 0
          END
        ),
        0
      ) AS gcExcess,
      ISNULL(
        SUM(
          CASE
            WHEN vs.DISCOUNTNAME IS NOT NULL
              AND LTRIM(RTRIM(vs.DISCOUNTNAME)) <> ''
              AND vs.DISCOUNTNAME NOT IN (
                'Employee Discount',
                'Employee Discount (food)',
                'Less: PWD Disc',
                'Less: Sr Citizen Disc',
                'Less: VAT',
                'National Athlete',
                'Solo Parent 20%',
                'Solo Parent Max',
                'Solo Parent 5%',
                'NAC Disc'
              )
            THEN ABS(vs.LINETOTAL)
            ELSE 0
          END
        ),
        0
      ) AS otherDiscount,
      ISNULL(
        SUM(
          CASE
            WHEN vs.VOIDFLAGTF = 'TRUE' AND vs.TRANSACTIONTYPE = 'Item Sale'
            THEN ABS(vs.LINETOTAL)
            ELSE 0
          END
        ),
        0
      ) AS voidAmount,
      ISNULL(
        SUM(
          CASE
            WHEN vs.VOIDFLAGTF = 'TRUE' AND vs.TRANSACTIONTYPE = 'Item Sale'
            THEN ABS(vs.LINECOUNT)
            ELSE 0
          END
        ),
        0
      ) AS voidCount,
      ISNULL(
        SUM(
          CASE
            WHEN vs.ordertypename IN ('Standard', 'National Athletes')
            THEN vs.NetSales
            ELSE 0
          END
        ),
        0
      ) AS vatableSales,
      ISNULL(
        SUM(
          CASE
            WHEN vs.ordertypename IN ('PWD', 'Senior Citizen')
            THEN vs.NetSales
            ELSE 0
          END
        ),
        0
      ) AS vatExemptSales,
      ISNULL(
        SUM(
          CASE
            WHEN vs.ordertypename IN ('Zero Rated')
            THEN vs.NetSales
            ELSE 0
          END
        ),
        0
      ) AS vatZeroRatedSales,
      ISNULL((SELECT SUM(Gross - TotalTender) FROM VarianceByCheck), 0) AS varianceAmount
    FROM dbo.v_salesdetails vs
    WHERE vs.locationname = @locationName
      AND ${dateFilterVs}
      AND (@workstation IS NULL OR vs.uwsid = @workstation)
  `)

  const row = result.recordset[0]
  return {
    netSales: toNumber(row?.netSales),
    taxCollected: toNumber(row?.taxCollected),
    lessVat: toNumber(row?.lessVat),
    lessSC: toNumber(row?.lessSC),
    lessPWD: toNumber(row?.lessPWD),
    lessEmployee: toNumber(row?.lessEmployee),
    lessNationalAthlete: toNumber(row?.lessNationalAthlete),
    lessSoloParent: toNumber(row?.lessSoloParent),
    gcSales: toNumber(row?.gcSales),
    gcExcess: toNumber(row?.gcExcess),
    otherDiscount: toNumber(row?.otherDiscount),
    voidAmount: toNumber(row?.voidAmount),
    voidCount: toNumber(row?.voidCount),
    vatableSales: toNumber(row?.vatableSales),
    vatExemptSales: toNumber(row?.vatExemptSales),
    vatZeroRatedSales: toNumber(row?.vatZeroRatedSales),
    outstanding: 0,
    varianceAmount: toNumber(row?.varianceAmount),
  }
}

async function queryHqTendersForRanges(
  locationName: string,
  ranges: DateRangeChunk[],
  workstation?: string,
): Promise<SystemSalesTender[]> {
  if (ranges.length === 0) {
    return []
  }

  const pool = await getHqDbPool()
  const request = pool.request()
  request.input('locationName', sql.VarChar(50), locationName)
  request.input('workstation', sql.VarChar(50), workstation ?? null)
  const dateFilter = bindDateRangesPredicate(request, 'businessdate', ranges, 'hqT')

  const result = await request.query(`
    SELECT
      COALESCE(NULLIF(LTRIM(RTRIM(TENDERNAME)), ''), LTRIM(RTRIM(ITEMNAME))) AS itemname,
      SUM(LINECOUNT) AS qty,
      SUM(LINETOTAL) AS amt
    FROM dbo.v_salesdetails
    WHERE locationname = @locationName
      AND TRANSACTIONTYPE = 'Tender'
      AND ${dateFilter}
      AND (@workstation IS NULL OR uwsid = @workstation)
    GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(TENDERNAME)), ''), LTRIM(RTRIM(ITEMNAME)))
    ORDER BY itemname
  `)

  return result.recordset.map((row) => ({
    tenderName: String(row.itemname ?? ''),
    qty: toNumber(row.qty),
    amount: toNumber(row.amt),
  }))
}

export async function loadSystemSalesReportData(
  input: SystemSalesDateRangeInput,
): Promise<{
  summary: SystemSalesSummary
  tenders: SystemSalesTender[]
  warning?: string
}> {
  const isWorkstationMode = Boolean(input.workstation?.trim())
  const split = await splitDateRangeByHqPosted(input.dateFrom, input.dateTo, {
    sourceTable: isWorkstationMode ? 'v_salesdetails' : 'agg_daily_dsr',
  })

  let hqSummary = emptySummary()
  let hqTenders: SystemSalesTender[] = []
  let localRanges = split.localRanges
  let warning = split.warning

  if (split.hqRanges.length > 0 && split.locationName) {
    try {
      const [summaryRes, tenderRes] = await Promise.all([
        isWorkstationMode
          ? queryHqLineSummaryForRanges(
              split.locationName,
              split.hqRanges,
              input.workstation?.trim(),
            )
          : queryHqStoreWideSummaryForRanges(split.locationName, split.hqRanges),
        queryHqTendersForRanges(
          split.locationName,
          split.hqRanges,
          input.workstation?.trim(),
        ),
      ])
      hqSummary = summaryRes
      hqTenders = tenderRes
    } catch (error) {
      console.warn(
        'HQDB System Sales query failed; falling back to LocalDB for full date range:',
        error,
      )
      hqSummary = emptySummary()
      hqTenders = []
      localRanges = [{ from: input.dateFrom, to: input.dateTo }]
      warning =
        'HQ database could not be reached. Showing available Local POS data only (purged historical dates may be incomplete).'
    }
  }

  const [localSummary, localTenders] = await Promise.all([
    queryLocalSummaryForRanges(localRanges, input.workstation?.trim()),
    queryLocalTendersForRanges(localRanges, input.workstation?.trim()),
  ])

  return {
    summary: sumSummaries(hqSummary, localSummary),
    tenders: mergeTenders(hqTenders, localTenders),
    warning,
  }
}

export async function getSystemSalesSummary(
  input: SystemSalesDateRangeInput,
): Promise<SystemSalesSummary> {
  const data = await loadSystemSalesReportData(input)
  return data.summary
}

export async function getSystemSalesTenders(
  input: SystemSalesDateRangeInput,
): Promise<SystemSalesTender[]> {
  const data = await loadSystemSalesReportData(input)
  return data.tenders
}
