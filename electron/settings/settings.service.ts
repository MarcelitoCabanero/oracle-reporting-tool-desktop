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
        server: process.env.HQ_DB_SERVER || '209.141.7.222',
        database: process.env.HOURLY_DB_DATABASE || 'oracledb',
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
  }

  for (const key of ['headq', 'hourly'] as const) {
    databases[key] = {
      ...databases[key],
      server: databases.hq.server,
      username: databases.hq.username,
      password: databases.hq.password,
      port: databases.hq.port,
    }
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
    if (key === 'local' || key === 'hq') {
      if (!Number.isInteger(databases[key].port) || databases[key].port < 1 || databases[key].port > 65535) {
        throw new Error(`${key} database port must be between 1 and 65535.`)
      }
    } else {
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
        AND LOWER(LTRIM(RTRIM(access))) <> 'admin'
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

const localLocationTableSql = `
  CREATE TABLE dbo.dts_location (
    LOCATIONID int NOT NULL,
    LOCATIONNAME varchar(50) NOT NULL,
    ORGLOCATIONREF varchar(50) NOT NULL,
    username varchar(50) NULL,
    password varchar(50) NULL,
    access varchar(50) NULL,
    IsActive bit NOT NULL CONSTRAINT DF_dts_location_IsActive DEFAULT ((1)),
    pos_ip varchar(50) NULL
  )

  CREATE TABLE dbo.dts_produce (
    time_mixing varchar(50) NOT NULL,
    date_mix date NOT NULL,
    shell_qty int NOT NULL,
    ring_qty int NOT NULL,
    jpops_qty int NOT NULL,
    Remarks varchar(50) NULL,
    locationname varchar(50) NULL,
    businessdate date NOT NULL,
    created_at datetime NULL,
    produce_id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_dts_produce PRIMARY KEY CLUSTERED,
    sync_id uniqueidentifier NULL CONSTRAINT DF_pos_dts_produce_sync_id DEFAULT (newid()),
    headq_synced_at datetime2(7) NULL,
    headq_sync_error nvarchar(1000) NULL
  )

  CREATE TABLE dbo.dts_waste (
    time_waste varchar(50) NOT NULL,
    date_waste date NOT NULL,
    shell_qty int NOT NULL,
    ring_qty int NOT NULL,
    jpops_qty int NOT NULL,
    Remarks varchar(50) NULL,
    locationname varchar(50) NULL,
    businessdate date NOT NULL,
    created_at datetime NULL,
    waste_id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_dts_waste PRIMARY KEY CLUSTERED,
    sync_id uniqueidentifier NULL CONSTRAINT DF_pos_dts_waste_sync_id DEFAULT (newid()),
    headq_synced_at datetime2(7) NULL,
    headq_sync_error nvarchar(1000) NULL,
    CONSTRAINT UQ_dts_waste_time_date UNIQUE (time_waste, date_waste, Remarks)
  )
`

export async function provisionLocalDatabase(
  input: ConnectionSettings,
  selectedLocationIds: number[],
): Promise<{ message: string; selectedCount: number }> {
  const settings = mergeSettings(await getConnectionSettings(), input)
  if (settings.databases.local.database.toLowerCase() !== 'checkpostingdb') {
    throw new Error('Set the local POS database name to checkpostingdb before creating the POS tables.')
  }

  const selectedIds = [...new Set(selectedLocationIds)]
  if (selectedIds.length === 0 || selectedIds.some((id) => !Number.isInteger(id) || id < 1)) {
    throw new Error('Select at least one active store location before creating the POS tables.')
  }

  const sourcePool = new sql.ConnectionPool(createSqlConfig(settings, 'hourly'))
  const localPool = new sql.ConnectionPool(createSqlConfig(settings, 'local'))

  try {
    await sourcePool.connect()
    const adminResult = await sourcePool.request().query(`
      SELECT TOP 1 LOCATIONID, LOCATIONNAME, ORGLOCATIONREF, username, password, access, IsActive, pos_ip
      FROM dbo.dts_location
      WHERE LOWER(LTRIM(RTRIM(access))) = 'admin' AND IsActive = 1
      ORDER BY LOCATIONID
    `)

    if (adminResult.recordset.length !== 1) {
      throw new Error('No active admin account was found in the OracleDB dbo.dts_location source table.')
    }

    const locationRequest = sourcePool.request()
    const idParameters = selectedIds.map((id, index) => {
      const parameter = `locationId${index}`
      locationRequest.input(parameter, sql.Int, id)
      return `@${parameter}`
    })
    const locationsResult = await locationRequest.query(`
      SELECT LOCATIONID, LOCATIONNAME, ORGLOCATIONREF, username, password, access, IsActive, pos_ip
      FROM dbo.dts_location
      WHERE IsActive = 1
        AND LOWER(LTRIM(RTRIM(access))) <> 'admin'
        AND LOCATIONID IN (${idParameters.join(', ')})
    `)

    if (locationsResult.recordset.length !== selectedIds.length) {
      throw new Error('One or more selected locations are no longer active in OracleDB. Refresh the location list and select again.')
    }

    await localPool.connect()
    const transaction = new sql.Transaction(localPool)
    await transaction.begin()
    try {
      await new sql.Request(transaction).batch(`
        IF OBJECT_ID(N'dbo.dts_waste', N'U') IS NOT NULL DROP TABLE dbo.dts_waste;
        IF OBJECT_ID(N'dbo.dts_produce', N'U') IS NOT NULL DROP TABLE dbo.dts_produce;
        IF OBJECT_ID(N'dbo.dts_location', N'U') IS NOT NULL DROP TABLE dbo.dts_location;
        ${localLocationTableSql}
      `)

      const insertLocation = async (row: Record<string, unknown>) => {
        await new sql.Request(transaction)
          .input('locationId', sql.Int, row.LOCATIONID)
          .input('locationName', sql.VarChar(50), row.LOCATIONNAME)
          .input('orgLocationRef', sql.VarChar(50), row.ORGLOCATIONREF)
          .input('username', sql.VarChar(50), row.username)
          .input('password', sql.VarChar(50), row.password)
          .input('access', sql.VarChar(50), row.access)
          .input('isActive', sql.Bit, row.IsActive)
          .input('posIp', sql.VarChar(50), row.pos_ip)
          .query(`
            INSERT INTO dbo.dts_location
              (LOCATIONID, LOCATIONNAME, ORGLOCATIONREF, username, password, access, IsActive, pos_ip)
            VALUES
              (@locationId, @locationName, @orgLocationRef, @username, @password, @access, @isActive, @posIp)
          `)
      }

      await insertLocation(adminResult.recordset[0])
      for (const location of locationsResult.recordset) {
        await insertLocation(location)
      }

      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }

    return {
      message: `Recreated dts_location, dts_produce, and dts_waste. Added the admin account and ${locationsResult.recordset.length} selected store(s).`,
      selectedCount: locationsResult.recordset.length,
    }
  } finally {
    if (sourcePool.connected) await sourcePool.close()
    if (localPool.connected) await localPool.close()
  }
}
