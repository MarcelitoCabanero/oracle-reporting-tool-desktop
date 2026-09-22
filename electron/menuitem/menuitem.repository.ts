import sql from 'mssql'
import { getLocalDbPool } from '../database/localdb.js'

import type {
  MenuItemBySalesTypeRow,
  MenuItemSummaryRow,
} from './menuitem.types.js'

export async function getMenuItemsBySalesType(
  dateFrom: string,
  dateTo: string,
): Promise<MenuItemBySalesTypeRow[]> {
  const pool = await getLocalDbPool()

  const result = await pool
    .request()
    .input('dateFrom', sql.Date, dateFrom)
    .input('dateTo', sql.Date, dateTo)
    .query(`
      SELECT
        itemnumber,
        itemname,
        SUM(qty) AS qty,
        SUM(
          CASE
            WHEN salestype IN ('DEL-FP','DEL-GRB','FOC','NORMAL')
              THEN netsales
            ELSE grossamt
          END
        ) AS grossamt,
        SUM(itemdiscount) AS itemdiscount,
        SUM(netsales) AS netsales,
        salestype
      FROM dbo.v_menuitem_summary
      WHERE businessdate BETWEEN @dateFrom AND @dateTo
        AND (qty <> 0 OR grossamt <> 0)
      GROUP BY itemnumber, itemname, salestype
      ORDER BY salestype, itemnumber
    `)

  return result.recordset.map((row) => ({
    itemNumber: String(row.itemnumber ?? ''),
    itemName: String(row.itemname ?? ''),
    qty: Number(row.qty ?? 0),
    grossAmount: Number(row.grossamt ?? 0),
    itemDiscount: Number(row.itemdiscount ?? 0),
    netSales: Number(row.netsales ?? 0),
    salesType: String(row.salestype ?? ''),
  }))
}

export async function getMenuItemSummary(
  dateFrom: string,
  dateTo: string,
): Promise<MenuItemSummaryRow[]> {
  const pool = await getLocalDbPool()

  const result = await pool
    .request()
    .input('dateFrom', sql.Date, dateFrom)
    .input('dateTo', sql.Date, dateTo)
    .query(`
      SELECT
        itemnumber,
        itemname,
        SUM(qty) AS qty,
        SUM(grossamt) AS grossamt,
        SUM(itemdiscount) AS itemdiscount,
        SUM(netsales) AS netsales,
        Majorgroup,
        Familygroup
      FROM dbo.v_menuitem_summary
      WHERE businessdate BETWEEN @dateFrom AND @dateTo
        AND (qty <> 0 OR grossamt <> 0)
      GROUP BY
        itemnumber,
        itemname,
        Majorgroup,
        Familygroup
      ORDER BY itemnumber
    `)

  return result.recordset.map((row) => ({
    itemNumber: String(row.itemnumber ?? ''),
    itemName: String(row.itemname ?? ''),
    qty: Number(row.qty ?? 0),
    grossAmount: Number(row.grossamt ?? 0),
    itemDiscount: Number(row.itemdiscount ?? 0),
    netSales: Number(row.netsales ?? 0),
    majorGroup: String(row.Majorgroup ?? ''),
    familyGroup: String(row.Familygroup ?? ''),
  }))
}
