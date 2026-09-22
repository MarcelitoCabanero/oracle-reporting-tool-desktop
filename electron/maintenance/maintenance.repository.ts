import sql from 'mssql'

import { getHqDbPool } from '../database/hqdb.js'
import { getLocalDbPool } from '../database/localdb.js'

import type { MissingMenuItem } from './maintenance.types.js'

const menuItemColumns =
  'itemnumber, itemname, transtype, majorgroup, familygroup'

export async function getMissingMenuItems(): Promise<MissingMenuItem[]> {
  const hqPool = await getHqDbPool()
  const localPool = await getLocalDbPool()

  const hqResult = await hqPool.request().query<MissingMenuItem>(
    `SELECT ${menuItemColumns} FROM dts_object`,
  )
  const localResult = await localPool.request().query<{ itemnumber: string }>(
    'SELECT itemnumber FROM dts_object',
  )

  const localItemNumbers = new Set(
    localResult.recordset.map((row) => String(row.itemnumber)),
  )

  return hqResult.recordset.filter(
    (row) => !localItemNumbers.has(String(row.itemnumber)),
  )
}

export async function insertMissingMenuItems(
  rows: MissingMenuItem[],
): Promise<void> {
  const pool = await getLocalDbPool()
  const transaction = new sql.Transaction(pool)

  await transaction.begin()

  try {
    for (const row of rows) {
      await new sql.Request(transaction)
        .input('itemnumber', sql.VarChar, row.itemnumber)
        .input('itemname', sql.VarChar, row.itemname)
        .input('transtype', sql.VarChar, row.transtype)
        .input('majorgroup', sql.VarChar, row.majorgroup)
        .input('familygroup', sql.VarChar, row.familygroup)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM dts_object WHERE itemnumber = @itemnumber)
          BEGIN
            INSERT INTO dts_object
              (itemnumber, itemname, transtype, majorgroup, familygroup)
            VALUES
              (@itemnumber, @itemname, @transtype, @majorgroup, @familygroup)
          END
        `)
    }

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}