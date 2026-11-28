import { app } from 'electron'
import sql from 'mssql'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getLocalDbPool } from '../database/localdb.js'
import { getHqDbPool } from '../database/hqdb.js'
import { ensureLocalDatabaseTables, getConnectionSettings, initializeLocalDatabase } from '../settings/settings.service.js'

export interface SystemHealthResult {
  ready: boolean
  localDbConnected: boolean
  localLocationTableExists: boolean
  hqDbConnected: boolean
  requiresStoreSelection: boolean
  localSetupError: string | null
  message: string
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined
  }

  if ('code' in error && typeof error.code === 'string') {
    return error.code
  }

  if ('originalError' in error) {
    return getErrorCode(error.originalError)
  }

  return undefined
}

function getHqConnectionGuidance(error: unknown): string {
  const code = getErrorCode(error)

  if (code === 'ELOGIN') {
    return 'SQL Server rejected the configured credentials. Verify HQ_DB_USER and HQ_DB_PASSWORD.'
  }

  if (
    code &&
    ['ETIMEOUT', 'ESOCKET', 'ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ENETUNREACH', 'EINSTLOOKUP'].includes(code)
  ) {
    return 'The server could not be reached. Verify HQ_DB_SERVER and HQ_DB_PORT, and confirm SQL Server TCP/IP and firewall/router rules allow this client.'
  }

  if (code === 'EREQUEST') {
    return 'The server was reached, but the health-check query failed. Verify HQ_DB_DATABASE exists and the configured user can access it.'
  }

  if (error instanceof Error && error.message.includes('is not configured')) {
    return 'HQ database settings are incomplete. Verify HQ_DB_SERVER, HQ_DB_DATABASE, HQ_DB_USER, and HQ_DB_PASSWORD.'
  }

  return 'Review HQ_DB_SERVER, HQ_DB_PORT, HQ_DB_DATABASE, and the HQ database settings. Check the application logs for the underlying error.'
}

async function checkLocalDb(): Promise<{
  connected: boolean
  locationTableExists: boolean
  requiresStoreSelection: boolean
  setupError: string | null
}> {
  let pool
  try {
    pool = await getLocalDbPool()
    await pool.request().query('SELECT 1 AS healthcheck')
  } catch (error) {
    console.error('LocalDB connection check failed:', error)
    return {
      connected: false,
      locationTableExists: false,
      requiresStoreSelection: false,
      setupError: getErrorMessage(error),
    }
  }

  try {
    const result = await pool.request().query(`
      SELECT CASE WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NULL THEN 0 ELSE 1 END AS locationTableExists
    `)
    const locationTableExists = Number(result.recordset[0]?.locationTableExists) === 1

    if (!locationTableExists) {
      // Do not auto-create here. FirstRunSetup (runFirstRunSetup) owns initial
      // schema creation so the setup animation can run and the SQL files can be
      // applied with user-visible progress.
    }

    const settings = await getConnectionSettings()

    let requiresStoreSelection = false
    if (locationTableExists) {
      const localSetup = await pool.request().query(`
        SELECT
          CASE WHEN EXISTS (
            SELECT 1 FROM dbo.dts_location
            WHERE IsActive = 1 AND LOWER(LTRIM(RTRIM(access))) = 'admin'
          ) THEN 1 ELSE 0 END AS hasAdmin,
          (
            SELECT COUNT(*) FROM dbo.dts_location
            WHERE LOWER(LTRIM(RTRIM(access))) = 'store'
          ) AS storeAccountCount,
          (
            SELECT COUNT(*) FROM dbo.dts_location
            WHERE IsActive = 1 AND LOWER(LTRIM(RTRIM(access))) = 'store'
          ) AS activeStoreCount
      `)
      const hasAdmin = Number(localSetup.recordset[0]?.hasAdmin) === 1
      const storeAccountCount = Number(localSetup.recordset[0]?.storeAccountCount ?? 0)

      if (storeAccountCount === 0 || !hasAdmin) {
        await ensureLocalDatabaseTables(settings)
        if (!hasAdmin) {
          await initializeLocalDatabase(settings)
        }
      }

      const storeCheck = await pool.request().query(`
        SELECT
          COUNT(*) AS storeAccountCount,
          COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS activeStoreCount
        FROM dbo.dts_location
        WHERE LOWER(LTRIM(RTRIM(access))) = 'store'
      `)
      requiresStoreSelection =
        Number(storeCheck.recordset[0]?.storeAccountCount ?? 0) !== 1
        || Number(storeCheck.recordset[0]?.activeStoreCount ?? 0) !== 1
    }

    return {
      connected: true,
      locationTableExists,
      requiresStoreSelection,
      setupError: null,
    }
  } catch (error) {
    console.error('LocalDB setup/health query failed after connection succeeded:', error)
    let locationTableExists = false
    let requiresStoreSelection = false
    try {
      const status = await pool.request().query(`
        SELECT
          CASE WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NULL THEN 0 ELSE 1 END AS locationTableExists,
          CASE WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NOT NULL THEN (
            SELECT COUNT(*) FROM dbo.dts_location
            WHERE LOWER(LTRIM(RTRIM(access))) = 'store'
          ) ELSE 0 END AS storeAccountCount,
          CASE WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NOT NULL THEN (
            SELECT COUNT(*) FROM dbo.dts_location
            WHERE IsActive = 1 AND LOWER(LTRIM(RTRIM(access))) = 'store'
          ) ELSE 0 END AS activeStoreCount
      `)
      locationTableExists = Number(status.recordset[0]?.locationTableExists) === 1
      requiresStoreSelection = locationTableExists && (
        Number(status.recordset[0]?.storeAccountCount ?? 0) !== 1
        || Number(status.recordset[0]?.activeStoreCount ?? 0) !== 1
      )
    } catch (statusError) {
      console.error('Unable to inspect LocalDB setup state:', statusError)
    }

    return {
      connected: true,
      locationTableExists,
      requiresStoreSelection,
      setupError: getErrorMessage(error),
    }
  }
}

async function checkHqDb(): Promise<{ connected: boolean; guidance: string }> {
  try {
    const pool = await getHqDbPool()

    await pool.request().query(`
      SELECT 1 AS healthcheck
    `)

    return { connected: true, guidance: '' }
  } catch (error) {
    console.error('HQDB health check failed:', error)

    return {
      connected: false,
      guidance: getHqConnectionGuidance(error),
    }
  }
}

export async function checkSystemHealth(): Promise<SystemHealthResult> {
  const [localDb, hqDb] = await Promise.all([
    checkLocalDb(),
    checkHqDb(),
  ])
  const localDbConnected = localDb.connected
  const hqDbConnected = hqDb.connected

  if (localDbConnected && localDb.locationTableExists && hqDbConnected) {
    return {
      ready: true,
      localDbConnected,
      localLocationTableExists: localDb.locationTableExists,
      hqDbConnected,
      requiresStoreSelection: localDb.requiresStoreSelection,
      localSetupError: localDb.setupError,
      message: localDb.requiresStoreSelection
        ? localDb.setupError
          ? `Local POS is connected, but first-run setup needs attention: ${localDb.setupError}`
          : 'Select the store assigned to this POS to finish first-time setup.'
        : 'System Ready',
    }
  }

  if (!localDbConnected && hqDbConnected) {
    return {
      ready: false,
      localDbConnected,
      localLocationTableExists: false,
      hqDbConnected,
      requiresStoreSelection: false,
      localSetupError: localDb.setupError,
      message: `Unable to connect to the Local POS database. ${localDb.setupError ?? ''}`.trim(),
    }
  }

  if (localDbConnected && !localDb.locationTableExists) {
    return {
      ready: false,
      localDbConnected,
      localLocationTableExists: false,
      hqDbConnected,
      requiresStoreSelection: false,
      localSetupError: localDb.setupError,
      message: localDb.setupError
        ? `Local POS database is connected, but setup failed: ${localDb.setupError}`
        : 'Local POS database is connected, but dts_location has not been set up.',
    }
  }

  if (localDbConnected && !hqDbConnected) {
    return {
      ready: true,
      localDbConnected,
      localLocationTableExists: localDb.locationTableExists,
      hqDbConnected,
      requiresStoreSelection: localDb.requiresStoreSelection,
      localSetupError: localDb.setupError,
      message: `Unable to connect to the HQ database. ${hqDb.guidance} Local database login is available.`,
    }
  }

  return {
    ready: false,
    localDbConnected,
    localLocationTableExists: localDb.locationTableExists,
    hqDbConnected,
    requiresStoreSelection: localDb.requiresStoreSelection,
    localSetupError: localDb.setupError,
    message: `Unable to connect to Local POS and HQ databases. ${localDb.setupError ?? ''} ${hqDb.guidance}`.trim(),
  }
}

async function readSqlScript(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le').replace(/^\uFEFF/, '')
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.allocUnsafe(buffer.length - 2)
    for (let i = 2; i + 1 < buffer.length; i += 2) {
      swapped[i - 2] = buffer[i + 1]
      swapped[i - 1] = buffer[i]
    }
    return swapped.toString('utf16le').replace(/^\uFEFF/, '')
  }
  return buffer.toString('utf8').replace(/^\uFEFF/, '')
}

export async function runFirstRunSetup(): Promise<{ success: boolean; message: string }> {
  const pool = await getLocalDbPool()
  let lockAcquired = false
  try {
    const lock = await pool.request()
      .input('resource', sql.NVarChar(255), 'bootstrap:checkpostingdb:first-run-setup')
      .query(`
        DECLARE @lockResult INT;
        EXEC @lockResult = sys.sp_getapplock
          @Resource=@resource,
          @LockMode='Exclusive',
          @LockOwner='Session',
          @LockTimeout=30000;
        SELECT @lockResult AS lockResult;
      `)
    if (Number(lock.recordset[0]?.lockResult) < 0) {
      throw new Error('Unable to lock CheckPostingDB first-run setup. Try again shortly.')
    }
    lockAcquired = true

    await pool.request().query(`
      IF OBJECT_ID(N'dbo.app_schema_migrations', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.app_schema_migrations (
          migration_name NVARCHAR(255) NOT NULL CONSTRAINT PK_app_schema_migrations PRIMARY KEY,
          applied_at DATETIME2(7) NOT NULL CONSTRAINT DF_app_schema_migrations_applied_at DEFAULT (SYSUTCDATETIME())
        );
      END;
    `)

    const setupScripts = [
      { file: 'dts_location.sql', migrationName: 'dts_location.sql' },
      { file: 'create-required-table.sql', migrationName: 'create-required-table.sql' },
      { file: 'create-view-tables.sql', migrationName: 'bootstrap:first-run-create-view-tables' },
    ] as const

    const directory = app.isPackaged
      ? path.join(process.resourcesPath, 'database-setup', 'checkpostingdb')
      : path.join(app.getAppPath(), 'database-setup', 'checkpostingdb')

    for (const { file, migrationName } of setupScripts) {
      const filePath = path.join(directory, file)
      const script = (await readSqlScript(filePath))
        .replace(/^\uFEFF/, '')
        .replace(/^\s*USE\s+\[[^\]]+\]\s*;?\s*$/gim, '')

      const batches = script
        .split(/^\s*GO(?:\s+\d+)?\s*$/gim)
        .map((batch) => batch.trim())
        .filter(Boolean)

      if (batches.length === 0) continue

      const transaction = new sql.Transaction(pool)
      await transaction.begin()
      try {
        await new sql.Request(transaction)
          .input('resource', sql.NVarChar(255), 'bootstrap:checkpostingdb:ensure-local-tables')
          .query(`
            DECLARE @lockResult INT;
            EXEC @lockResult = sys.sp_getapplock
              @Resource=@resource,
              @LockMode='Exclusive',
              @LockOwner='Transaction',
              @LockTimeout=30000;
            IF @lockResult < 0
              THROW 51000, 'Unable to lock checkpostingdb table setup.', 1;
          `)

        if (file === 'dts_location.sql') {
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
        }

        const alreadyApplied = await new sql.Request(transaction)
          .input('migrationName', sql.NVarChar(255), migrationName)
          .query(`
            SELECT 1 AS applied
            FROM dbo.app_schema_migrations WITH (UPDLOCK, HOLDLOCK)
            WHERE migration_name=@migrationName;
          `)
        if (alreadyApplied.recordset.length) {
          await transaction.commit()
          continue
        }

        for (const batch of batches) {
          await new sql.Request(transaction).batch(batch)
        }
        await new sql.Request(transaction)
          .input('migrationName', sql.NVarChar(255), migrationName)
          .query(`
            IF NOT EXISTS (
                SELECT 1 FROM dbo.app_schema_migrations WITH (UPDLOCK, HOLDLOCK)
                WHERE migration_name=@migrationName
            )
                INSERT INTO dbo.app_schema_migrations (migration_name) VALUES (@migrationName);
          `)
        await transaction.commit()
        console.info(`Applied first-run setup: ${file}`)
      } catch (error) {
        await transaction.rollback().catch(() => undefined)
        throw error
      }
    }

    return { success: true, message: 'First-run database setup completed.' }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) }
  } finally {
    if (pool.connected && lockAcquired) {
      await pool.request()
        .input('resource', sql.NVarChar(255), 'bootstrap:checkpostingdb:first-run-setup')
        .query(`EXEC sys.sp_releaseapplock @Resource=@resource, @LockOwner='Session';`)
        .catch(() => undefined)
    }
  }
}
