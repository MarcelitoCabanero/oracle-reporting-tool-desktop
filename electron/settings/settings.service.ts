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
  let normalized = ''
  for (let index = 0; index < raw.length; index += 1) {
    const code = raw.charCodeAt(index)
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) continue
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = raw.charCodeAt(index + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        normalized += raw[index] + raw[index + 1]
        index += 1
      }
      continue
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue
    normalized += raw[index]
  }
  normalized = normalized.trim()
  if (normalized !== raw.trim()) {
    console.warn('Removed invalid control or Unicode characters from a saved connection field.')
  }
  return normalized
}

function sanitizeSqlConfigValue(value: string): string {
  return normalizeConnectionField(value)
}

function sanitizeEnvValue(key: string, fallback: string): string {
  const value = normalizeConnectionField(process.env[key])
  return value || fallback
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), settingsFileName)
}

function environmentSettings(): ConnectionSettings {
  const hqUser = sanitizeEnvValue('HQ_DB_USER', 'sa')
  const hqPassword = sanitizeEnvValue('HQ_DB_PASSWORD', 'Cfi05122011')
  const port = Number(process.env.HQ_DB_PORT || 1433)

  return {
    databases: {
      local: {
        server: sanitizeEnvValue('LOCAL_DB_SERVER', 'POS2'),
        database: sanitizeEnvValue('LOCAL_DB_DATABASE', 'checkpostingdb'),
        username: sanitizeEnvValue('LOCAL_DB_USER', 'sa'),
        password: sanitizeEnvValue('LOCAL_DB_PASSWORD', '#1mymicros'),
        port: Number(process.env.LOCAL_DB_PORT || 1433),
      },
      hq: {
        server: sanitizeEnvValue('HQ_DB_SERVER', '209.141.7.222'),
        database: sanitizeEnvValue('HQ_DB_DATABASE', 'OracleDB'),
        username: hqUser,
        password: hqPassword,
        port,
      },
      hourly: {
        server: sanitizeEnvValue('HQ_DB_SERVER', '209.141.7.222'),
        database: sanitizeEnvValue('HQ_DB_DATABASE', 'OracleDB'),
        username: hqUser,
        password: hqPassword,
        port,
      },
    },
    ftp: {
      host: sanitizeEnvValue('FTP_HOST', 'ftp.cfi.com.ph'),
      username: sanitizeEnvValue('FTP_USER', 'cfiftp@cfi.com.ph'),
      password: sanitizeEnvValue('FTP_PASSWORD', '9%%0ngTq;vYB@-_g'),
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
    const fallback = defaults.databases[key]
    const saved = stored.databases?.[key]
    if (saved) {
      databases[key] = {
        server: normalizeConnectionField(saved.server) || fallback.server,
        database: normalizeConnectionField(saved.database) || fallback.database,
        username: normalizeConnectionField(saved.username) || fallback.username,
        password: normalizeConnectionField(saved.password) || fallback.password,
        port: Number(saved.port) || fallback.port,
      }
    }
  }

  // Hourly sales sync shares the HQ connection, including its database.
  databases.hourly = { ...databases.hq }

  return {
    ...defaults,
    ...stored,
    databases,
    ftp: {
      host: normalizeConnectionField(stored.ftp?.host) || defaults.ftp.host,
      username: normalizeConnectionField(stored.ftp?.username) || defaults.ftp.username,
      password: String(stored.ftp?.password || defaults.ftp.password),
      secure: stored.ftp?.secure ?? defaults.ftp.secure,
    },
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
    const candidatePassword = normalizeConnectionField(candidate.password)
    databases[key] = {
      server: normalizeConnectionField(candidate.server),
      database: normalizeConnectionField(candidate.database),
      username: normalizeConnectionField(candidate.username),
      password: candidatePassword || current.databases[key].password,
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
  const server = sanitizeSqlConfigValue(database.server)
  const dbName = sanitizeSqlConfigValue(database.database)
  const user = sanitizeSqlConfigValue(database.username)
  const password = sanitizeSqlConfigValue(database.password)

  if (!server || !dbName || !user || !password) {
    throw new Error(`Configure the ${key} database server, database, username, and password first.`)
  }

  return {
    server,
    database: dbName,
    user,
    password,
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
  const config = createSqlConfig(settings, key)
  const pool = new sql.ConnectionPool(config)
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
  const localPool = new sql.ConnectionPool(createSqlConfig(settings, 'local'))

  try {
    await localPool.connect()
    const tableStatus = await localPool.request().query(`
      SELECT CASE WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NULL THEN 0 ELSE 1 END AS locationTableExists
    `)
    if (Number(tableStatus.recordset[0]?.locationTableExists) === 1) {
      const localStores = await localPool.request().query(`
        SELECT LOCATIONID AS locationId, LOCATIONNAME AS locationName
        FROM dbo.dts_location
        WHERE IsActive = 1
          AND LOWER(LTRIM(RTRIM(access))) = 'store'
        ORDER BY LOCATIONNAME
      `)
      if (localStores.recordset.length > 0) {
        return localStores.recordset.map((row) => ({
          locationId: Number(row.locationId),
          locationName: String(row.locationName ?? ''),
        }))
      }
    }
  } finally {
    if (localPool.connected) await localPool.close()
  }

  return getLocationOptions(settings)
}

export async function setFirstRunStore(selectedLocationId: number): Promise<{ message: string; selectedCount: number }> {
  const settings = await getConnectionSettings()
  if (settings.databases.local.database.toLowerCase() !== 'checkpostingdb') {
    throw new Error('Set the local POS database name to checkpostingdb before selecting a store.')
  }
  if (!Number.isInteger(selectedLocationId) || selectedLocationId < 1) {
    throw new Error('Select one active Store location.')
  }

  const localPool = new sql.ConnectionPool(createSqlConfig(settings, 'local'))

  try {
    await localPool.connect()
    const tableStatus = await localPool.request().query(`
      SELECT CASE WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NULL THEN 0 ELSE 1 END AS locationTableExists
    `)

    if (Number(tableStatus.recordset[0]?.locationTableExists) === 1) {
      const transaction = new sql.Transaction(localPool)
      await transaction.begin()
      try {
        await new sql.Request(transaction)
          .input('resource', sql.NVarChar(255), 'bootstrap:checkpostingdb:location-schema')
          .query(`
            DECLARE @lockResult INT;
            EXEC @lockResult = sys.sp_getapplock
              @Resource=@resource,
              @LockMode='Exclusive',
              @LockOwner='Transaction',
              @LockTimeout=15000;
            IF @lockResult < 0
              THROW 51000, 'Unable to lock checkpostingdb location schema.', 1;
          `)

        const status = await new sql.Request(transaction).query(`
          SELECT
            (
              SELECT COUNT(*) FROM dbo.dts_location
              WHERE LOWER(LTRIM(RTRIM(access))) = 'store'
            ) AS storeAccountCount,
            (
              SELECT COUNT(*) FROM dbo.dts_location
              WHERE IsActive = 1 AND LOWER(LTRIM(RTRIM(access))) = 'store'
            ) AS activeStoreCount,
            CASE WHEN EXISTS (
              SELECT 1 FROM dbo.dts_location
              WHERE IsActive = 1 AND LOWER(LTRIM(RTRIM(access))) = 'admin'
            ) THEN 1 ELSE 0 END AS hasAdmin
        `)
        const storeAccountCount = Number(status.recordset[0]?.storeAccountCount ?? 0)
        const activeStoreCount = Number(status.recordset[0]?.activeStoreCount ?? 0)

        if (storeAccountCount === 1 && activeStoreCount === 1) {
          throw new Error('This POS already has one store assigned. Sign in as admin to change it in Settings.')
        }

        if (activeStoreCount > 0) {
          if (Number(status.recordset[0]?.hasAdmin) !== 1) {
            throw new Error('An active admin account is required before selecting this POS store.')
          }

          const selectedStore = await new sql.Request(transaction)
            .input('locationId', sql.Int, selectedLocationId)
            .query(`
              SELECT LOCATIONNAME
              FROM dbo.dts_location
              WHERE LOCATIONID = @locationId
                AND IsActive = 1
                AND LOWER(LTRIM(RTRIM(access))) = 'store'
            `)
          if (selectedStore.recordset.length !== 1) {
            throw new Error('The selected Store is no longer available in CheckPostingDB. Refresh the store list and select again.')
          }

          await new sql.Request(transaction)
            .input('locationId', sql.Int, selectedLocationId)
            .query(`
              DELETE FROM dbo.dts_location
              WHERE (access IS NULL OR LOWER(LTRIM(RTRIM(access))) <> 'admin')
                AND LOCATIONID <> @locationId
            `)
          await transaction.commit()

          return {
            message: `Configured ${String(selectedStore.recordset[0].LOCATIONNAME)} as this POS store. The admin account was retained and other store accounts were removed.`,
            selectedCount: 1,
          }
        }

        await transaction.rollback()
      } catch (error) {
        await transaction.rollback().catch(() => undefined)
        throw error
      }
    }
  } finally {
    if (localPool.connected) await localPool.close()
  }

  return setLocalStore(settings, selectedLocationId)
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
  let setupLockAcquired = false
  try {
    await pool.connect()
    const setupLock = await pool.request()
      .input('resource', sql.NVarChar(255), 'bootstrap:checkpostingdb:ensure-local-tables')
      .query(`
        DECLARE @lockResult INT;
        EXEC @lockResult = sys.sp_getapplock
          @Resource=@resource,
          @LockMode='Exclusive',
          @LockOwner='Session',
          @LockTimeout=30000;
        SELECT @lockResult AS lockResult;
      `)
    if (Number(setupLock.recordset[0]?.lockResult) < 0) {
      throw new Error('Unable to lock checkpostingdb first-run setup. Try again shortly.')
    }
    setupLockAcquired = true
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

    // Keep the required login/location table independent from optional
    // operational table/index creation so a later setup error cannot roll it back.
    const locationTransaction = new sql.Transaction(pool)
    await locationTransaction.begin()
    try {
      const setupLock = await new sql.Request(locationTransaction)
        .input('resource', sql.NVarChar(255), 'bootstrap:checkpostingdb:location-schema')
        .query(`
          DECLARE @lockResult INT;
          EXEC @lockResult = sys.sp_getapplock
            @Resource=@resource,
            @LockMode='Exclusive',
            @LockOwner='Transaction',
            @LockTimeout=15000;
          IF @lockResult < 0
            THROW 51000, 'Unable to lock checkpostingdb first-run setup.', 1;
        `)
      void setupLock

      // Read freshness only after taking the database lock. Health checks and
      // the first-run Store list can initialize this schema concurrently.
      const before = await new sql.Request(locationTransaction).query(`
        SELECT CASE WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NULL THEN 1 ELSE 0 END AS isFresh
      `)
      const isFresh = Number(before.recordset[0]?.isFresh) === 1

      await new sql.Request(locationTransaction).batch(localLocationTableSql)
      const created = await new sql.Request(locationTransaction).query(`
        SELECT CASE WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NULL THEN 0 ELSE 1 END AS tableExists
      `)
      if (Number(created.recordset[0]?.tableExists) !== 1) {
        throw new Error('dbo.dts_location was not created in checkpostingdb.')
      }
      if (isFresh) {
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
    if (pool.connected) {
      if (setupLockAcquired) {
        await pool.request()
          .input('resource', sql.NVarChar(255), 'bootstrap:checkpostingdb:ensure-local-tables')
          .query(`EXEC sys.sp_releaseapplock @Resource=@resource, @LockOwner='Session';`)
          .catch(() => undefined)
      }
      await pool.close()
    }
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

  const sourcePool = new sql.ConnectionPool(createSqlConfig(settings, 'hourly'))
  const localPool = new sql.ConnectionPool(createSqlConfig(settings, 'local'))

  try {
    await sourcePool.connect()
    const adminResult = await sourcePool.request().query(`
      SELECT LOCATIONID, LOCATIONNAME, ORGLOCATIONREF, username, password, access, IsActive, pos_ip, AreaManagerID
      FROM dbo.dts_location
      WHERE LOWER(LTRIM(RTRIM(access))) = 'admin' AND IsActive = 1
      ORDER BY LOCATIONID
    `)
    if (adminResult.recordset.length === 0) {
      throw new Error('No active admin account was found in the OracleDB dbo.dts_location source table.')
    }

    await localPool.connect()
    const transaction = new sql.Transaction(localPool)
    await transaction.begin()
    try {
      await new sql.Request(transaction).query(`
        DELETE FROM dbo.dts_location
        WHERE LOWER(LTRIM(RTRIM(access))) = 'admin';
      `)
      for (const admin of adminResult.recordset) {
        await insertLocalLocation(transaction, admin)
      }
      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }

    return {
      message: `Local POS database initialized with ${adminResult.recordset.length} active admin account(s). Sign in as admin to select this POS store.`,
    }
  } finally {
    if (sourcePool.connected) await sourcePool.close()
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
