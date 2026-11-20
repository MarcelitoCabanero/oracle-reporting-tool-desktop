import sql from 'mssql'
import { randomUUID } from 'node:crypto'

import {
  getLocalDbPool,
} from '../database/localdb.js'
import { getHourlyDbPool } from '../database/hourlydb.js'

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

  await transaction.begin()

  try {
    for (const row of input.rows) {
      await new sql.Request(transaction)
        .input('category', sql.VarChar(10), input.kind)
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
          INSERT INTO dbo.dts_hourly_entry
          (
            category,
            time_value,
            entry_date,
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
            @category,
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
    console.error('Hourly entries were saved on the POS, but OracleDB sync could not run.', error)
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
    IF OBJECT_ID(N'dbo.dts_hourly_entry', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.dts_hourly_entry
      (
        entry_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        category VARCHAR(10) NOT NULL
          CONSTRAINT CK_dts_hourly_entry_category CHECK (category IN ('produce', 'waste')),
        time_value VARCHAR(50) NOT NULL,
        entry_date DATE NOT NULL,
        shell_qty INT NOT NULL,
        ring_qty INT NOT NULL,
        jpops_qty INT NOT NULL,
        Remarks VARCHAR(50) NULL,
        locationname VARCHAR(50) NULL,
        businessdate DATE NOT NULL,
        created_at DATETIME2 NULL,
        sync_id UNIQUEIDENTIFIER NULL,
        headq_synced_at DATETIME2 NULL,
        headq_sync_error NVARCHAR(1000) NULL
      );
    END;

    IF COL_LENGTH(N'dbo.dts_hourly_entry', N'sync_id') IS NULL
      ALTER TABLE dbo.dts_hourly_entry ADD sync_id UNIQUEIDENTIFIER NULL;
    IF COL_LENGTH(N'dbo.dts_hourly_entry', N'headq_synced_at') IS NULL
      ALTER TABLE dbo.dts_hourly_entry ADD headq_synced_at DATETIME2 NULL;
    IF COL_LENGTH(N'dbo.dts_hourly_entry', N'headq_sync_error') IS NULL
      ALTER TABLE dbo.dts_hourly_entry ADD headq_sync_error NVARCHAR(1000) NULL;
  `)

  await pool.request().query(`
    IF OBJECT_ID(N'dbo.dts_produce', N'U') IS NOT NULL
    BEGIN
      INSERT INTO dbo.dts_hourly_entry
        (category, time_value, entry_date, shell_qty, ring_qty, jpops_qty, Remarks,
         locationname, businessdate, created_at, sync_id, headq_synced_at, headq_sync_error)
      SELECT
        'produce', time_mixing, date_mix, shell_qty, ring_qty, jpops_qty, Remarks,
        locationname, businessdate, created_at, sync_id, headq_synced_at, headq_sync_error
      FROM dbo.dts_produce AS p
      WHERE NOT EXISTS
      (
        SELECT 1 FROM dbo.dts_hourly_entry AS h
        WHERE h.category = 'produce'
          AND (
            (p.sync_id IS NOT NULL AND h.sync_id = p.sync_id)
            OR (p.sync_id IS NULL AND h.time_value = p.time_mixing
              AND h.entry_date = p.date_mix AND h.Remarks = p.Remarks)
          )
      );
      DROP TABLE dbo.dts_produce;
    END

    IF OBJECT_ID(N'dbo.dts_waste', N'U') IS NOT NULL
    BEGIN
      INSERT INTO dbo.dts_hourly_entry
        (category, time_value, entry_date, shell_qty, ring_qty, jpops_qty, Remarks,
         locationname, businessdate, created_at, sync_id, headq_synced_at, headq_sync_error)
      SELECT
        'waste', time_waste, date_waste, shell_qty, ring_qty, jpops_qty, Remarks,
        locationname, businessdate, created_at, sync_id, headq_synced_at, headq_sync_error
      FROM dbo.dts_waste AS w
      WHERE NOT EXISTS
      (
        SELECT 1 FROM dbo.dts_hourly_entry AS h
        WHERE h.category = 'waste'
          AND (
            (w.sync_id IS NOT NULL AND h.sync_id = w.sync_id)
            OR (w.sync_id IS NULL AND h.time_value = w.time_waste
              AND h.entry_date = w.date_waste AND h.Remarks = w.Remarks)
          )
      );
      DROP TABLE dbo.dts_waste;
    END

    IF NOT EXISTS
    (
      SELECT 1 FROM sys.default_constraints AS defaults
      INNER JOIN sys.columns AS columns
        ON columns.object_id = defaults.parent_object_id
        AND columns.column_id = defaults.parent_column_id
      WHERE defaults.parent_object_id = OBJECT_ID(N'dbo.dts_hourly_entry')
        AND columns.name = N'sync_id'
    )
      ALTER TABLE dbo.dts_hourly_entry
        ADD CONSTRAINT DF_dts_hourly_entry_sync_id DEFAULT (NEWID()) FOR sync_id;

    IF NOT EXISTS
    (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID(N'dbo.dts_hourly_entry')
        AND name = N'UX_dts_hourly_entry_sync_id'
    )
      CREATE UNIQUE INDEX UX_dts_hourly_entry_sync_id
        ON dbo.dts_hourly_entry(sync_id) WHERE sync_id IS NOT NULL;
  `)

  // Existing local entries may predate sync_id. Give them IDs while keeping
  // headq_synced_at NULL so the pending-sync query uploads them.
  await pool.request().query(`
    UPDATE dbo.dts_hourly_entry
    SET sync_id = NEWID()
    WHERE sync_id IS NULL;
  `)
  await ensureProduceTimeCategoryIndex(pool)
}

async function ensureProduceTimeCategoryIndex(pool: sql.ConnectionPool): Promise<void> {
  await pool.request().query(`
    IF EXISTS
    (
      SELECT 1 FROM sys.key_constraints
      WHERE parent_object_id = OBJECT_ID(N'dbo.dts_hourly_entry')
        AND name = N'UQ_dts_hourly_entry_time_category'
    )
      ALTER TABLE dbo.dts_hourly_entry
        DROP CONSTRAINT UQ_dts_hourly_entry_time_category;

    IF EXISTS
    (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID(N'dbo.dts_hourly_entry')
        AND name = N'UQ_dts_hourly_entry_time_category'
    )
      DROP INDEX UQ_dts_hourly_entry_time_category ON dbo.dts_hourly_entry;

    IF NOT EXISTS
    (
      SELECT 1 FROM sys.indexes
      WHERE object_id = OBJECT_ID(N'dbo.dts_hourly_entry')
        AND name = N'UQ_dts_hourly_entry_location_time_category'
    )
      CREATE UNIQUE INDEX UQ_dts_hourly_entry_location_time_category
        ON dbo.dts_hourly_entry(locationname, time_value, entry_date, Remarks, category);
  `)
}

const createHourlyTableSchema = `
  IF OBJECT_ID(N'dbo.dts_hourly_entry', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.dts_hourly_entry
    (
      entry_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
      category VARCHAR(10) NOT NULL
        CONSTRAINT CK_dts_hourly_entry_category CHECK (category IN ('produce', 'waste')),
      time_value VARCHAR(50) NOT NULL,
      entry_date DATE NOT NULL,
      shell_qty INT NOT NULL,
      ring_qty INT NOT NULL,
      jpops_qty INT NOT NULL,
      Remarks VARCHAR(50) NOT NULL,
      locationname VARCHAR(50) NOT NULL,
      businessdate DATE NOT NULL,
      created_at DATETIME2 NOT NULL,
      sync_id UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_dts_hourly_entry_sync_id DEFAULT (NEWID()),
      headq_synced_at DATETIME2 NULL,
      headq_sync_error NVARCHAR(1000) NULL
    );
  END
`

const addHourlySyncIdColumnsSchema = `
  IF COL_LENGTH(N'dbo.dts_hourly_entry', N'sync_id') IS NULL
    ALTER TABLE dbo.dts_hourly_entry ADD sync_id UNIQUEIDENTIFIER NULL;
`

const hourlySyncStatusSchema = `
  IF COL_LENGTH(N'dbo.dts_hourly_entry', N'headq_synced_at') IS NULL
    ALTER TABLE dbo.dts_hourly_entry ADD headq_synced_at DATETIME2 NULL;
  IF COL_LENGTH(N'dbo.dts_hourly_entry', N'headq_sync_error') IS NULL
    ALTER TABLE dbo.dts_hourly_entry ADD headq_sync_error NVARCHAR(1000) NULL;

  UPDATE dbo.dts_hourly_entry
  SET headq_synced_at = DATEADD(HOUR, 8, SYSUTCDATETIME())
  WHERE sync_id IS NOT NULL AND headq_synced_at IS NULL;
`

const hourlySyncIdSchema = `
  IF EXISTS
  (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.dts_hourly_entry')
      AND name = N'sync_id'
      AND is_nullable = 1
  )
  BEGIN
    UPDATE dbo.dts_hourly_entry SET sync_id = NEWID() WHERE sync_id IS NULL;
    ALTER TABLE dbo.dts_hourly_entry ALTER COLUMN sync_id UNIQUEIDENTIFIER NOT NULL;
  END

  IF NOT EXISTS
  (
    SELECT 1
    FROM sys.default_constraints AS defaults
    INNER JOIN sys.columns AS columns
      ON columns.object_id = defaults.parent_object_id
      AND columns.column_id = defaults.parent_column_id
    WHERE defaults.parent_object_id = OBJECT_ID(N'dbo.dts_hourly_entry')
      AND columns.name = N'sync_id'
  )
    ALTER TABLE dbo.dts_hourly_entry
    ADD CONSTRAINT DF_dts_hourly_entry_sync_id DEFAULT (NEWID()) FOR sync_id;

  IF NOT EXISTS
  (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.dts_hourly_entry')
    AND name = N'UX_dts_hourly_entry_sync_id'
  )
    CREATE UNIQUE INDEX UX_dts_hourly_entry_sync_id ON dbo.dts_hourly_entry(sync_id);
`

let syncingEntries: Promise<number> | null = null
let hourlySchemaReady = false

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
  await ensureHourlySchema()

  const pendingResult = await localPool.request().query<PendingHourlyEntry>(`
    SELECT TOP (100) *
    FROM
    (
      SELECT
        entry_id AS id,
        CONVERT(VARCHAR(36), sync_id) AS syncId,
        category AS kind,
        time_value AS timeValue,
        entry_date AS entryDate,
        shell_qty AS shellQty,
        ring_qty AS ringQty,
        jpops_qty AS jpopsQty,
        Remarks AS remarks,
        locationname AS locationName,
        businessdate AS businessDate,
        created_at AS createdAt
      FROM dbo.dts_hourly_entry
      WHERE sync_id IS NOT NULL AND headq_synced_at IS NULL
    ) AS pending
    ORDER BY createdAt, syncId
  `)

  if (pendingResult.recordset.length === 0) {
    return 0
  }

  const hourlyPool = await getHourlyDbPool()

  for (const entry of pendingResult.recordset) {
    try {
      await hourlyPool
        .request()
        .input('syncId', sql.UniqueIdentifier, entry.syncId)
        .input('category', sql.VarChar(10), entry.kind)
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
            SELECT 1 FROM dbo.dts_hourly_entry WITH (UPDLOCK, HOLDLOCK)
            WHERE sync_id = @syncId
          )
          BEGIN
            UPDATE dbo.dts_hourly_entry
            SET
              category = @category,
              time_value = @timeValue,
              entry_date = @entryDate,
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
            INSERT INTO dbo.dts_hourly_entry
            (
              category,
              time_value,
              entry_date,
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
              @category,
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
          UPDATE dbo.dts_hourly_entry
          SET headq_synced_at = DATEADD(HOUR, 8, SYSUTCDATETIME()),
              headq_sync_error = NULL
          WHERE entry_id = @id
            AND sync_id = @syncId
            AND headq_synced_at IS NULL
            AND time_value = @timeValue
            AND entry_date = @entryDate
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
          UPDATE dbo.dts_hourly_entry
          SET headq_sync_error = @lastError
          WHERE entry_id = @id
            AND sync_id = @syncId
            AND headq_synced_at IS NULL
        `)
      console.error(`Unable to sync hourly ${entry.kind} entry ${entry.syncId} to OracleDB.`, error)
    }
  }

  const remainingResult = await localPool.request().query<{ pendingCount: number }>(`
    SELECT COUNT(*) AS pendingCount
    FROM dbo.dts_hourly_entry
    WHERE sync_id IS NOT NULL AND headq_synced_at IS NULL
  `)

  return Number(remainingResult.recordset[0]?.pendingCount ?? 0)
}

async function ensureHourlySchema(): Promise<void> {
  if (hourlySchemaReady) {
    return
  }

  const hourlyPool = await getHourlyDbPool()
  await hourlyPool.request().query(createHourlyTableSchema)
  await hourlyPool.request().query(addHourlySyncIdColumnsSchema)
  await hourlyPool.request().query(hourlySyncIdSchema)
  await hourlyPool.request().query(hourlySyncStatusSchema)
  await ensureProduceTimeCategoryIndex(hourlyPool)
  hourlySchemaReady = true
}

export async function loadHourlyRecords(
  input: HourlyRecordsInput,
): Promise<HourlyRecord[]> {
  const pool = await getLocalDbPool()
  const result = await pool
    .request()
    .input('startDate', sql.Date, input.startDate)
    .input('endDate', sql.Date, input.endDate)
    .input('locationName', sql.VarChar(50), input.locationName)
    .query(`
      SELECT
        entry_id AS id,
        category AS kind,
        CONVERT(char(10), entry_date, 23) AS entryDate,
        LTRIM(RTRIM(time_value)) AS time,
        ISNULL(shell_qty, 0) AS shellQty,
        ISNULL(ring_qty, 0) AS ringQty,
        ISNULL(jpops_qty, 0) AS jpopsQty,
        LTRIM(RTRIM(Remarks)) AS remarks
      FROM dbo.dts_hourly_entry
      WHERE entry_date >= @startDate
        AND entry_date < DATEADD(day, 1, @endDate)
        AND locationname = @locationName
      ORDER BY entry_date DESC, time_value
    `)

  return result.recordset.map((row): HourlyRecord => ({
    id: Number(row.id),
    kind: row.kind === 'waste' ? 'waste' : 'produce',
    entryDate: String(row.entryDate ?? ''),
    time: String(row.time ?? ''),
    shellQty: Number(row.shellQty ?? 0),
    ringQty: Number(row.ringQty ?? 0),
    jpopsQty: Number(row.jpopsQty ?? 0),
    remarks: String(row.remarks ?? ''),
  })).sort((left, right) =>
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
    .input('category', sql.VarChar(10), input.kind)
    .query(`
      UPDATE dbo.dts_hourly_entry
      SET
        entry_date = @entryDate,
        time_value = @timeValue,
        shell_qty = @shellQty,
        ring_qty = @ringQty,
        jpops_qty = @jpopsQty,
        Remarks = @remarks,
        sync_id = COALESCE(sync_id, NEWID()),
        headq_synced_at = NULL,
        headq_sync_error = NULL
      WHERE entry_id = @id
        AND category = @category
        AND locationname = @locationName
    `)

  if (result.rowsAffected[0] !== 1) {
    throw new Error('The record was not found or is no longer available for this location. Refresh the records and try again.')
  }

  void syncPendingHourlyEntries().catch((error: unknown) => {
    console.error('The POS record was updated, but OracleDB sync could not run.', error)
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
          LTRIM(RTRIM(time_value)) AS time,
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
        FROM dbo.dts_hourly_entry
        WHERE category = 'produce'
          AND entry_date = @businessDate
          AND locationname = @locationName
        GROUP BY time_value, Remarks
      `),
    pool
      .request()
      .input('businessDate', sql.Date, input.businessDate)
      .input('locationName', sql.VarChar(50), input.locationName)
      .query(`
        SELECT
          LTRIM(RTRIM(time_value)) AS time,
          LTRIM(RTRIM(Remarks)) AS remarks,
          SUM(ISNULL(shell_qty, 0)) AS shellQty,
          SUM(ISNULL(ring_qty, 0)) AS ringQty,
          SUM(ISNULL(jpops_qty, 0)) AS jpopsQty
        FROM dbo.dts_hourly_entry
        WHERE category = 'waste'
          AND entry_date = @businessDate
          AND locationname = @locationName
        GROUP BY time_value, Remarks
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