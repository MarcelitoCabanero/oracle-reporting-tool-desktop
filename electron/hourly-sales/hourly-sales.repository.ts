import sql from 'mssql'
import { randomUUID } from 'node:crypto'

import {
  getLocalDbPool,
} from '../database/localdb.js'
import { getHeadqDbPool } from '../database/headqdb.js'

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
  await ensureLocalHourlySyncColumns(pool)
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
        .input('syncId', sql.UniqueIdentifier, randomUUID())
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
            created_at,
            sync_id,
            headq_synced_at,
            headq_sync_error
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
            DATEADD(HOUR, 8, SYSUTCDATETIME()),
            @syncId,
            NULL,
            NULL
          );
        `)
    }

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }

  void syncPendingHourlyEntries().catch((error: unknown) => {
    console.error('Hourly entries were saved on the POS, but HEADQ sync could not run.', error)
  })
}

interface PendingHourlyEntry {
  id: number
  syncId: string
  kind: 'produce' | 'waste'
  timeValue: string
  entryDate: Date
  shellQty: number
  ringQty: number
  jpopsQty: number
  remarks: string
  locationName: string
  businessDate: Date
  createdAt: Date
}

async function ensureLocalHourlySyncColumns(pool: sql.ConnectionPool): Promise<void> {
  await pool.request().query(`
    IF COL_LENGTH(N'dbo.dts_produce', N'sync_id') IS NULL
      ALTER TABLE dbo.dts_produce ADD sync_id UNIQUEIDENTIFIER NULL;
    IF COL_LENGTH(N'dbo.dts_produce', N'headq_synced_at') IS NULL
      ALTER TABLE dbo.dts_produce ADD headq_synced_at DATETIME2 NULL;
    IF COL_LENGTH(N'dbo.dts_produce', N'headq_sync_error') IS NULL
      ALTER TABLE dbo.dts_produce ADD headq_sync_error NVARCHAR(1000) NULL;

    IF COL_LENGTH(N'dbo.dts_waste', N'sync_id') IS NULL
      ALTER TABLE dbo.dts_waste ADD sync_id UNIQUEIDENTIFIER NULL;
    IF COL_LENGTH(N'dbo.dts_waste', N'headq_synced_at') IS NULL
      ALTER TABLE dbo.dts_waste ADD headq_synced_at DATETIME2 NULL;
    IF COL_LENGTH(N'dbo.dts_waste', N'headq_sync_error') IS NULL
      ALTER TABLE dbo.dts_waste ADD headq_sync_error NVARCHAR(1000) NULL;
  `)

  await pool.request().query(`
    IF OBJECT_ID(N'dbo.hourly_entry_sync_outbox', N'U') IS NOT NULL
    BEGIN
      EXEC(N'
        UPDATE produce
        SET
          produce.sync_id = outbox.sync_id,
          produce.headq_synced_at = outbox.synced_at,
          produce.headq_sync_error = outbox.last_error
        FROM dbo.dts_produce AS produce
        INNER JOIN dbo.hourly_entry_sync_outbox AS outbox
          ON outbox.kind = ''produce''
          AND outbox.origin_id = produce.produce_id
        WHERE produce.sync_id IS NULL;

        UPDATE waste
        SET
          waste.sync_id = outbox.sync_id,
          waste.headq_synced_at = outbox.synced_at,
          waste.headq_sync_error = outbox.last_error
        FROM dbo.dts_waste AS waste
        INNER JOIN dbo.hourly_entry_sync_outbox AS outbox
          ON outbox.kind = ''waste''
          AND outbox.origin_id = waste.waste_id
        WHERE waste.sync_id IS NULL;
      ')

      DROP TABLE dbo.hourly_entry_sync_outbox;
    END

    IF NOT EXISTS
    (
      SELECT 1 FROM sys.default_constraints AS defaults
      INNER JOIN sys.columns AS columns
        ON columns.object_id = defaults.parent_object_id
        AND columns.column_id = defaults.parent_column_id
      WHERE defaults.parent_object_id = OBJECT_ID(N'dbo.dts_produce')
        AND columns.name = N'sync_id'
    )
      ALTER TABLE dbo.dts_produce
        ADD CONSTRAINT DF_pos_dts_produce_sync_id DEFAULT (NEWID()) FOR sync_id;

    IF NOT EXISTS
    (
      SELECT 1 FROM sys.default_constraints AS defaults
      INNER JOIN sys.columns AS columns
        ON columns.object_id = defaults.parent_object_id
        AND columns.column_id = defaults.parent_column_id
      WHERE defaults.parent_object_id = OBJECT_ID(N'dbo.dts_waste')
        AND columns.name = N'sync_id'
    )
      ALTER TABLE dbo.dts_waste
        ADD CONSTRAINT DF_pos_dts_waste_sync_id DEFAULT (NEWID()) FOR sync_id;

    IF NOT EXISTS
    (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID(N'dbo.dts_produce')
        AND name = N'UX_pos_dts_produce_sync_id'
    )
      CREATE UNIQUE INDEX UX_pos_dts_produce_sync_id
        ON dbo.dts_produce(sync_id) WHERE sync_id IS NOT NULL;

    IF NOT EXISTS
    (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID(N'dbo.dts_waste')
        AND name = N'UX_pos_dts_waste_sync_id'
    )
      CREATE UNIQUE INDEX UX_pos_dts_waste_sync_id
        ON dbo.dts_waste(sync_id) WHERE sync_id IS NOT NULL;
  `)

  await ensureProduceTimeCategoryIndex(pool)
}

async function ensureProduceTimeCategoryIndex(pool: sql.ConnectionPool): Promise<void> {
  await pool.request().query(`
    IF EXISTS
    (
      SELECT 1 FROM sys.key_constraints
      WHERE parent_object_id = OBJECT_ID(N'dbo.dts_produce')
        AND name = N'UQ_dts_produce_time_date'
    )
      ALTER TABLE dbo.dts_produce
        DROP CONSTRAINT UQ_dts_produce_time_date;

    IF EXISTS
    (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID(N'dbo.dts_produce')
        AND name = N'UQ_dts_produce_time_date'
    )
      DROP INDEX UQ_dts_produce_time_date ON dbo.dts_produce;

    IF NOT EXISTS
    (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID(N'dbo.dts_produce')
        AND name = N'UQ_dts_produce_time_date'
    )
      CREATE UNIQUE INDEX UQ_dts_produce_time_date
        ON dbo.dts_produce(time_mixing, date_mix, Remarks);
  `)
}

const createHeadqTablesSchema = `
  IF OBJECT_ID(N'dbo.dts_produce', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.dts_produce
    (
      produce_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      time_mixing VARCHAR(50) NOT NULL,
      date_mix DATE NOT NULL,
      shell_qty INT NOT NULL,
      ring_qty INT NOT NULL,
      jpops_qty INT NOT NULL,
      Remarks VARCHAR(50) NOT NULL,
      locationname VARCHAR(50) NOT NULL,
      businessdate DATE NOT NULL,
      created_at DATETIME2 NOT NULL,
      sync_id UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_dts_produce_sync_id DEFAULT (NEWID()),
      headq_synced_at DATETIME2 NULL,
      headq_sync_error NVARCHAR(1000) NULL
    );
  END

  IF OBJECT_ID(N'dbo.dts_waste', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.dts_waste
    (
      waste_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      time_waste VARCHAR(50) NOT NULL,
      date_waste DATE NOT NULL,
      shell_qty INT NOT NULL,
      ring_qty INT NOT NULL,
      jpops_qty INT NOT NULL,
      Remarks VARCHAR(50) NOT NULL,
      locationname VARCHAR(50) NOT NULL,
      businessdate DATE NOT NULL,
      created_at DATETIME2 NOT NULL,
      sync_id UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_dts_waste_sync_id DEFAULT (NEWID()),
      headq_synced_at DATETIME2 NULL,
      headq_sync_error NVARCHAR(1000) NULL
    );
  END
`

const addHeadqSyncIdColumnsSchema = `
  IF COL_LENGTH(N'dbo.dts_produce', N'sync_id') IS NULL
    ALTER TABLE dbo.dts_produce ADD sync_id UNIQUEIDENTIFIER NULL;
  IF COL_LENGTH(N'dbo.dts_waste', N'sync_id') IS NULL
    ALTER TABLE dbo.dts_waste ADD sync_id UNIQUEIDENTIFIER NULL;
`

const headqSyncStatusSchema = `
  IF COL_LENGTH(N'dbo.dts_produce', N'headq_synced_at') IS NULL
    ALTER TABLE dbo.dts_produce ADD headq_synced_at DATETIME2 NULL;
  IF COL_LENGTH(N'dbo.dts_produce', N'headq_sync_error') IS NULL
    ALTER TABLE dbo.dts_produce ADD headq_sync_error NVARCHAR(1000) NULL;
  IF COL_LENGTH(N'dbo.dts_waste', N'headq_synced_at') IS NULL
    ALTER TABLE dbo.dts_waste ADD headq_synced_at DATETIME2 NULL;
  IF COL_LENGTH(N'dbo.dts_waste', N'headq_sync_error') IS NULL
    ALTER TABLE dbo.dts_waste ADD headq_sync_error NVARCHAR(1000) NULL;

  UPDATE dbo.dts_produce
  SET headq_synced_at = DATEADD(HOUR, 8, SYSUTCDATETIME())
  WHERE sync_id IS NOT NULL AND headq_synced_at IS NULL;

  UPDATE dbo.dts_waste
  SET headq_synced_at = DATEADD(HOUR, 8, SYSUTCDATETIME())
  WHERE sync_id IS NOT NULL AND headq_synced_at IS NULL;
`

const headqSyncIdSchema = `
  IF EXISTS
  (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.dts_produce')
      AND name = N'sync_id'
      AND is_nullable = 1
  )
  BEGIN
    UPDATE dbo.dts_produce SET sync_id = NEWID() WHERE sync_id IS NULL;
    ALTER TABLE dbo.dts_produce ALTER COLUMN sync_id UNIQUEIDENTIFIER NOT NULL;
  END

  IF NOT EXISTS
  (
    SELECT 1
    FROM sys.default_constraints AS defaults
    INNER JOIN sys.columns AS columns
      ON columns.object_id = defaults.parent_object_id
      AND columns.column_id = defaults.parent_column_id
    WHERE defaults.parent_object_id = OBJECT_ID(N'dbo.dts_produce')
      AND columns.name = N'sync_id'
  )
    ALTER TABLE dbo.dts_produce
      ADD CONSTRAINT DF_dts_produce_sync_id DEFAULT (NEWID()) FOR sync_id;

  IF NOT EXISTS
  (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.dts_produce')
      AND name = N'UX_dts_produce_sync_id'
  )
    CREATE UNIQUE INDEX UX_dts_produce_sync_id ON dbo.dts_produce(sync_id);

  IF EXISTS
  (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.dts_waste')
      AND name = N'sync_id'
      AND is_nullable = 1
  )
  BEGIN
    UPDATE dbo.dts_waste SET sync_id = NEWID() WHERE sync_id IS NULL;
    ALTER TABLE dbo.dts_waste ALTER COLUMN sync_id UNIQUEIDENTIFIER NOT NULL;
  END

  IF NOT EXISTS
  (
    SELECT 1
    FROM sys.default_constraints AS defaults
    INNER JOIN sys.columns AS columns
      ON columns.object_id = defaults.parent_object_id
      AND columns.column_id = defaults.parent_column_id
    WHERE defaults.parent_object_id = OBJECT_ID(N'dbo.dts_waste')
      AND columns.name = N'sync_id'
  )
    ALTER TABLE dbo.dts_waste
      ADD CONSTRAINT DF_dts_waste_sync_id DEFAULT (NEWID()) FOR sync_id;

  IF NOT EXISTS
  (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.dts_waste')
      AND name = N'UX_dts_waste_sync_id'
  )
    CREATE UNIQUE INDEX UX_dts_waste_sync_id ON dbo.dts_waste(sync_id);
`

let syncingEntries: Promise<number> | null = null
let headqSchemaReady = false

export function syncPendingHourlyEntries(): Promise<number> {
  if (syncingEntries) {
    return syncingEntries
  }

  syncingEntries = syncPendingHourlyEntriesOnce().finally(() => {
    syncingEntries = null
  })

  return syncingEntries
}

async function syncPendingHourlyEntriesOnce(): Promise<number> {
  const localPool = await getLocalDbPool()
  await ensureLocalHourlySyncColumns(localPool)
  await ensureHeadqHourlySchema()

  const pendingResult = await localPool.request().query<PendingHourlyEntry>(`
    SELECT TOP (100) *
    FROM
    (
      SELECT
        produce_id AS id,
        CONVERT(VARCHAR(36), sync_id) AS syncId,
        'produce' AS kind,
        time_mixing AS timeValue,
        date_mix AS entryDate,
        shell_qty AS shellQty,
        ring_qty AS ringQty,
        jpops_qty AS jpopsQty,
        remarks,
        locationname AS locationName,
        businessdate AS businessDate,
        created_at AS createdAt
      FROM dbo.dts_produce
      WHERE sync_id IS NOT NULL AND headq_synced_at IS NULL

      UNION ALL

      SELECT
        waste_id AS id,
        CONVERT(VARCHAR(36), sync_id) AS syncId,
        'waste' AS kind,
        time_waste AS timeValue,
        date_waste AS entryDate,
        shell_qty AS shellQty,
        ring_qty AS ringQty,
        jpops_qty AS jpopsQty,
        remarks,
        locationname AS locationName,
        businessdate AS businessDate,
        created_at AS createdAt
      FROM dbo.dts_waste
      WHERE sync_id IS NOT NULL AND headq_synced_at IS NULL
    ) AS pending
    ORDER BY createdAt, syncId
  `)

  if (pendingResult.recordset.length === 0) {
    return 0
  }

  const headqPool = await getHeadqDbPool()

  for (const entry of pendingResult.recordset) {
    try {
      const isProduce = entry.kind === 'produce'
      const tableName = isProduce ? 'dbo.dts_produce' : 'dbo.dts_waste'
      const timeColumn = isProduce ? 'time_mixing' : 'time_waste'
      const dateColumn = isProduce ? 'date_mix' : 'date_waste'

      await headqPool
        .request()
        .input('syncId', sql.UniqueIdentifier, entry.syncId)
        .input('timeValue', sql.VarChar(50), entry.timeValue)
        .input('entryDate', sql.Date, entry.entryDate)
        .input('shellQty', sql.Int, entry.shellQty)
        .input('ringQty', sql.Int, entry.ringQty)
        .input('jpopsQty', sql.Int, entry.jpopsQty)
        .input('remarks', sql.VarChar(50), entry.remarks)
        .input('locationName', sql.VarChar(50), entry.locationName)
        .input('businessDate', sql.Date, entry.businessDate)
        .input('sourceCreatedAt', sql.DateTime2, entry.createdAt)
        .query(`
          IF EXISTS
          (
            SELECT 1 FROM ${tableName} WITH (UPDLOCK, HOLDLOCK)
            WHERE sync_id = @syncId
          )
          BEGIN
            UPDATE ${tableName}
            SET
              ${timeColumn} = @timeValue,
              ${dateColumn} = @entryDate,
              shell_qty = @shellQty,
              ring_qty = @ringQty,
              jpops_qty = @jpopsQty,
              Remarks = @remarks,
              locationname = @locationName,
              businessdate = @businessDate,
              created_at = @sourceCreatedAt,
              headq_synced_at = DATEADD(HOUR, 8, SYSUTCDATETIME()),
              headq_sync_error = NULL
            WHERE sync_id = @syncId;
          END
          ELSE
          BEGIN
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
              created_at,
              sync_id,
              headq_synced_at,
              headq_sync_error
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
              @sourceCreatedAt,
              @syncId,
              DATEADD(HOUR, 8, SYSUTCDATETIME()),
              NULL
            );
          END
        `)

      await localPool
        .request()
        .input('id', sql.Int, entry.id)
        .input('syncId', sql.UniqueIdentifier, entry.syncId)
        .input('timeValue', sql.VarChar(50), entry.timeValue)
        .input('entryDate', sql.Date, entry.entryDate)
        .input('shellQty', sql.Int, entry.shellQty)
        .input('ringQty', sql.Int, entry.ringQty)
        .input('jpopsQty', sql.Int, entry.jpopsQty)
        .input('remarks', sql.VarChar(50), entry.remarks)
        .input('locationName', sql.VarChar(50), entry.locationName)
        .input('businessDate', sql.Date, entry.businessDate)
        .query(`
          UPDATE ${isProduce ? 'dbo.dts_produce' : 'dbo.dts_waste'}
          SET headq_synced_at = DATEADD(HOUR, 8, SYSUTCDATETIME()),
              headq_sync_error = NULL
          WHERE ${isProduce ? 'produce_id' : 'waste_id'} = @id
            AND sync_id = @syncId
            AND headq_synced_at IS NULL
            AND ${isProduce ? 'time_mixing' : 'time_waste'} = @timeValue
            AND ${isProduce ? 'date_mix' : 'date_waste'} = @entryDate
            AND shell_qty = @shellQty
            AND ring_qty = @ringQty
            AND jpops_qty = @jpopsQty
            AND Remarks = @remarks
            AND locationname = @locationName
            AND businessdate = @businessDate
        `)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await localPool
        .request()
        .input('id', sql.Int, entry.id)
        .input('syncId', sql.UniqueIdentifier, entry.syncId)
        .input('lastError', sql.NVarChar(1000), errorMessage.slice(0, 1000))
        .query(`
          UPDATE ${entry.kind === 'produce' ? 'dbo.dts_produce' : 'dbo.dts_waste'}
          SET headq_sync_error = @lastError
          WHERE ${entry.kind === 'produce' ? 'produce_id' : 'waste_id'} = @id
            AND sync_id = @syncId
            AND headq_synced_at IS NULL
        `)
      console.error(`Unable to sync hourly ${entry.kind} entry ${entry.syncId} to HEADQ.`, error)
    }
  }

  const remainingResult = await localPool.request().query<{ pendingCount: number }>(`
    SELECT
      (SELECT COUNT(*) FROM dbo.dts_produce
       WHERE sync_id IS NOT NULL AND headq_synced_at IS NULL)
      +
      (SELECT COUNT(*) FROM dbo.dts_waste
       WHERE sync_id IS NOT NULL AND headq_synced_at IS NULL)
      AS pendingCount
  `)

  return Number(remainingResult.recordset[0]?.pendingCount ?? 0)
}

async function ensureHeadqHourlySchema(): Promise<void> {
  if (headqSchemaReady) {
    return
  }

  const headqPool = await getHeadqDbPool()
  await headqPool.request().query(createHeadqTablesSchema)
  await headqPool.request().query(addHeadqSyncIdColumnsSchema)
  await headqPool.request().query(headqSyncIdSchema)
  await headqPool.request().query(headqSyncStatusSchema)
  await ensureProduceTimeCategoryIndex(headqPool)
  headqSchemaReady = true
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
  await ensureLocalHourlySyncColumns(pool)
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
        Remarks = @remarks,
        sync_id = COALESCE(sync_id, NEWID()),
        headq_synced_at = NULL,
        headq_sync_error = NULL
      WHERE ${idColumn} = @id
        AND locationname = @locationName
    `)

  if (result.rowsAffected[0] !== 1) {
    throw new Error('The record was not found or is no longer available for this location. Refresh the records and try again.')
  }

  void syncPendingHourlyEntries().catch((error: unknown) => {
    console.error('The POS record was updated, but HEADQ sync could not run.', error)
  })
}

export async function loadHourlyReportSources(
  input: HourlyDailyReportInput,
): Promise<HourlyReportSources> {
  const pool = await getLocalDbPool()

  const [produceResult, wasteResult, salesResult, posWasteResult, posFocResult] = await Promise.all([
    pool
      .request()
      .input('businessDate', sql.Date, input.businessDate)
      .input('locationName', sql.VarChar(50), input.locationName)
      .query(`
        SELECT
          LTRIM(RTRIM(time_mixing)) AS time,
          LTRIM(RTRIM(Remarks)) AS remarks,
          SUM(CASE
            WHEN UPPER(LTRIM(RTRIM(Remarks))) = 'RECEIVED DONUTS' THEN ABS(ISNULL(shell_qty, 0))
            ELSE ISNULL(shell_qty, 0)
          END) AS shellQty,
          SUM(CASE
            WHEN UPPER(LTRIM(RTRIM(Remarks))) = 'RECEIVED DONUTS' THEN ABS(ISNULL(ring_qty, 0))
            ELSE ISNULL(ring_qty, 0)
          END) AS ringQty,
          SUM(CASE
            WHEN UPPER(LTRIM(RTRIM(Remarks))) = 'RECEIVED DONUTS' THEN ABS(ISNULL(jpops_qty, 0))
            ELSE ISNULL(jpops_qty, 0)
          END) AS jpopsQty
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
    pool
      .request()
      .input('businessDate', sql.Date, input.businessDate)
      .query(`
        SELECT
          SUM(CASE WHEN UPPER(LTRIM(RTRIM(Category))) = 'RING' THEN ISNULL(qty, 0) ELSE 0 END) AS ringFoc,
          SUM(CASE WHEN UPPER(LTRIM(RTRIM(Category))) = 'SHELL' THEN ISNULL(qty, 0) ELSE 0 END) AS shellFoc,
          SUM(CASE WHEN UPPER(LTRIM(RTRIM(Category))) = 'JPOPS' THEN ISNULL(qty, 0) ELSE 0 END) AS jpopsFoc,
          SUM(CASE WHEN UPPER(LTRIM(RTRIM(Category))) = 'JCLUB' THEN ISNULL(qty, 0) ELSE 0 END) AS jclubFoc
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
    posFoc: {
      ring: Number(posFocResult.recordset[0]?.ringFoc ?? 0),
      shell: Number(posFocResult.recordset[0]?.shellFoc ?? 0),
      jpops: Number(posFocResult.recordset[0]?.jpopsFoc ?? 0),
      jclub: Number(posFocResult.recordset[0]?.jclubFoc ?? 0),
    },
  }
}