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
const databaseKeys: DatabaseKey[] = ['local', 'hq', 'headq', 'hourly']

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
      headq: {
        server: process.env.HQ_DB_SERVER || '209.141.7.222',
        database: process.env.HEADQ_DB_DATABASE || 'HEADQ',
        username: hqUser,
        password: hqPassword,
        port,
      },
      hourly: {
        server: process.env.HOURLY_DB_SERVER || '192.168.5.201',
        database: process.env.HOURLY_DB_DATABASE || 'oracledb',
        username: process.env.HOURLY_DB_USER ?? hqUser,
        password: process.env.HOURLY_DB_PASSWORD ?? hqPassword,
        port: Number(process.env.HOURLY_DB_PORT || 1433),
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
  }

  for (const key of ['headq'] as const) {
    databases[key] = {
      ...databases[key],
      server: databases.hq.server,
      username: databases.hq.username,
      password: databases.hq.password,
      port: databases.hq.port,
    }
  }

  const savedHourlyServer = stored.databases?.hourly?.server?.trim()
  if (savedHourlyServer && savedHourlyServer === databases.hq.server) {
    databases.hourly.server = defaults.databases.hourly.server
    databases.hourly.port = defaults.databases.hourly.port
  }

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
      server: String(candidate.server ?? '').trim(),
      database: String(candidate.database ?? '').trim(),
      username: String(candidate.username ?? '').trim(),
      password: String(candidate.password || current.databases[key].password),
      port: Number(candidate.port),
    }
    if (key === 'local' || key === 'hq' || key === 'hourly') {
      if (!Number.isInteger(databases[key].port) || databases[key].port < 1 || databases[key].port > 65535) {
        throw new Error(`${key} database port must be between 1 and 65535.`)
      }
    } else if (key === 'headq') {
      databases[key] = {
        ...databases[key],
        server: databases.hq.server,
        username: databases.hq.username,
        password: databases.hq.password,
        port: databases.hq.port,
      }
    }
  }

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
  return getLocationOptions(await getConnectionSettings())
}

export async function setFirstRunStore(selectedLocationId: number): Promise<{ message: string; selectedCount: number }> {
  const settings = await getConnectionSettings()
  const localPool = new sql.ConnectionPool(createSqlConfig(settings, 'local'))

  try {
    await localPool.connect()
    const status = await localPool.request().query(`
      SELECT CASE WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM dbo.dts_location
          WHERE IsActive = 1 AND LOWER(LTRIM(RTRIM(access))) = 'store'
        ) THEN 1 ELSE 0 END AS hasStore
    `)
    if (Number(status.recordset[0]?.hasStore) === 1) {
      throw new Error('This POS already has a store assigned. Sign in as admin to change it in Settings.')
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
    await pool.request().batch(`
      ${localLocationTableSql}
      ${localOperationalTablesSql}
      ${localSummaryInputTableSql}
    `)
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
      await new sql.Request(transaction).batch(`
        ${localLocationTableSql}
        ${localOperationalTablesSql}
        ${localSummaryInputTableSql}
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
