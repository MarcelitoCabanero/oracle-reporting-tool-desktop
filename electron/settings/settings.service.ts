import { app, safeStorage } from 'electron'
import { Client } from 'basic-ftp'
import sql from 'mssql'
import fs from 'node:fs/promises'
import path from 'node:path'
import 'dotenv/config'

import type {
  ConnectionSettings,
  ConnectionSettingsView,
  DatabaseKey,
  LocationOption,
} from './settings.types.js'

const settingsFileName = 'connection-settings.bin'
const databaseKeys: DatabaseKey[] = ['local', 'hq', 'hourly']

function normalizeConnectionField(value: unknown): string {
  const raw = String(value ?? '')
  const normalized = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim()
  if (normalized !== raw.trim()) {
    console.warn('Removed invalid control characters from a saved SQL connection field.')
  }
  return normalized
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), settingsFileName)
}

function environmentSettings(): ConnectionSettings {
  const hqUser = process.env.HQ_DB_USER ?? ''
  const hqPassword = process.env.HQ_DB_PASSWORD ?? ''
  const port = Number(process.env.HQ_DB_PORT || 1433)

  return {
    databases: {
      local: {
        server: process.env.LOCAL_DB_SERVER || 'POS2',
        database: process.env.LOCAL_DB_DATABASE || 'CheckPostingDB',
        username: process.env.LOCAL_DB_USER ?? '',
        password: process.env.LOCAL_DB_PASSWORD ?? '',
        port: Number(process.env.LOCAL_DB_PORT || 1433),
      },
      hq: {
        server: process.env.HQ_DB_SERVER || '209.141.7.222',
        database: process.env.HQ_DB_DATABASE || 'OracleDB',
        username: hqUser,
        password: hqPassword,
        port,
      },
      hourly: {
        server: process.env.HQ_DB_SERVER || '209.141.7.222',
        database: process.env.HQ_DB_DATABASE || 'OracleDB',
        username: hqUser,
        password: hqPassword,
        port,
      },
    },
    ftp: {
      host: process.env.FTP_HOST ?? '',
      username: process.env.FTP_USER ?? '',
      password: process.env.FTP_PASSWORD ?? '',
      secure: process.env.FTP_SECURE === 'true',
    },
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
  }
}

async function loadStoredSettings(): Promise<Partial<ConnectionSettings> | null> {
  try {
    const encrypted = await fs.readFile(settingsPath())
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Secure storage is unavailable on this device.')
    }

    return JSON.parse(safeStorage.decryptString(encrypted)) as Partial<ConnectionSettings>
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

export async function getConnectionSettings(): Promise<ConnectionSettings> {
  const defaults = environmentSettings()
  const stored = await loadStoredSettings()
  if (!stored) return defaults

  const databases = { ...defaults.databases }
  for (const key of databaseKeys) {
    const saved = stored.databases?.[key]
    if (saved) {
      databases[key] = { ...defaults.databases[key], ...saved }
    }
    databases[key] = {
      ...databases[key],
      server: normalizeConnectionField(databases[key].server),
      database: normalizeConnectionField(databases[key].database),
      username: normalizeConnectionField(databases[key].username),
    }
  }

  // Hourly sales sync shares the HQ connection, including its database.
  databases.hourly = { ...databases.hq }

  return {
    ...defaults,
    ...stored,
    databases,
    ftp: { ...defaults.ftp, ...stored.ftp },
  }
}

export async function getConnectionSettingsView(): Promise<ConnectionSettingsView> {
  const settings = await getConnectionSettings()
  const databases = Object.fromEntries(
    databaseKeys.map((key) => {
      const { password, ...connection } = settings.databases[key]
      return [key, { ...connection, password: '', passwordConfigured: Boolean(password) }]
    }),
  ) as ConnectionSettingsView['databases']
  const { password, ...ftp } = settings.ftp

  return {
    databases,
    ftp: { ...ftp, password: '', passwordConfigured: Boolean(password) },
    encrypt: settings.encrypt,
    trustServerCertificate: settings.trustServerCertificate,
  }
}

function mergeSettings(
  current: ConnectionSettings,
  input: ConnectionSettings,
): ConnectionSettings {
  const databases = { ...current.databases }
  for (const key of databaseKeys) {
    const candidate = input.databases[key]
    databases[key] = {
      server: normalizeConnectionField(candidate.server),
      database: normalizeConnectionField(candidate.database),
      username: normalizeConnectionField(candidate.username),
      password: String(candidate.password || current.databases[key].password),
      port: Number(candidate.port),
    }
    if (key === 'local' || key === 'hq') {
      if (!Number.isInteger(databases[key].port) || databases[key].port < 1 || databases[key].port > 65535) {
        throw new Error(`${key} database port must be between 1 and 65535.`)
      }
    }
  }
  databases.hourly = { ...databases.hq }

  return {
    databases,
    ftp: {
      host: String(input.ftp.host ?? '').trim(),
      username: String(input.ftp.username ?? '').trim(),
      password: String(input.ftp.password || current.ftp.password),
      secure: Boolean(input.ftp.secure),
    },
    encrypt: Boolean(input.encrypt),
    trustServerCertificate: Boolean(input.trustServerCertificate),
  }
}

export async function saveConnectionSettings(input: ConnectionSettings): Promise<void> {
  const current = await getConnectionSettings()
  const settings = mergeSettings(current, input)
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure credential storage is unavailable on this device; settings were not saved.')
  }

  await fs.mkdir(app.getPath('userData'), { recursive: true })
  const encrypted = safeStorage.encryptString(JSON.stringify(settings))
  const file = settingsPath()
  const temporaryFile = `${file}.tmp`
  await fs.writeFile(temporaryFile, encrypted)
  await fs.rename(temporaryFile, file)
}

function createSqlConfig(settings: ConnectionSettings, key: DatabaseKey): sql.config {
  const database = settings.databases[key]
  if (!database.server || !database.database || !database.username || !database.password) {
    throw new Error(`Configure the ${key} database server, database, username, and password first.`)
  }

  return {
    server: database.server,
    database: database.database,
    user: database.username,
    password: database.password,
    port: database.port,
    options: {
      encrypt: settings.encrypt,
      trustServerCertificate: settings.trustServerCertificate,
    },
    connectionTimeout: 10000,
    requestTimeout: 10000,
  }
}

export async function getDatabaseSqlConfig(key: DatabaseKey): Promise<sql.config> {
  return createSqlConfig(await getConnectionSettings(), key)
}

export async function testDatabaseConnection(
  settings: ConnectionSettings,
  key: DatabaseKey,
): Promise<void> {
  const pool = new sql.ConnectionPool(createSqlConfig(settings, key))
  try {
    await pool.connect()
    await pool.request().query('SELECT 1 AS healthcheck')
  } finally {
    if (pool.connected) await pool.close()
  }
}

export async function testDatabaseSettings(
  input: ConnectionSettings,
  key: DatabaseKey,
): Promise<void> {
  await testDatabaseConnection(mergeSettings(await getConnectionSettings(), input), key)
}

export async function testFtpConnection(settings: ConnectionSettings): Promise<void> {
  const { host, username, password, secure } = settings.ftp
  if (!host || !username || !password) {
    throw new Error('Configure the FTP host, username, and password first.')
  }

  const client = new Client()
  try {
    await client.access({ host, user: username, password, secure })
    await client.list()
  } finally {
    client.close()
  }
}

export async function testFtpSettings(input: ConnectionSettings): Promise<void> {
  await testFtpConnection(mergeSettings(await getConnectionSettings(), input))
}

export async function getLocationOptions(input: ConnectionSettings): Promise<LocationOption[]> {
  const settings = mergeSettings(await getConnectionSettings(), input)
  const pool = new sql.ConnectionPool(createSqlConfig(settings, 'hourly'))

  try {
    await pool.connect()
    const result = await pool.request().query(`
      SELECT LOCATIONID AS locationId, LOCATIONNAME AS locationName
      FROM dbo.dts_location
      WHERE IsActive = 1
        AND LOWER(LTRIM(RTRIM(access))) = 'store'
      ORDER BY LOCATIONNAME
    `)

    return result.recordset.map((row) => ({
      locationId: Number(row.locationId),
      locationName: String(row.locationName ?? ''),
    }))
  } finally {
    if (pool.connected) await pool.close()
  }
}

export async function getFirstRunStoreOptions(): Promise<LocationOption[]> {
  const settings = await getConnectionSettings()
  await ensureLocalDatabaseTables(settings)
  const pool = new sql.ConnectionPool(createSqlConfig(settings, 'local'))
  try {
    await pool.connect()
    const result = await pool.request().query(`
      SELECT LOCATIONID AS locationId, LOCATIONNAME AS locationName
      FROM dbo.dts_location
      WHERE IsActive = 1
        AND LOWER(LTRIM(RTRIM(access))) = 'store'
      ORDER BY LOCATIONNAME
    `)
    return result.recordset.map((row) => ({
      locationId: Number(row.locationId),
      locationName: String(row.locationName ?? ''),
    }))
  } finally {
    if (pool.connected) await pool.close()
  }
}

export async function setFirstRunStore(selectedLocationId: number): Promise<{ message: string; selectedCount: number }> {
  const settings = await getConnectionSettings()
  if (!Number.isInteger(selectedLocationId) || selectedLocationId < 1) {
    throw new Error('Select one active Store location.')
  }
  await ensureLocalDatabaseTables(settings)
  const localPool = new sql.ConnectionPool(createSqlConfig(settings, 'local'))

  try {
    await localPool.connect()
    const transaction = new sql.Transaction(localPool)
    await transaction.begin()
    try {
      const selectionState = await new sql.Request(transaction)
        .input('selectionMarker', sql.NVarChar(255), firstRunStoreSelectionMarker)
        .query(`
          SELECT CASE WHEN EXISTS (
            SELECT 1 FROM dbo.app_first_run_setup WHERE setup_name=@selectionMarker
          ) THEN 1 ELSE 0 END AS alreadySelected
        `)
      if (Number(selectionState.recordset[0]?.alreadySelected) === 1) {
        throw new Error('This POS already has a store assigned. Sign in as admin to change it in Settings.')
      }

      const selected = await new sql.Request(transaction)
        .input('locationId', sql.Int, selectedLocationId)
        .query(`
          SELECT LOCATIONID
          FROM dbo.dts_location
          WHERE LOCATIONID=@locationId
            AND IsActive=1
            AND LOWER(LTRIM(RTRIM(access)))='store'
        `)
      if (selected.recordset.length !== 1) {
        throw new Error('Select one active Store from the seeded CheckPostingDB store list.')
      }

      // Keep only the chosen Store and the required built-in admin account.
      await new sql.Request(transaction)
        .input('locationId', sql.Int, selectedLocationId)
        .query(`DELETE FROM dbo.dts_location WHERE LOCATIONID NOT IN (2000, @locationId);`)
      await new sql.Request(transaction)
        .input('locationId', sql.Int, firstRunAdminLocation.LOCATIONID)
        .query('DELETE FROM dbo.dts_location WHERE LOCATIONID=@locationId;')
      await insertLocalLocation(transaction, firstRunAdminLocation)
      await new sql.Request(transaction)
        .input('selectionMarker', sql.NVarChar(255), firstRunStoreSelectionMarker)
        .query('INSERT INTO dbo.app_first_run_setup (setup_name) VALUES (@selectionMarker);')

      const result = await new sql.Request(transaction)
        .input('locationId', sql.Int, selectedLocationId)
        .query(`
          SELECT COUNT(1) AS selectedCount
          FROM dbo.dts_location
          WHERE LOCATIONID=@locationId AND IsActive=1
            AND LOWER(LTRIM(RTRIM(access)))='store'
        `)
      if (Number(result.recordset[0]?.selectedCount) !== 1) {
        throw new Error('The selected Store was not saved to CheckPostingDB. Please try again.')
      }
      await transaction.commit()
      return { message: 'The selected Store and required admin account were saved to CheckPostingDB.', selectedCount: 1 }
    } catch (error) {
      await transaction.rollback().catch(() => undefined)
      throw error
    }
  } finally {
    if (localPool.connected) await localPool.close()
  }
}

const localLocationTableSql = `
  IF OBJECT_ID(N'dbo.dts_location', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.dts_location (
      LOCATIONID int NOT NULL,
      LOCATIONNAME varchar(50) NOT NULL,
      ORGLOCATIONREF varchar(50) NOT NULL,
      username varchar(50) NULL,
      password varchar(50) NULL,
      access varchar(50) NULL,
      IsActive bit NOT NULL CONSTRAINT DF_dts_location_IsActive DEFAULT ((1)),
      pos_ip varchar(50) NULL,
      AreaManagerID int NULL
    )
  END;
  IF COL_LENGTH(N'dbo.dts_location', N'AreaManagerID') IS NULL
    ALTER TABLE dbo.dts_location ADD AreaManagerID int NULL;
`

const localOperationalTablesSql = `
  IF OBJECT_ID(N'dbo.dts_hourly_entry', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.dts_hourly_entry (
      entry_id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_dts_hourly_entry PRIMARY KEY CLUSTERED,
      category varchar(10) NOT NULL
        CONSTRAINT CK_dts_hourly_entry_category CHECK (category IN ('produce', 'waste', 'transfers')),
      time_value varchar(50) NOT NULL,
      entry_date date NOT NULL,
      shell_qty int NOT NULL,
      ring_qty int NOT NULL,
      jpops_qty int NOT NULL,
      Remarks varchar(50) NULL,
      locationname varchar(50) NULL,
      businessdate date NOT NULL,
      created_at datetime2(7) NULL,
      sync_id uniqueidentifier NULL CONSTRAINT DF_dts_hourly_entry_sync_id DEFAULT (newid()),
      headq_synced_at datetime2(7) NULL,
      headq_sync_error nvarchar(1000) NULL,
      CONSTRAINT UQ_dts_hourly_entry_location_time_category
        UNIQUE (locationname, time_value, entry_date, Remarks, category)
    )
  END;
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.dts_hourly_entry') AND name = N'UX_dts_hourly_entry_sync_id'
  )
    CREATE UNIQUE INDEX UX_dts_hourly_entry_sync_id
      ON dbo.dts_hourly_entry(sync_id) WHERE sync_id IS NOT NULL;
`

const localSummaryInputTableSql = `
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
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.dts_summary_input') AND name = N'UX_dts_summary_input_period'
  )
    CREATE UNIQUE INDEX UX_dts_summary_input_period
      ON dbo.dts_summary_input(locationname, date_from, date_to);
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.dts_summary_input') AND name = N'UX_dts_summary_input_sync_id'
  )
    CREATE UNIQUE INDEX UX_dts_summary_input_sync_id
      ON dbo.dts_summary_input(sync_id) WHERE sync_id IS NOT NULL;
`

const firstRunSetupRegistrySql = `
  IF OBJECT_ID(N'dbo.app_first_run_setup', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.app_first_run_setup (
      setup_name NVARCHAR(255) NOT NULL CONSTRAINT PK_app_first_run_setup PRIMARY KEY,
      completed_at DATETIME2(7) NOT NULL CONSTRAINT DF_app_first_run_setup_completed_at DEFAULT (SYSUTCDATETIME())
    );
  END;
`

const freshLocalSchemaMarker = 'bootstrap:first-run-local-schema'
const firstRunViewsMarker = 'bootstrap:first-run-create-view-tables'
const firstRunStoreSelectionMarker = 'bootstrap:first-run-store-selected'
const firstRunAdminLocation = {
  LOCATIONID: 2000,
  LOCATIONNAME: 'Admin',
  ORGLOCATIONREF: 'Administrator',
  username: 'admin',
  password: 'admin',
  access: 'admin',
  IsActive: true,
  pos_ip: null,
  AreaManagerID: null,
}

async function loadFirstRunLocationBatches(): Promise<string[]> {
  const directory = app.isPackaged
    ? path.join(process.resourcesPath, 'database-migrations', 'checkpostingdb')
    : path.join(app.getAppPath(), 'database-migrations', 'checkpostingdb')
  const filePath = path.join(directory, 'dts_location.sql')
  const file = await fs.readFile(filePath)
  const encoding = file[0] === 0xff && file[1] === 0xfe ? 'utf16le' : 'utf8'
  const script = file.toString(encoding)
    .replace(/^\uFEFF/, '')
    .replace(/^\s*USE\s+\[[^\]]+\]\s*;?\s*$/gim, '')
  const batches = script
    .split(/^\s*GO(?:\s+\d+)?\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean)
  if (!batches.some((batch) => /CREATE\s+TABLE\s+\[dbo\]\.\[dts_location\]/i.test(batch))) {
    throw new Error('The first-run dts_location.sql file does not create dbo.dts_location.')
  }
  return batches
}

async function createFirstRunViews(pool: sql.ConnectionPool): Promise<void> {
  const setup = await pool.request()
    .input('schemaMarker', sql.NVarChar(255), freshLocalSchemaMarker)
    .input('viewsMarker', sql.NVarChar(255), firstRunViewsMarker)
    .query(`
      SELECT
        CASE WHEN EXISTS (SELECT 1 FROM dbo.app_first_run_setup WHERE setup_name=@schemaMarker) THEN 1 ELSE 0 END AS isFreshSetup,
        CASE WHEN EXISTS (SELECT 1 FROM dbo.app_first_run_setup WHERE setup_name=@viewsMarker) THEN 1 ELSE 0 END AS viewsApplied
    `)
  if (Number(setup.recordset[0]?.isFreshSetup) !== 1 || Number(setup.recordset[0]?.viewsApplied) === 1) return

  const directory = app.isPackaged
    ? path.join(process.resourcesPath, 'database-setup', 'checkpostingdb')
    : path.join(app.getAppPath(), 'database-setup', 'checkpostingdb')
  const filePath = path.join(directory, 'create-view-tables.sql')
  const script = (await fs.readFile(filePath, 'utf8'))
    .replace(/^\uFEFF/, '')
    .replace(/^\s*USE\s+\[[^\]]+\]\s*;?\s*$/gim, '')
  const batches = script
    .split(/^\s*GO(?:\s+\d+)?\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean)
  if (batches.length === 0) throw new Error('The first-run view SQL file is empty.')

  const transaction = new sql.Transaction(pool)
  await transaction.begin()
  try {
    await new sql.Request(transaction)
      .input('resource', sql.NVarChar(255), firstRunViewsMarker)
      .query(`EXEC sys.sp_getapplock @Resource=@resource, @LockMode='Exclusive', @LockOwner='Transaction';`)

    const alreadyApplied = await new sql.Request(transaction)
      .input('viewsMarker', sql.NVarChar(255), firstRunViewsMarker)
      .query(`SELECT 1 AS applied FROM dbo.app_first_run_setup WHERE setup_name=@viewsMarker;`)
    if (alreadyApplied.recordset.length) {
      await transaction.commit()
      return
    }

    for (const batch of batches) {
      await new sql.Request(transaction).batch(batch)
    }
    await new sql.Request(transaction)
      .input('viewsMarker', sql.NVarChar(255), firstRunViewsMarker)
      .query(`INSERT INTO dbo.app_first_run_setup (setup_name) VALUES (@viewsMarker);`)
    await transaction.commit()
  } catch (error) {
    await transaction.rollback().catch(() => undefined)
    throw error
  }
}

export async function ensureLocalDatabaseTables(input?: ConnectionSettings): Promise<void> {
  const settings = input
    ? mergeSettings(await getConnectionSettings(), input)
    : await getConnectionSettings()
  if (settings.databases.local.database.toLowerCase() !== 'checkpostingdb') {
    throw new Error('Set the local POS database name to checkpostingdb before initializing the local POS database.')
  }

  const pool = new sql.ConnectionPool(createSqlConfig(settings, 'local'))
  try {
    await pool.connect()
    await pool.request().query(firstRunSetupRegistrySql)
    await pool.request().query(`
      IF OBJECT_ID(N'dbo.app_schema_migrations', N'U') IS NOT NULL
      BEGIN
        INSERT INTO dbo.app_first_run_setup (setup_name)
        SELECT migration_name
        FROM dbo.app_schema_migrations
        WHERE migration_name IN (N'bootstrap:first-run-local-schema', N'bootstrap:first-run-create-view-tables')
          AND NOT EXISTS (
            SELECT 1 FROM dbo.app_first_run_setup AS setup WITH (UPDLOCK, HOLDLOCK)
            WHERE setup.setup_name = dbo.app_schema_migrations.migration_name
          );
      END;
    `)

    const before = await pool.request().query(`
      SELECT CASE WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NULL THEN 1 ELSE 0 END AS isFresh
    `)
    const isFresh = Number(before.recordset[0]?.isFresh) === 1
    let hasStore = false
    let storeAlreadySelected = false
    if (!isFresh) {
      const existing = await pool.request().query(`
        SELECT
          CASE WHEN EXISTS (
            SELECT 1 FROM dbo.dts_location
            WHERE IsActive=1 AND LOWER(LTRIM(RTRIM(access)))='store'
          ) THEN 1 ELSE 0 END AS hasStore,
          CASE WHEN EXISTS (
            SELECT 1 FROM dbo.app_first_run_setup
            WHERE setup_name=N'${firstRunStoreSelectionMarker}'
          ) THEN 1 ELSE 0 END AS storeSelected
      `)
      hasStore = Number(existing.recordset[0]?.hasStore) === 1
      storeAlreadySelected = Number(existing.recordset[0]?.storeSelected) === 1
    }
    const shouldSeedLocations = isFresh || (!hasStore && !storeAlreadySelected)
    const locationBatches = shouldSeedLocations ? await loadFirstRunLocationBatches() : []

    // Keep the required login/location table independent from optional
    // operational table/index creation so a later setup error cannot roll it back.
    const locationTransaction = new sql.Transaction(pool)
    await locationTransaction.begin()
    try {
      if (shouldSeedLocations && isFresh) {
        for (const batch of locationBatches) {
          await new sql.Request(locationTransaction).batch(batch)
        }
      } else {
        await new sql.Request(locationTransaction).batch(localLocationTableSql)
        if (shouldSeedLocations) {
          await new sql.Request(locationTransaction).query('DELETE FROM dbo.dts_location;')
          for (const batch of locationBatches) {
            // The source script ends by binding a default to IsActive. On an
            // existing table that default may already be present, so replay
            // only its data rows during repair/re-seeding.
            if (!/^INSERT\s+\[dbo\]\.\[dts_location\]/im.test(batch)) continue
            await new sql.Request(locationTransaction).batch(batch)
          }
        }
      }
      const created = await new sql.Request(locationTransaction).query(`
        SELECT CASE WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NULL THEN 0 ELSE 1 END AS tableExists
      `)
      if (Number(created.recordset[0]?.tableExists) !== 1) {
        throw new Error('dbo.dts_location was not created in CheckPostingDB.')
      }
      if (shouldSeedLocations) {
        await new sql.Request(locationTransaction)
          .input('schemaMarker', sql.NVarChar(255), freshLocalSchemaMarker)
          .query(`
            IF NOT EXISTS (
              SELECT 1 FROM dbo.app_first_run_setup WITH (UPDLOCK, HOLDLOCK)
              WHERE setup_name=@schemaMarker
            )
              INSERT INTO dbo.app_first_run_setup (setup_name) VALUES (@schemaMarker);
          `)
      }
      await locationTransaction.commit()
    } catch (error) {
      await locationTransaction.rollback().catch(() => undefined)
      throw error
    }

    await pool.request().batch(`
      ${localOperationalTablesSql}
      ${localSummaryInputTableSql}
    `)
    await createFirstRunViews(pool)
  } finally {
    if (pool.connected) await pool.close()
  }
}

async function insertLocalLocation(
  transaction: sql.Transaction,
  row: Record<string, unknown>,
): Promise<void> {
  await new sql.Request(transaction)
    .input('locationId', sql.Int, row.LOCATIONID)
    .input('locationName', sql.VarChar(50), row.LOCATIONNAME)
    .input('orgLocationRef', sql.VarChar(50), row.ORGLOCATIONREF)
    .input('username', sql.VarChar(50), row.username)
    .input('password', sql.VarChar(50), row.password)
    .input('access', sql.VarChar(50), row.access)
    .input('isActive', sql.Bit, row.IsActive)
    .input('posIp', sql.VarChar(50), row.pos_ip)
    .input('areaManagerId', sql.Int, row.AreaManagerID)
    .query(`
      INSERT INTO dbo.dts_location
        (LOCATIONID, LOCATIONNAME, ORGLOCATIONREF, username, password, access, IsActive, pos_ip, AreaManagerID)
      VALUES
        (@locationId, @locationName, @orgLocationRef, @username, @password, @access, @isActive, @posIp, @areaManagerId)
    `)
}

export async function initializeLocalDatabase(
  input: ConnectionSettings,
): Promise<{ message: string }> {
  const settings = mergeSettings(await getConnectionSettings(), input)
  if (settings.databases.local.database.toLowerCase() !== 'checkpostingdb') {
    throw new Error('Set the local POS database name to checkpostingdb before initializing the local POS database.')
  }

  await ensureLocalDatabaseTables(settings)
  const localPool = new sql.ConnectionPool(createSqlConfig(settings, 'local'))

  try {
    await localPool.connect()
    const transaction = new sql.Transaction(localPool)
    await transaction.begin()
    try {
      const adminResult = await new sql.Request(transaction).query(`
        SELECT COUNT(1) AS adminCount
        FROM dbo.dts_location
        WHERE LOCATIONID=2000 AND LOWER(LTRIM(RTRIM(access)))='admin' AND IsActive=1
      `)
      if (Number(adminResult.recordset[0]?.adminCount) === 0) {
        await new sql.Request(transaction).input('adminId', sql.Int, firstRunAdminLocation.LOCATIONID)
          .query('DELETE FROM dbo.dts_location WHERE LOCATIONID=@adminId;')
        await insertLocalLocation(transaction, firstRunAdminLocation)
      }
      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }

    const stores = await localPool.request().query(`
      SELECT COUNT(1) AS storeCount
      FROM dbo.dts_location
      WHERE IsActive=1 AND LOWER(LTRIM(RTRIM(access)))='store'
    `)
    return { message: `CheckPostingDB initialized with the required admin account and ${Number(stores.recordset[0]?.storeCount ?? 0)} active Store location(s).` }
  } finally {
    if (localPool.connected) await localPool.close()
  }
}

export async function setLocalStore(
  input: ConnectionSettings,
  selectedLocationId: number,
): Promise<{ message: string; selectedCount: number }> {
  const settings = mergeSettings(await getConnectionSettings(), input)
  if (settings.databases.local.database.toLowerCase() !== 'checkpostingdb') {
    throw new Error('Set the local POS database name to checkpostingdb before selecting a store.')
  }
  if (!Number.isInteger(selectedLocationId) || selectedLocationId < 1) {
    throw new Error('Select one active Store location.')
  }

  const sourcePool = new sql.ConnectionPool(createSqlConfig(settings, 'hourly'))
  const localPool = new sql.ConnectionPool(createSqlConfig(settings, 'local'))

  try {
    await sourcePool.connect()
    const locationRequest = sourcePool.request()
    locationRequest.input('locationId', sql.Int, selectedLocationId)
    const locationResult = await locationRequest.query(`
      SELECT LOCATIONID, LOCATIONNAME, ORGLOCATIONREF, username, password, access, IsActive, pos_ip, AreaManagerID
      FROM dbo.dts_location
      WHERE IsActive = 1
        AND LOWER(LTRIM(RTRIM(access))) = 'store'
        AND LOCATIONID = @locationId
    `)
    if (locationResult.recordset.length !== 1) {
      throw new Error('The selected Store is no longer active in OracleDB. Refresh the store list and select again.')
    }

    await localPool.connect()
    const localStatus = await localPool.request().query(`
      SELECT CASE
        WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM dbo.dts_location
            WHERE IsActive = 1 AND LOWER(LTRIM(RTRIM(access))) = 'admin'
          )
        THEN 1 ELSE 0
      END AS localDatabaseInitialized
    `)
    if (Number(localStatus.recordset[0]?.localDatabaseInitialized) !== 1) {
      throw new Error('Initialize the local POS database and sign in with the admin account before selecting a store.')
    }

    const transaction = new sql.Transaction(localPool)
    await transaction.begin()
    try {
      await new sql.Request(transaction).query(`
        DELETE FROM dbo.dts_location
        WHERE access IS NULL OR LOWER(LTRIM(RTRIM(access))) <> 'admin'
      `)
      await insertLocalLocation(transaction, locationResult.recordset[0])
      const inserted = await new sql.Request(transaction)
        .input('locationId', sql.Int, selectedLocationId)
        .query(`
          SELECT COUNT(1) AS insertedCount
          FROM dbo.dts_location
          WHERE LOCATIONID = @locationId
            AND IsActive = 1
            AND LOWER(LTRIM(RTRIM(access))) = 'store'
        `)
      if (Number(inserted.recordset[0]?.insertedCount) !== 1) {
        throw new Error('The selected Store was not saved to CheckPostingDB. Please try again.')
      }
      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }

    return {
      message: `Configured ${String(locationResult.recordset[0].LOCATIONNAME)} as this POS store. The admin account was retained.`,
      selectedCount: 1,
    }
  } finally {
    if (sourcePool.connected) await sourcePool.close()
    if (localPool.connected) await localPool.close()
  }
}
