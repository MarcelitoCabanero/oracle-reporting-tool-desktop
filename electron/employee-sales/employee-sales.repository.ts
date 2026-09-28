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

  // Preserve the VB.NET query's selected employee and date filters.
  const [sales, tenderRows] = await Promise.all([
    request().query(`
      SELECT SUM(NetSales) AS netsales,
             SUM(TaxCollected) AS taxcollected,
             SUM(LessVAT) AS lessvat,
             SUM(LessSC) AS lessSC,
             SUM(LessPWD) AS lessPWD,
             SUM(LessEmp) AS lessEmp,
             SUM(LessNationalAth) AS lessNationalAth,
             SUM(LessSoloParent) AS lessSoloparent,
             SUM(srvc_amt) AS srvc_amt,
             SUM(other_disc) AS other_disc,
             SUM(CASE WHEN amt < 0 AND Transtype = 'Item Sale'
                      THEN amt ELSE 0 END) AS voidAmount
      FROM dbo.v_salesdetails
      WHERE emp_name = @empname
        AND BusinessDate BETWEEN @dtfrom AND @dtto
      GROUP BY emp_name
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
      netSales: amount(row?.netsales),
      taxCollected: amount(row?.taxcollected),
      lessVat: amount(row?.lessvat),
      lessSC: amount(row?.lessSC),
      lessPWD: amount(row?.lessPWD),
      lessEmp: amount(row?.lessEmp),
      lessNationalAth: amount(row?.lessNationalAth),
      lessSoloParent: amount(row?.lessSoloparent),
      serviceAmount: amount(row?.srvc_amt),
      otherDiscount: amount(row?.other_disc),
      voidAmount: amount(row?.voidAmount),
    },
    tenders: tenderRows.recordset.map(row => ({
      tenderName: String(row.itemname ?? ''),
      qty: amount(row.qty),
      amount: amount(row.amt),
    })),
  }
}
