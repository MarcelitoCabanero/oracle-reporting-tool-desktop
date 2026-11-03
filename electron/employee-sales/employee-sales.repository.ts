import sql from 'mssql'
import { getLocalDbPool } from '../database/localdb.js'
import type { EmployeeOption, EmployeeSalesInput, EmployeeSalesMetrics, EmployeeTender } from './employee-sales.types.js'

const amount = (value: unknown) => {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

export async function loadEmployees(): Promise<EmployeeOption[]> {
  const pool = await getLocalDbPool()
  const result = await pool.request().query(`
    SELECT EmployeeID, CheckName
    FROM dbo.EMPLOYEE
    WHERE CheckName IS NOT NULL
    ORDER BY CheckName, EmployeeID
  `)
  return result.recordset.map(row => ({
    employeeId: String(row.EmployeeID ?? ''),
    checkName: String(row.CheckName ?? ''),
  }))
}

export async function loadEmployeesWithSales(dateFrom: string, dateTo: string): Promise<string[]> {
  const pool = await getLocalDbPool()
  const result = await pool.request()
    .input('dtfrom', sql.Date, dateFrom)
    .input('dtto', sql.Date, dateTo)
    .query(`
      SELECT DISTINCT emp_name
      FROM dbo.v_salesdetails
      WHERE BusinessDate BETWEEN @dtfrom AND @dtto
        AND Transtype = 'Item Sale'
        AND emp_name IS NOT NULL
        AND LTRIM(RTRIM(emp_name)) <> ''
      ORDER BY emp_name
    `)
  return result.recordset.map(row => String(row.emp_name).trim())
}

export async function loadEmployeeSales(input: EmployeeSalesInput): Promise<{
  hasSales: boolean
  metrics: EmployeeSalesMetrics
  tenders: EmployeeTender[]
}> {
  const pool = await getLocalDbPool()
  const request = () => pool.request()
    .input('empname', sql.VarChar, input.employeeName)
    .input('dtfrom', sql.Date, input.dateFrom)
    .input('dtto', sql.Date, input.dateTo)

  // Every supporting total is scoped to the selected employee and date range.
  const [sales, tenderRows] = await Promise.all([
    request().query(`
      WITH EmployeeSales AS (
        SELECT * FROM dbo.v_salesdetails
        WHERE BusinessDate BETWEEN @dtfrom AND @dtto
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
        HAVING SUM(CASE WHEN Transtype = 'Item Sale' THEN NetSales + TaxCollected ELSE 0 END)
             - SUM(CASE WHEN Transtype = 'Tender' THEN amt ELSE 0 END) <> 0
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
    request().query(`
      SELECT itemname, SUM(qty) AS qty, SUM(amt) AS amt
      FROM dbo.v_salesdetails
      WHERE Transtype = 'Tender'
        AND emp_name = @empname
        AND BusinessDate BETWEEN @dtfrom AND @dtto
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
    tenders: tenderRows.recordset.map(row => ({
      tenderName: String(row.itemname ?? ''),
      qty: amount(row.qty),
      amount: amount(row.amt),
    })),
  }
}
