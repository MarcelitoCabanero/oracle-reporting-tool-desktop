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
  EmployeeOption,
  EmployeeSalesInput,
  EmployeeSalesMetrics,
  EmployeeTender,
} from './employee-sales.types.js'

const amount = (value: unknown) => {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function emptyMetrics(): EmployeeSalesMetrics {
  return {
    netSales: 0,
    taxCollected: 0,
    lessVat: 0,
    lessSC: 0,
    lessPWD: 0,
    lessEmp: 0,
    lessNationalAth: 0,
    lessSoloParent: 0,
    serviceAmount: 0,
    otherDiscount: 0,
    voidAmount: 0,
    voidCount: 0,
    vatableSales: 0,
    vatExemptSales: 0,
    vatZeroRatedSales: 0,
    gcSales: 0,
    gcExcess: 0,
    outstanding: 0,
    varianceAmount: 0,
  }
}

function sumMetrics(
  a: EmployeeSalesMetrics,
  b: EmployeeSalesMetrics,
): EmployeeSalesMetrics {
  return {
    netSales: a.netSales + b.netSales,
    taxCollected: a.taxCollected + b.taxCollected,
    lessVat: a.lessVat + b.lessVat,
    lessSC: a.lessSC + b.lessSC,
    lessPWD: a.lessPWD + b.lessPWD,
    lessEmp: a.lessEmp + b.lessEmp,
    lessNationalAth: a.lessNationalAth + b.lessNationalAth,
    lessSoloParent: a.lessSoloParent + b.lessSoloParent,
    serviceAmount: a.serviceAmount + b.serviceAmount,
    otherDiscount: a.otherDiscount + b.otherDiscount,
    voidAmount: a.voidAmount + b.voidAmount,
    voidCount: a.voidCount + b.voidCount,
    vatableSales: a.vatableSales + b.vatableSales,
    vatExemptSales: a.vatExemptSales + b.vatExemptSales,
    vatZeroRatedSales: a.vatZeroRatedSales + b.vatZeroRatedSales,
    gcSales: a.gcSales + b.gcSales,
    gcExcess: a.gcExcess + b.gcExcess,
    outstanding: a.outstanding + b.outstanding,
    varianceAmount: a.varianceAmount + b.varianceAmount,
  }
}

function mergeEmployeeTenders(
  hqTenders: EmployeeTender[],
  localTenders: EmployeeTender[],
): EmployeeTender[] {
  const merged = new Map<string, EmployeeTender>()

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

export async function loadEmployees(): Promise<EmployeeOption[]> {
  const byName = new Map<string, EmployeeOption>()

  try {
    const pool = await getLocalDbPool()
    const result = await pool.request().query(`
      SELECT EmployeeID, CheckName
      FROM dbo.EMPLOYEE
      WHERE CheckName IS NOT NULL
      ORDER BY CheckName, EmployeeID
    `)
    for (const row of result.recordset) {
      const checkName = String(row.CheckName ?? '').trim()
      if (!checkName) continue
      const key = checkName.toUpperCase()
      if (!byName.has(key)) {
        byName.set(key, {
          employeeId: String(row.EmployeeID ?? ''),
          checkName,
        })
      }
    }
  } catch (error) {
    console.warn('Unable to load employees from LocalDB:', error)
  }

  try {
    const locationName = await resolveActiveLocationName()
    if (locationName) {
      const hqPool = await getHqDbPool()
      const hqResult = await hqPool
        .request()
        .input('locationName', sql.VarChar(50), locationName)
        .query(`
          SELECT DISTINCT CHECKEMPNAME AS CheckName
          FROM dbo.v_salesdetails
          WHERE locationname = @locationName
            AND CHECKEMPNAME IS NOT NULL
            AND LTRIM(RTRIM(CHECKEMPNAME)) <> ''
          ORDER BY CHECKEMPNAME
        `)
      for (const row of hqResult.recordset) {
        const checkName = String(row.CheckName ?? '').trim()
        if (!checkName) continue
        const key = checkName.toUpperCase()
        if (!byName.has(key)) {
          byName.set(key, {
            employeeId: `HQ-${checkName}`,
            checkName,
          })
        }
      }
    }
  } catch (error) {
    console.warn('Unable to load employees from HQDB:', error)
  }

  return Array.from(byName.values()).sort((a, b) =>
    a.checkName.localeCompare(b.checkName),
  )
}

export async function loadEmployeesWithSales(
  dateFrom: string,
  dateTo: string,
): Promise<string[]> {
  const split = await splitDateRangeByHqPosted(dateFrom, dateTo, {
    sourceTable: 'v_salesdetails',
  })

  const employeeMap = new Map<string, string>()
  let localRanges = split.localRanges

  if (split.hqRanges.length > 0 && split.locationName) {
    try {
      const hqPool = await getHqDbPool()
      const hqReq = hqPool.request()
      hqReq.input('locationName', sql.VarChar(50), split.locationName)
      const dateFilter = bindDateRangesPredicate(
        hqReq,
        'businessdate',
        split.hqRanges,
        'hqEmpList',
      )
      const hqResult = await hqReq.query(`
        SELECT DISTINCT CHECKEMPNAME AS emp_name
        FROM dbo.v_salesdetails
        WHERE locationname = @locationName
          AND ${dateFilter}
          AND TRANSACTIONTYPE = 'Item Sale'
          AND CHECKEMPNAME IS NOT NULL
          AND LTRIM(RTRIM(CHECKEMPNAME)) <> ''
        ORDER BY CHECKEMPNAME
      `)
      for (const row of hqResult.recordset) {
        const name = String(row.emp_name ?? '').trim()
        if (name) employeeMap.set(name.toUpperCase(), name)
      }
    } catch (error) {
      console.warn(
        'HQDB loadEmployeesWithSales failed; falling back to LocalDB:',
        error,
      )
      localRanges = [{ from: dateFrom, to: dateTo }]
    }
  }

  if (localRanges.length > 0) {
    const localPool = await getLocalDbPool()
    const localReq = localPool.request()
    const dateFilter = bindDateRangesPredicate(
      localReq,
      'BusinessDate',
      localRanges,
      'locEmpList',
    )
    const localResult = await localReq.query(`
      SELECT DISTINCT emp_name
      FROM dbo.v_salesdetails
      WHERE ${dateFilter}
        AND Transtype = 'Item Sale'
        AND emp_name IS NOT NULL
        AND LTRIM(RTRIM(emp_name)) <> ''
      ORDER BY emp_name
    `)
    for (const row of localResult.recordset) {
      const name = String(row.emp_name ?? '').trim()
      if (name && !employeeMap.has(name.toUpperCase())) {
        employeeMap.set(name.toUpperCase(), name)
      }
    }
  }

  return Array.from(employeeMap.values()).sort((a, b) => a.localeCompare(b))
}

async function queryLocalEmployeeSalesForRanges(
  employeeName: string,
  ranges: DateRangeChunk[],
): Promise<{
  hasSales: boolean
  metrics: EmployeeSalesMetrics
  tenders: EmployeeTender[]
}> {
  if (ranges.length === 0) {
    return {
      hasSales: false,
      metrics: emptyMetrics(),
      tenders: [],
    }
  }

  const pool = await getLocalDbPool()
  const salesReq = pool.request().input('empname', sql.VarChar, employeeName)
  const salesDateFilter = bindDateRangesPredicate(
    salesReq,
    'BusinessDate',
    ranges,
    'locEmpS',
  )

  const tenderReq = pool.request().input('empname', sql.VarChar, employeeName)
  const tenderDateFilter = bindDateRangesPredicate(
    tenderReq,
    'BusinessDate',
    ranges,
    'locEmpT',
  )

  const [sales, tenderRows] = await Promise.all([
    salesReq.query(`
      WITH EmployeeSales AS (
        SELECT * FROM dbo.v_salesdetails
        WHERE ${salesDateFilter}
          AND emp_name = @empname
      ),
      VoidedInvoices AS (
        SELECT FCRInvNumber
        FROM EmployeeSales
        WHERE FCRInvNumber IS NOT NULL
        GROUP BY FCRInvNumber
        HAVING COUNT(DISTINCT CheckNumber) > 1
      ),
      GCExcess AS (
        SELECT FCRInvNumber, CheckNumber, MAX(GC_excess) AS GC_excess
        FROM EmployeeSales
        WHERE GC_excess <> 0
        GROUP BY FCRInvNumber, CheckNumber
      ),
      EmployeeChecks AS (
        SELECT DISTINCT CheckNumber FROM EmployeeSales
        WHERE CheckNumber IS NOT NULL
      ),
      VarianceByCheck AS (
        SELECT BusinessDate, CheckNumber,
          SUM(CASE WHEN Transtype = 'Item Sale' THEN NetSales + TaxCollected ELSE 0 END) AS Gross,
          SUM(CASE WHEN Transtype = 'Tender' THEN amt ELSE 0 END) AS TotalTender
        FROM EmployeeSales
        WHERE Transtype IN ('Item Sale', 'Tender')
        GROUP BY BusinessDate, CheckNumber
        HAVING
          ABS(
            CAST(
              ROUND(
                SUM(CASE WHEN Transtype = 'Item Sale' THEN NetSales + TaxCollected ELSE 0 END)
                - SUM(CASE WHEN Transtype = 'Tender' THEN amt ELSE 0 END),
                2
              ) AS DECIMAL(18, 2)
            )
          ) > 0.01
      )
      SELECT SUM(s.NetSales) AS netSales,
        SUM(s.TaxCollected) AS taxCollected,
        SUM(s.LessVAT) AS lessVat,
        SUM(s.LessSC) AS lessSC,
        SUM(s.LessPWD) AS lessPWD,
        SUM(s.LessEmp) AS lessEmployee,
        SUM(s.LessNationalAth) AS lessNationalAthlete,
        SUM(s.LessSoloParent) AS lessSoloParent,
        SUM(CASE WHEN s.Transtype = 'Service Charge' THEN s.amt ELSE 0 END) AS gcSales,
        ISNULL((SELECT SUM(GC_excess) FROM GCExcess), 0) AS gcExcess,
        SUM(s.other_disc) AS otherDiscount,
        SUM(CASE WHEN s.amt > 0 AND s.Transtype = 'Item Sale'
                  AND v.FCRInvNumber IS NOT NULL THEN s.amt ELSE 0 END) AS voidAmount,
        (SELECT COUNT(*) FROM VoidedInvoices) AS voidCount,
        SUM(s.VatableSales) AS vatableSales,
        SUM(CASE WHEN s.order_type IN ('Senior Citizen', 'PWD')
                 THEN s.NetSales ELSE 0 END) AS vatExemptSales,
        SUM(CASE WHEN s.order_type = 'Zero Rated'
                 THEN s.NetSales ELSE 0 END) AS vatZeroRatedSales,
        ISNULL((SELECT SUM(c.Due) FROM dbo.CHECKS c
                WHERE c.CheckClose IS NULL
                  AND EXISTS (SELECT 1 FROM EmployeeChecks ec WHERE ec.CheckNumber = c.CheckNumber)), 0) AS outstanding,
        ISNULL((SELECT SUM(Gross - TotalTender) FROM VarianceByCheck), 0) AS varianceAmount
      FROM EmployeeSales s
      LEFT JOIN VoidedInvoices v ON v.FCRInvNumber = s.FCRInvNumber
      GROUP BY s.emp_name
    `),
    tenderReq.query(`
      SELECT itemname, SUM(qty) AS qty, SUM(amt) AS amt
      FROM dbo.v_salesdetails
      WHERE Transtype = 'Tender'
        AND emp_name = @empname
        AND ${tenderDateFilter}
      GROUP BY Transtype, itemname
      ORDER BY itemname
    `),
  ])

  const row = sales.recordset[0]
  return {
    hasSales: Boolean(row),
    metrics: {
      netSales: amount(row?.netSales),
      taxCollected: amount(row?.taxCollected),
      lessVat: amount(row?.lessVat),
      lessSC: amount(row?.lessSC),
      lessPWD: amount(row?.lessPWD),
      lessEmp: amount(row?.lessEmployee),
      lessNationalAth: amount(row?.lessNationalAthlete),
      lessSoloParent: amount(row?.lessSoloParent),
      serviceAmount: amount(row?.gcSales),
      otherDiscount: amount(row?.otherDiscount),
      voidAmount: amount(row?.voidAmount),
      voidCount: amount(row?.voidCount),
      vatableSales: amount(row?.vatableSales),
      vatExemptSales: amount(row?.vatExemptSales),
      vatZeroRatedSales: amount(row?.vatZeroRatedSales),
      gcSales: amount(row?.gcSales),
      gcExcess: amount(row?.gcExcess),
      outstanding: amount(row?.outstanding),
      varianceAmount: amount(row?.varianceAmount),
    },
    tenders: tenderRows.recordset.map((r) => ({
      tenderName: String(r.itemname ?? ''),
      qty: amount(r.qty),
      amount: amount(r.amt),
    })),
  }
}

async function queryHqEmployeeSalesForRanges(
  locationName: string,
  employeeName: string,
  ranges: DateRangeChunk[],
): Promise<{
  hasSales: boolean
  metrics: EmployeeSalesMetrics
  tenders: EmployeeTender[]
}> {
  if (ranges.length === 0) {
    return {
      hasSales: false,
      metrics: emptyMetrics(),
      tenders: [],
    }
  }

  const pool = await getHqDbPool()
  const salesReq = pool
    .request()
    .input('locationName', sql.VarChar(50), locationName)
    .input('empname', sql.VarChar(50), employeeName)
  const salesDateFilter = bindDateRangesPredicate(
    salesReq,
    'businessdate',
    ranges,
    'hqEmpS',
  )

  const tenderReq = pool
    .request()
    .input('locationName', sql.VarChar(50), locationName)
    .input('empname', sql.VarChar(50), employeeName)
  const tenderDateFilter = bindDateRangesPredicate(
    tenderReq,
    'businessdate',
    ranges,
    'hqEmpT',
  )

  const [sales, tenderRows] = await Promise.all([
    salesReq.query(`
      WITH EmployeeSales AS (
        SELECT *
        FROM dbo.v_salesdetails
        WHERE locationname = @locationName
          AND ${salesDateFilter}
          AND CHECKEMPNAME = @empname
      ),
      VarianceByCheck AS (
        SELECT businessdate, GUESTCHECKID,
          SUM(CASE WHEN TRANSACTIONTYPE = 'Item Sale' THEN NetSales + TaxCollected ELSE 0 END) AS Gross,
          SUM(CASE WHEN TRANSACTIONTYPE = 'Tender' THEN LINETOTAL ELSE 0 END) AS TotalTender
        FROM EmployeeSales
        WHERE TRANSACTIONTYPE IN ('Item Sale', 'Tender')
        GROUP BY businessdate, GUESTCHECKID
        HAVING
          ABS(
            CAST(
              ROUND(
                SUM(CASE WHEN TRANSACTIONTYPE = 'Item Sale' THEN NetSales + TaxCollected ELSE 0 END)
                - SUM(CASE WHEN TRANSACTIONTYPE = 'Tender' THEN LINETOTAL ELSE 0 END),
                2
              ) AS DECIMAL(18, 2)
            )
          ) > 0.01
      )
      SELECT
        SUM(s.NetSales) AS netSales,
        SUM(s.TaxCollected) AS taxCollected,
        SUM(s.LessVAT) AS lessVat,
        SUM(s.LessSC) AS lessSC,
        SUM(s.LessPWD) AS lessPWD,
        SUM(s.lessEMP) AS lessEmployee,
        SUM(s.lessNationalAth) AS lessNationalAthlete,
        SUM(s.lessSoloParent) AS lessSoloParent,
        SUM(
          CASE
            WHEN s.TRANSACTIONTYPE = 'Srvc Charge'
              AND ISNULL(s.REFERENCEINFO, '') <> 'Charged Tip'
            THEN s.LINETOTAL
            ELSE 0
          END
        ) AS gcSales,
        SUM(
          CASE
            WHEN s.TRANSACTIONTYPE = 'Srvc Charge'
              AND s.REFERENCEINFO = 'Charged Tip'
            THEN s.LINETOTAL
            ELSE 0
          END
        ) AS gcExcess,
        SUM(
          CASE
            WHEN s.DISCOUNTNAME IS NOT NULL
              AND LTRIM(RTRIM(s.DISCOUNTNAME)) <> ''
              AND s.DISCOUNTNAME NOT IN (
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
            THEN ABS(s.LINETOTAL)
            ELSE 0
          END
        ) AS otherDiscount,
        SUM(
          CASE
            WHEN s.VOIDFLAGTF = 'TRUE' AND s.TRANSACTIONTYPE = 'Item Sale'
            THEN ABS(s.LINETOTAL)
            ELSE 0
          END
        ) AS voidAmount,
        SUM(
          CASE
            WHEN s.VOIDFLAGTF = 'TRUE' AND s.TRANSACTIONTYPE = 'Item Sale'
            THEN ABS(s.LINECOUNT)
            ELSE 0
          END
        ) AS voidCount,
        SUM(
          CASE
            WHEN s.ordertypename IN ('Standard', 'National Athletes')
            THEN s.NetSales
            ELSE 0
          END
        ) AS vatableSales,
        SUM(
          CASE
            WHEN s.ordertypename IN ('PWD', 'Senior Citizen')
            THEN s.NetSales
            ELSE 0
          END
        ) AS vatExemptSales,
        SUM(
          CASE
            WHEN s.ordertypename IN ('Zero Rated')
            THEN s.NetSales
            ELSE 0
          END
        ) AS vatZeroRatedSales,
        ISNULL((SELECT SUM(Gross - TotalTender) FROM VarianceByCheck), 0) AS varianceAmount
      FROM EmployeeSales s
      GROUP BY s.CHECKEMPNAME
    `),
    tenderReq.query(`
      SELECT
        COALESCE(NULLIF(LTRIM(RTRIM(TENDERNAME)), ''), LTRIM(RTRIM(ITEMNAME))) AS itemname,
        SUM(LINECOUNT) AS qty,
        SUM(LINETOTAL) AS amt
      FROM dbo.v_salesdetails
      WHERE locationname = @locationName
        AND TRANSACTIONTYPE = 'Tender'
        AND CHECKEMPNAME = @empname
        AND ${tenderDateFilter}
      GROUP BY COALESCE(NULLIF(LTRIM(RTRIM(TENDERNAME)), ''), LTRIM(RTRIM(ITEMNAME)))
      ORDER BY itemname
    `),
  ])

  const row = sales.recordset[0]
  return {
    hasSales: Boolean(row),
    metrics: {
      netSales: amount(row?.netSales),
      taxCollected: amount(row?.taxCollected),
      lessVat: amount(row?.lessVat),
      lessSC: amount(row?.lessSC),
      lessPWD: amount(row?.lessPWD),
      lessEmp: amount(row?.lessEmployee),
      lessNationalAth: amount(row?.lessNationalAthlete),
      lessSoloParent: amount(row?.lessSoloParent),
      serviceAmount: amount(row?.gcSales),
      otherDiscount: amount(row?.otherDiscount),
      voidAmount: amount(row?.voidAmount),
      voidCount: amount(row?.voidCount),
      vatableSales: amount(row?.vatableSales),
      vatExemptSales: amount(row?.vatExemptSales),
      vatZeroRatedSales: amount(row?.vatZeroRatedSales),
      gcSales: amount(row?.gcSales),
      gcExcess: amount(row?.gcExcess),
      outstanding: 0,
      varianceAmount: amount(row?.varianceAmount),
    },
    tenders: tenderRows.recordset.map((r) => ({
      tenderName: String(r.itemname ?? ''),
      qty: amount(r.qty),
      amount: amount(r.amt),
    })),
  }
}

export async function loadEmployeeSales(
  input: EmployeeSalesInput,
): Promise<{
  hasSales: boolean
  metrics: EmployeeSalesMetrics
  tenders: EmployeeTender[]
  warning?: string
}> {
  const split = await splitDateRangeByHqPosted(input.dateFrom, input.dateTo, {
    sourceTable: 'v_salesdetails',
  })

  let hqData = {
    hasSales: false,
    metrics: emptyMetrics(),
    tenders: [] as EmployeeTender[],
  }
  let localRanges = split.localRanges
  let warning = split.warning

  if (split.hqRanges.length > 0 && split.locationName) {
    try {
      hqData = await queryHqEmployeeSalesForRanges(
        split.locationName,
        input.employeeName,
        split.hqRanges,
      )
    } catch (error) {
      console.warn(
        'HQDB loadEmployeeSales failed; falling back to LocalDB:',
        error,
      )
      hqData = {
        hasSales: false,
        metrics: emptyMetrics(),
        tenders: [],
      }
      localRanges = [{ from: input.dateFrom, to: input.dateTo }]
      warning =
        'HQ database could not be reached. Showing available Local POS data only (purged historical dates may be incomplete).'
    }
  }

  const localData = await queryLocalEmployeeSalesForRanges(
    input.employeeName,
    localRanges,
  )

  return {
    hasSales: hqData.hasSales || localData.hasSales,
    metrics: sumMetrics(hqData.metrics, localData.metrics),
    tenders: mergeEmployeeTenders(hqData.tenders, localData.tenders),
    warning,
  }
}
