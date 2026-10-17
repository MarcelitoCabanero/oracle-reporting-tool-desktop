import sql from 'mssql'

import {
  getLocalDbPool,
} from '../database/localdb.js'

import type {
  CreateHourlyEntriesInput,
  HourlyDailyReportInput,
  HourlyRecord,
  HourlyRecordsInput,
  HourlyReportSourceRow,
  HourlyReportSources,
  HourlySalesSourceRow,
  UpdateHourlyRecordInput,
} from './hourly-sales.types.js'

export async function insertHourlyEntries(
  input: CreateHourlyEntriesInput,
): Promise<void> {
  const pool = await getLocalDbPool()
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
        .input('shellQty', sql.Int, row.shellQty ?? 0)
        .input('ringQty', sql.Int, row.ringQty ?? 0)
        .input('jpopsQty', sql.Int, row.jpopsQty ?? 0)
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
            DATEADD(HOUR, 8, GETUTCDATE())
          )
        `)
    }

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export async function loadHourlyRecords(
  input: HourlyRecordsInput,
): Promise<HourlyRecord[]> {
  const pool = await getLocalDbPool()
  const [produceResult, wasteResult] = await Promise.all([
    pool
      .request()
      .input('startDate', sql.Date, input.startDate)
      .input('endDate', sql.Date, input.endDate)
      .input('locationName', sql.VarChar(50), input.locationName)
      .query(`
        SELECT
          produce_id AS id,
          CONVERT(char(10), date_mix, 23) AS entryDate,
          LTRIM(RTRIM(time_mixing)) AS time,
          ISNULL(shell_qty, 0) AS shellQty,
          ISNULL(ring_qty, 0) AS ringQty,
          ISNULL(jpops_qty, 0) AS jpopsQty,
          LTRIM(RTRIM(Remarks)) AS remarks
        FROM dbo.dts_produce
        WHERE date_mix >= @startDate
          AND date_mix < DATEADD(day, 1, @endDate)
          AND locationname = @locationName
        ORDER BY date_mix DESC, time_mixing
      `),
    pool
      .request()
      .input('startDate', sql.Date, input.startDate)
      .input('endDate', sql.Date, input.endDate)
      .input('locationName', sql.VarChar(50), input.locationName)
      .query(`
        SELECT
          waste_id AS id,
          CONVERT(char(10), date_waste, 23) AS entryDate,
          LTRIM(RTRIM(time_waste)) AS time,
          ISNULL(shell_qty, 0) AS shellQty,
          ISNULL(ring_qty, 0) AS ringQty,
          ISNULL(jpops_qty, 0) AS jpopsQty,
          LTRIM(RTRIM(Remarks)) AS remarks
        FROM dbo.dts_waste
        WHERE date_waste >= @startDate
          AND date_waste < DATEADD(day, 1, @endDate)
          AND locationname = @locationName
        ORDER BY date_waste DESC, time_waste
      `),
  ])

  return [
    ...produceResult.recordset.map((row): HourlyRecord => ({
      id: Number(row.id),
      kind: 'produce',
      entryDate: String(row.entryDate ?? ''),
      time: String(row.time ?? ''),
      shellQty: Number(row.shellQty ?? 0),
      ringQty: Number(row.ringQty ?? 0),
      jpopsQty: Number(row.jpopsQty ?? 0),
      remarks: String(row.remarks ?? ''),
    })),
    ...wasteResult.recordset.map((row): HourlyRecord => ({
      id: Number(row.id),
      kind: 'waste',
      entryDate: String(row.entryDate ?? ''),
      time: String(row.time ?? ''),
      shellQty: Number(row.shellQty ?? 0),
      ringQty: Number(row.ringQty ?? 0),
      jpopsQty: Number(row.jpopsQty ?? 0),
      remarks: String(row.remarks ?? ''),
    })),
  ].sort((left, right) =>
    right.entryDate.localeCompare(left.entryDate) ||
    left.time.localeCompare(right.time) ||
    left.kind.localeCompare(right.kind),
  )
}

export async function updateHourlyRecord(
  input: UpdateHourlyRecordInput,
): Promise<void> {
  const pool = await getLocalDbPool()
  const isProduce = input.kind === 'produce'
  const tableName = isProduce ? 'dbo.dts_produce' : 'dbo.dts_waste'
  const idColumn = isProduce ? 'produce_id' : 'waste_id'
  const timeColumn = isProduce ? 'time_mixing' : 'time_waste'
  const dateColumn = isProduce ? 'date_mix' : 'date_waste'
  const result = await pool
    .request()
    .input('id', sql.Int, input.id)
    .input('entryDate', sql.Date, input.entryDate)
    .input('timeValue', sql.VarChar(50), input.time)
    .input('shellQty', sql.Int, input.shellQty)
    .input('ringQty', sql.Int, input.ringQty)
    .input('jpopsQty', sql.Int, input.jpopsQty)
    .input('remarks', sql.VarChar(50), input.remarks)
    .input('locationName', sql.VarChar(50), input.locationName)
    .query(`
      UPDATE ${tableName}
      SET
        ${dateColumn} = @entryDate,
        ${timeColumn} = @timeValue,
        shell_qty = @shellQty,
        ring_qty = @ringQty,
        jpops_qty = @jpopsQty,
        Remarks = @remarks
      WHERE ${idColumn} = @id
        AND locationname = @locationName
    `)

  if (result.rowsAffected[0] !== 1) {
    throw new Error('The record was not found or is no longer available for this location. Refresh the records and try again.')
  }
}

export async function loadHourlyReportSources(
  input: HourlyDailyReportInput,
): Promise<HourlyReportSources> {
  const pool = await getLocalDbPool()

  const [produceResult, wasteResult, salesResult, posWasteResult] = await Promise.all([
    pool
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
        WHERE date_mix = @businessDate
          AND locationname = @locationName
        GROUP BY time_mixing, Remarks
      `),
    pool
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
        WHERE date_waste = @businessDate
          AND locationname = @locationName
        GROUP BY time_waste, Remarks
      `),
    pool
      .request()
      .input('businessDate', sql.Date, input.businessDate)
      .query(`
        SELECT
          LTRIM(RTRIM(HourRange)) AS hourRange,
          SUM(ISNULL(RingSold, 0)) AS ringSold,
          SUM(ISNULL(ShellSold, 0)) AS shellSold,
          SUM(ISNULL(JpopsSold, 0)) AS jpopsSold,
          SUM(ISNULL(jclubsold, 0)) AS jclubSold
        FROM dbo.v_donutsold
        WHERE CAST(DateSold AS date) = @businessDate
        GROUP BY HourRange
      `),
    pool
      .request()
      .input('businessDate', sql.Date, input.businessDate)
      .query(`
        SELECT
          SUM(CASE WHEN UPPER(LTRIM(RTRIM(Category))) = 'RING' THEN ISNULL(qty, 0) ELSE 0 END) AS ringWaste,
          SUM(CASE WHEN UPPER(LTRIM(RTRIM(Category))) = 'SHELL' THEN ISNULL(qty, 0) ELSE 0 END) AS shellWaste,
          SUM(CASE WHEN UPPER(LTRIM(RTRIM(Category))) = 'JPOPS' THEN ISNULL(qty, 0) ELSE 0 END) AS jpopsWaste
        FROM dbo.v_itemdetail
        WHERE UPPER(LTRIM(RTRIM(rvc_type))) = 'FOC WASTE'
          AND DetailPostingTime >= @businessDate
          AND DetailPostingTime < DATEADD(day, 1, @businessDate)
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
      jclubSold: Number(row.jclubSold ?? 0),
    })),
    posWaste: {
      ring: Number(posWasteResult.recordset[0]?.ringWaste ?? 0),
      shell: Number(posWasteResult.recordset[0]?.shellWaste ?? 0),
      jpops: Number(posWasteResult.recordset[0]?.jpopsWaste ?? 0),
    },
  }
}