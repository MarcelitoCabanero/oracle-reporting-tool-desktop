import sql from 'mssql'

import {
  getHourlyDbPool,
} from '../database/hourlydb.js'
import {
  getLocalDbPool,
} from '../database/localdb.js'

import type {
  CreateHourlyEntriesInput,
  HourlyDailyReportInput,
  HourlyReportSourceRow,
  HourlyReportSources,
  HourlySalesSourceRow,
} from './hourly-sales.types.js'

export async function insertHourlyEntries(
  input: CreateHourlyEntriesInput,
): Promise<void> {
  const pool = await getHourlyDbPool()
  const transaction = new sql.Transaction(pool)
  const isProduce = input.kind === 'produce'
  const tableName = isProduce ? 'dbo.dts_produce' : 'dbo.dts_waste'
  const timeColumn = isProduce ? 'time_mixing' : 'time_waste'
  const dateColumn = isProduce ? 'date_mix' : 'date_waste'

  await transaction.begin()

  try {
    for (const row of input.rows) {
      await new sql.Request(transaction)
        .input('timeValue', sql.VarChar(50), row.time)
        .input('entryDate', sql.Date, row.entryDate)
        .input('shellQty', sql.Int, row.shellQty)
        .input('ringQty', sql.Int, row.ringQty)
        .input('jpopsQty', sql.Int, row.jpopsQty)
        .input('remarks', sql.VarChar(50), row.remarks)
        .input('locationName', sql.VarChar(50), input.locationName)
        .input('businessDate', sql.Date, input.businessDate)
        .query(`
          INSERT INTO ${tableName}
          (
            ${timeColumn},
            ${dateColumn},
            shell_qty,
            ring_qty,
            jpops_qty,
            Remarks,
            locationname,
            businessdate,
            created_at
          )
          VALUES
          (
            @timeValue,
            @entryDate,
            @shellQty,
            @ringQty,
            @jpopsQty,
            @remarks,
            @locationName,
            @businessDate,
            SYSDATETIME()
          )
        `)
    }

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export async function loadHourlyReportSources(
  input: HourlyDailyReportInput,
): Promise<HourlyReportSources> {
  const [hourlyPool, posPool] = await Promise.all([
    getHourlyDbPool(),
    getLocalDbPool(),
  ])

  const [produceResult, wasteResult, salesResult] = await Promise.all([
    hourlyPool
      .request()
      .input('businessDate', sql.Date, input.businessDate)
      .input('locationName', sql.VarChar(50), input.locationName)
      .query(`
        SELECT
          LTRIM(RTRIM(time_mixing)) AS time,
          LTRIM(RTRIM(Remarks)) AS remarks,
          SUM(ISNULL(shell_qty, 0)) AS shellQty,
          SUM(ISNULL(ring_qty, 0)) AS ringQty,
          SUM(ISNULL(jpops_qty, 0)) AS jpopsQty
        FROM dbo.dts_produce
        WHERE businessdate = @businessDate
          AND locationname = @locationName
        GROUP BY time_mixing, Remarks
      `),
    hourlyPool
      .request()
      .input('businessDate', sql.Date, input.businessDate)
      .input('locationName', sql.VarChar(50), input.locationName)
      .query(`
        SELECT
          LTRIM(RTRIM(time_waste)) AS time,
          LTRIM(RTRIM(Remarks)) AS remarks,
          SUM(ISNULL(shell_qty, 0)) AS shellQty,
          SUM(ISNULL(ring_qty, 0)) AS ringQty,
          SUM(ISNULL(jpops_qty, 0)) AS jpopsQty
        FROM dbo.dts_waste
        WHERE businessdate = @businessDate
          AND locationname = @locationName
        GROUP BY time_waste, Remarks
      `),
    posPool
      .request()
      .input('businessDate', sql.Date, input.businessDate)
      .query(`
        SELECT
          LTRIM(RTRIM(HourRange)) AS hourRange,
          SUM(ISNULL(RingSold, 0)) AS ringSold,
          SUM(ISNULL(ShellSold, 0)) AS shellSold,
          SUM(ISNULL(JpopsSold, 0)) AS jpopsSold
        FROM dbo.v_donutsold
        WHERE CAST(DateSold AS date) = @businessDate
        GROUP BY HourRange
      `),
  ])

  return {
    produce: produceResult.recordset.map((row): HourlyReportSourceRow => ({
      time: String(row.time ?? ''),
      remarks: String(row.remarks ?? ''),
      shellQty: Number(row.shellQty ?? 0),
      ringQty: Number(row.ringQty ?? 0),
      jpopsQty: Number(row.jpopsQty ?? 0),
    })),
    waste: wasteResult.recordset.map((row): HourlyReportSourceRow => ({
      time: String(row.time ?? ''),
      remarks: String(row.remarks ?? ''),
      shellQty: Number(row.shellQty ?? 0),
      ringQty: Number(row.ringQty ?? 0),
      jpopsQty: Number(row.jpopsQty ?? 0),
    })),
    sales: salesResult.recordset.map((row): HourlySalesSourceRow => ({
      hourRange: String(row.hourRange ?? ''),
      ringSold: Number(row.ringSold ?? 0),
      shellSold: Number(row.shellSold ?? 0),
      jpopsSold: Number(row.jpopsSold ?? 0),
    })),
  }
}