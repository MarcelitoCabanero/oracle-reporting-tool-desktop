import sql from 'mssql'

import {
  getLocalDbPool,
} from '../database/localdb.js'

import type {
  SystemSalesDateRangeInput,
  SystemSalesSummary,
  SystemSalesTender,
} from './system-sales.types.js'

function toNumber(
  value: unknown,
): number {
  if (
    value === null ||
    value === undefined
  ) {
    return 0
  }

  const numberValue = Number(value)

  return Number.isFinite(numberValue)
    ? numberValue
    : 0
}

export async function getSystemSalesSummary(
  input: SystemSalesDateRangeInput,
): Promise<SystemSalesSummary> {
  const pool =
    await getLocalDbPool()

  const result = await pool
    .request()
    .input(
      'dtfrom',
      sql.Date,
      input.dateFrom,
    )
    .input(
      'dtto',
      sql.Date,
      input.dateTo,
    )
    .query(`
     WITH VoidedInvoices AS (
    SELECT FCRInvNumber
    FROM dbo.v_salesdetails
    WHERE BusinessDate Between @dtfrom AND @dtto
    GROUP BY FCRInvNumber
    HAVING COUNT(DISTINCT CheckNumber) > 1
),

GCExcess AS (
    SELECT
        FCRInvNumber,
        CheckNumber,
        MAX(GC_excess) AS GC_excess
    FROM dbo.v_salesdetails
    WHERE BusinessDate Between @dtfrom AND @dtto
      AND GC_excess <> 0
    GROUP BY FCRInvNumber, CheckNumber
),

Outstanding as (
select  Checknumber, Checkclose , Due
from CHECKS where  
checkclose IS NULL

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
            WHEN s.Transtype = 'Service Charge'
            THEN s.amt
            ELSE 0
        END
    ) AS gcSales,

    ISNULL(
        (SELECT SUM(GC_excess) FROM GCExcess),
        0
    ) AS gcExcess,

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

    (SELECT COUNT(*) FROM VoidedInvoices)
        AS voidCount,

    SUM(s.VatableSales)
        AS vatableSales,

    SUM(
        CASE
            WHEN s.order_type IN (
                'Senior Citizen',
                'PWD'
            )
            THEN s.NetSales
            ELSE 0
        END
    ) AS vatExemptSales,

    SUM(
        CASE
            WHEN s.order_type = 'Zero Rated'
            THEN s.NetSales
            ELSE 0
        END
    ) AS vatZeroRatedSales,

    ISNULL(
        (SELECT SUM(Due) FROM Outstanding),
        0
    ) AS outstanding

FROM dbo.v_salesdetails s

LEFT JOIN VoidedInvoices v
    ON v.FCRInvNumber = s.FCRInvNumber

WHERE s.BusinessDate
    BETWEEN @dtfrom AND @dtto

    `)

  const row =
    result.recordset[0]

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
  }
}

export async function getSystemSalesTenders(
  input: SystemSalesDateRangeInput,
): Promise<SystemSalesTender[]> {
  const pool =
    await getLocalDbPool()

  const result = await pool
    .request()
    .input(
      'dtfrom',
      sql.Date,
      input.dateFrom,
    )
    .input(
      'dtto',
      sql.Date,
      input.dateTo,
    )
    .query(`
      SELECT
        itemname,
        SUM(qty) AS qty,
        SUM(amt) AS amt

      FROM dbo.v_salesdetails

      WHERE Transtype = 'Tender'
        AND BusinessDate
          BETWEEN @dtfrom AND @dtto

      GROUP BY
        Transtype,
        itemname

      ORDER BY
        itemname
    `)

  return result.recordset.map(
    (row) => ({
      tenderName:
        String(
          row.itemname ?? '',
        ),

      qty:
        toNumber(row.qty),

      amount:
        toNumber(row.amt),
    }),
  )
}