import sql from 'mssql'

import { getLocalDbPool } from '../database/localdb.js'
import { getHourlyDbPool } from '../database/hourlydb.js'
import { getDatabaseSqlConfig } from '../settings/settings.service.js'

export const hourlySummaryInputColumns = [
  'promotions_ring', 'promotions_shell',
  'training_ring', 'training_shell',
  'staff_meal_ring', 'staff_meal_shell',
  'waste_dough_grams_ring', 'waste_dough_grams_shell',
  'waste_frozen_dough_ring', 'waste_frozen_dough_shell',
  'buffer_jpops_ring', 'buffer_jpops_shell',
] as const

export type HourlySummaryInputColumn = typeof hourlySummaryInputColumns[number]
export type HourlySummaryInputValues = Record<HourlySummaryInputColumn, number | null>

export interface HourlySummaryInputKey {
  dateFrom: string
  dateTo: string
  locationName: string
}

export interface SaveHourlySummaryInput extends HourlySummaryInputKey {
  values: HourlySummaryInputValues
}

const emptyValues = (): HourlySummaryInputValues => Object.fromEntries(
  hourlySummaryInputColumns.map((column) => [column, null]),
) as HourlySummaryInputValues

let localReady: sql.ConnectionPool | null = null
let hourlyReadyTarget: string | null = null
let syncing: Promise<number> | null = null

const summarySchema = `
  IF OBJECT_ID(N'dbo.dts_summary_input', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.dts_summary_input (
      entry_id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_dts_summary_input PRIMARY KEY,
      locationname VARCHAR(50) NOT NULL,
      date_from DATE NOT NULL,
      date_to DATE NOT NULL,
      promotions_ring DECIMAL(18,4) NULL,
      promotions_shell DECIMAL(18,4) NULL,
      training_ring DECIMAL(18,4) NULL,
      training_shell DECIMAL(18,4) NULL,
      staff_meal_ring DECIMAL(18,4) NULL,
      staff_meal_shell DECIMAL(18,4) NULL,
      waste_dough_grams_ring DECIMAL(18,4) NULL,
      waste_dough_grams_shell DECIMAL(18,4) NULL,
      waste_frozen_dough_ring DECIMAL(18,4) NULL,
      waste_frozen_dough_shell DECIMAL(18,4) NULL,
      buffer_jpops_ring DECIMAL(18,4) NULL,
      buffer_jpops_shell DECIMAL(18,4) NULL,
      created_at DATETIME2(7) NOT NULL CONSTRAINT DF_dts_summary_input_created_at DEFAULT (SYSUTCDATETIME()),
      updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_dts_summary_input_updated_at DEFAULT (SYSUTCDATETIME()),
      sync_id UNIQUEIDENTIFIER NULL CONSTRAINT DF_dts_summary_input_sync_id DEFAULT (NEWID()),
      headq_synced_at DATETIME2(7) NULL,
      headq_sync_error NVARCHAR(1000) NULL,
      CONSTRAINT CK_dts_summary_input_date_range CHECK (date_from <= date_to)
    );
  END;
  IF COL_LENGTH(N'dbo.dts_summary_input', N'sync_id') IS NULL
    ALTER TABLE dbo.dts_summary_input ADD sync_id UNIQUEIDENTIFIER NULL;
  IF COL_LENGTH(N'dbo.dts_summary_input', N'headq_synced_at') IS NULL
    ALTER TABLE dbo.dts_summary_input ADD headq_synced_at DATETIME2(7) NULL;
  IF COL_LENGTH(N'dbo.dts_summary_input', N'headq_sync_error') IS NULL
    ALTER TABLE dbo.dts_summary_input ADD headq_sync_error NVARCHAR(1000) NULL;
  IF COL_LENGTH(N'dbo.dts_summary_input', N'created_at') IS NULL
    ALTER TABLE dbo.dts_summary_input ADD created_at DATETIME2(7) NOT NULL CONSTRAINT DF_dts_summary_input_created_at_migration DEFAULT (SYSUTCDATETIME());
  IF COL_LENGTH(N'dbo.dts_summary_input', N'updated_at') IS NULL
    ALTER TABLE dbo.dts_summary_input ADD updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_dts_summary_input_updated_at_migration DEFAULT (SYSUTCDATETIME());
  IF NOT EXISTS (SELECT 1 FROM sys.default_constraints dc JOIN sys.columns c
    ON c.object_id=dc.parent_object_id AND c.column_id=dc.parent_column_id
    WHERE dc.parent_object_id=OBJECT_ID(N'dbo.dts_summary_input') AND c.name=N'sync_id')
    ALTER TABLE dbo.dts_summary_input ADD CONSTRAINT DF_dts_summary_input_sync_id DEFAULT (NEWID()) FOR sync_id;
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.dts_summary_input') AND name=N'UX_dts_summary_input_period')
    CREATE UNIQUE INDEX UX_dts_summary_input_period ON dbo.dts_summary_input(locationname, date_from, date_to);
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.dts_summary_input') AND name=N'UX_dts_summary_input_sync_id')
    CREATE UNIQUE INDEX UX_dts_summary_input_sync_id ON dbo.dts_summary_input(sync_id) WHERE sync_id IS NOT NULL;
`

async function ensureTable(pool: sql.ConnectionPool): Promise<void> {
  await pool.request().query(summarySchema)
}

export async function loadHourlySummaryInput(input: HourlySummaryInputKey): Promise<{
  found: boolean
  values: HourlySummaryInputValues
}> {
  const pool = await getLocalDbPool()
  await ensureTable(pool)
  const exact = await pool.request()
    .input('locationName', sql.VarChar(50), input.locationName)
    .input('dateFrom', sql.Date, input.dateFrom)
    .input('dateTo', sql.Date, input.dateTo)
    .query(`SELECT TOP (1) * FROM dbo.dts_summary_input
      WHERE locationname=@locationName AND date_from=@dateFrom AND date_to=@dateTo`)
  if (exact.recordset.length) {
    const row = exact.recordset[0]
    const values = emptyValues()
    for (const column of hourlySummaryInputColumns) values[column] = row[column] == null ? null : Number(row[column])
    return { found: true, values }
  }

  if (input.dateFrom === input.dateTo) return { found: false, values: emptyValues() }

  const daily = await pool.request()
    .input('locationName', sql.VarChar(50), input.locationName)
    .input('dateFrom', sql.Date, input.dateFrom)
    .input('dateTo', sql.Date, input.dateTo)
    .query(`SELECT ${hourlySummaryInputColumns.map((column) => `SUM(${column}) AS ${column}`).join(', ')}
      FROM dbo.dts_summary_input WHERE locationname=@locationName
      AND date_from=date_to AND date_from >= @dateFrom AND date_to <= @dateTo`)
  const values = emptyValues()
  const row = daily.recordset[0]
  for (const column of hourlySummaryInputColumns) values[column] = row?.[column] == null ? null : Number(row[column])
  return { found: daily.recordset.some((candidate) => hourlySummaryInputColumns.some((column) => candidate[column] != null)), values }
}

export async function saveHourlySummaryInput(input: SaveHourlySummaryInput): Promise<string | null> {
  const pool = await getLocalDbPool()
  await ensureTable(pool)
  const request = pool.request()
    .input('locationName', sql.VarChar(50), input.locationName)
    .input('dateFrom', sql.Date, input.dateFrom)
    .input('dateTo', sql.Date, input.dateTo)
  for (const column of hourlySummaryInputColumns) request.input(column, sql.Decimal(18, 4), input.values[column])
  const columns = hourlySummaryInputColumns.join(', ')
  const parameters = hourlySummaryInputColumns.map((column) => `@${column}`).join(', ')
  const assignments = hourlySummaryInputColumns.map((column) => `${column}=@${column}`).join(', ')
  const result = await request.query(`
    UPDATE dbo.dts_summary_input WITH (UPDLOCK, SERIALIZABLE)
    SET ${assignments}, updated_at=SYSUTCDATETIME(), sync_id=COALESCE(sync_id, NEWID()),
        headq_synced_at=NULL, headq_sync_error=NULL
    WHERE locationname=@locationName AND date_from=@dateFrom AND date_to=@dateTo;
    IF @@ROWCOUNT=0
      INSERT INTO dbo.dts_summary_input(locationname,date_from,date_to,${columns},sync_id,headq_synced_at,headq_sync_error)
      VALUES(@locationName,@dateFrom,@dateTo,${parameters},NEWID(),NULL,NULL);
    SELECT CONVERT(VARCHAR(36),sync_id) AS syncId FROM dbo.dts_summary_input
    WHERE locationname=@locationName AND date_from=@dateFrom AND date_to=@dateTo;
  `)
  const syncId = result.recordset[0]?.syncId as string | undefined
  return syncId ? syncSummaryInputs([syncId]) : 'Saved locally, but the sync ID could not be read.'
}

export function syncPendingSummaryInputs(syncIds?: string[]): Promise<number> {
  if (syncing) return syncing.then(() => syncIds ? syncPendingSummaryInputs(syncIds) : 0)
  syncing = syncPendingSummaryInputsOnce(syncIds).finally(() => { syncing = null })
  return syncing
}

async function ensureHourlyTable(): Promise<sql.ConnectionPool> {
  const config = await getDatabaseSqlConfig('hourly')
  const target = `${config.server}/${config.database}`
  const pool = await getHourlyDbPool()
  if (hourlyReadyTarget !== target) {
    await ensureTable(pool)
    await pool.request().query(`UPDATE dbo.dts_summary_input
      SET headq_synced_at=DATEADD(HOUR,8,SYSUTCDATETIME())
      WHERE sync_id IS NOT NULL AND headq_synced_at IS NULL`)
    hourlyReadyTarget = target
  }
  return pool
}

async function syncPendingSummaryInputsOnce(syncIds?: string[]): Promise<number> {
  const local = await getLocalDbPool()
  await ensureTable(local)
  const idFilter = syncIds?.length
    ? `AND sync_id IN (${syncIds.map((_, index) => `@id${index}`).join(',')})`
    : ''
  const request = local.request()
  syncIds?.forEach((id, index) => request.input(`id${index}`, sql.UniqueIdentifier, id))
  const pending = await request.query(`SELECT TOP (100) * FROM dbo.dts_summary_input
    WHERE sync_id IS NOT NULL AND headq_synced_at IS NULL ${idFilter} ORDER BY updated_at, sync_id`)
  if (!pending.recordset.length) return 0
  const remote = await ensureHourlyTable()
  for (const row of pending.recordset) {
    const syncId = String(row.sync_id)
    try {
      const targetRequest = remote.request()
        .input('syncId', sql.UniqueIdentifier, syncId)
        .input('locationName', sql.VarChar(50), row.locationname)
        .input('dateFrom', sql.Date, row.date_from)
        .input('dateTo', sql.Date, row.date_to)
      for (const column of hourlySummaryInputColumns) targetRequest.input(column, sql.Decimal(18, 4), row[column])
      const columns = hourlySummaryInputColumns.join(', ')
      const parameters = hourlySummaryInputColumns.map((column) => `@${column}`).join(', ')
      const assignments = hourlySummaryInputColumns.map((column) => `${column}=@${column}`).join(', ')
      await targetRequest.query(`
        IF EXISTS (SELECT 1 FROM dbo.dts_summary_input WITH (UPDLOCK,HOLDLOCK) WHERE sync_id=@syncId)
          UPDATE dbo.dts_summary_input SET locationname=@locationName,date_from=@dateFrom,date_to=@dateTo,
            ${assignments},updated_at=SYSUTCDATETIME(),headq_synced_at=DATEADD(HOUR,8,SYSUTCDATETIME()),headq_sync_error=NULL
          WHERE sync_id=@syncId;
        ELSE
          INSERT INTO dbo.dts_summary_input(locationname,date_from,date_to,${columns},sync_id,headq_synced_at,headq_sync_error)
          VALUES(@locationName,@dateFrom,@dateTo,${parameters},@syncId,DATEADD(HOUR,8,SYSUTCDATETIME()),NULL);
      `)
      await local.request().input('syncId', sql.UniqueIdentifier, syncId).query(`
        UPDATE dbo.dts_summary_input SET headq_synced_at=DATEADD(HOUR,8,SYSUTCDATETIME()),headq_sync_error=NULL
        WHERE sync_id=@syncId AND headq_synced_at IS NULL`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await local.request().input('syncId', sql.UniqueIdentifier, syncId)
        .input('syncError', sql.NVarChar(1000), message.slice(0, 1000)).query(`
          UPDATE dbo.dts_summary_input SET headq_sync_error=@syncError
          WHERE sync_id=@syncId AND headq_synced_at IS NULL`)
      console.error(`Unable to sync Donut summary inputs ${syncId} to OracleDB.`, error)
    }
  }
  const remainingRequest = local.request()
  syncIds?.forEach((id, index) => remainingRequest.input(`id${index}`, sql.UniqueIdentifier, id))
  const remaining = await remainingRequest.query<{ count: number }>(`SELECT COUNT(*) AS count
    FROM dbo.dts_summary_input WHERE sync_id IS NOT NULL AND headq_synced_at IS NULL ${idFilter}`)
  return Number(remaining.recordset[0]?.count ?? 0)
}

async function syncSummaryInputs(syncIds: string[]): Promise<string | null> {
  try {
    const pending = await syncPendingSummaryInputs(syncIds)
    if (pending === 0) return null
    const request = (await getLocalDbPool()).request().input('syncId', sql.UniqueIdentifier, syncIds[0])
    const result = await request.query(`SELECT headq_sync_error FROM dbo.dts_summary_input WHERE sync_id=@syncId`)
    return result.recordset[0]?.headq_sync_error || `${pending} summary input record(s) pending sync.`
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}
