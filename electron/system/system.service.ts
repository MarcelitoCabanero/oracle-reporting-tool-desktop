import { getLocalDbPool } from '../database/localdb.js'
import { getHqDbPool } from '../database/hqdb.js'
import { ensureLocalDatabaseTables, getConnectionSettings, initializeLocalDatabase } from '../settings/settings.service.js'

export interface SystemHealthResult {
  ready: boolean
  localDbConnected: boolean
  localLocationTableExists: boolean
  hqDbConnected: boolean
  requiresStoreSelection: boolean
  message: string
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
}> {
  try {
    const pool = await getLocalDbPool()

    let result = await pool.request().query(`
      SELECT CASE WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NULL THEN 0 ELSE 1 END AS locationTableExists
    `)
    let locationTableExists = Number(result.recordset[0]?.locationTableExists) === 1
    const settings = await getConnectionSettings()

    if (!locationTableExists) {
      await ensureLocalDatabaseTables(settings)
      result = await pool.request().query(`
        SELECT CASE WHEN OBJECT_ID(N'dbo.dts_location', N'U') IS NULL THEN 0 ELSE 1 END AS locationTableExists
      `)
      locationTableExists = Number(result.recordset[0]?.locationTableExists) === 1
    }

    let requiresStoreSelection = false
    if (locationTableExists) {
      const localSetup = await pool.request().query(`
        SELECT
          CASE WHEN EXISTS (
            SELECT 1 FROM dbo.dts_location
            WHERE IsActive = 1 AND LOWER(LTRIM(RTRIM(access))) = 'admin'
          ) THEN 1 ELSE 0 END AS hasAdmin,
          CASE WHEN EXISTS (
            SELECT 1 FROM dbo.dts_location
            WHERE IsActive = 1 AND LOWER(LTRIM(RTRIM(access))) = 'store'
          ) THEN 1 ELSE 0 END AS hasStore
      `)
      const hasAdmin = Number(localSetup.recordset[0]?.hasAdmin) === 1
      const hasStore = Number(localSetup.recordset[0]?.hasStore) === 1

      if (!hasStore) {
        await ensureLocalDatabaseTables(settings)
        if (!hasAdmin) {
          await initializeLocalDatabase(settings)
        }
      }

      const storeCheck = await pool.request().query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM dbo.dts_location
          WHERE IsActive = 1 AND LOWER(LTRIM(RTRIM(access))) = 'store'
        ) THEN 1 ELSE 0 END AS hasStore
      `)
      requiresStoreSelection = Number(storeCheck.recordset[0]?.hasStore) !== 1
    }

    return {
      connected: true,
      locationTableExists,
      requiresStoreSelection,
    }
  } catch (error) {
    console.error('LocalDB health check failed:', error)

    return { connected: false, locationTableExists: false, requiresStoreSelection: false }
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
      message: localDb.requiresStoreSelection
        ? 'Select the store assigned to this POS to finish first-time setup.'
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
      message: 'Unable to connect to the Local POS database.',
    }
  }

  if (localDbConnected && !localDb.locationTableExists) {
    return {
      ready: false,
      localDbConnected,
      localLocationTableExists: false,
      hqDbConnected,
      requiresStoreSelection: false,
      message: 'Local POS database is connected, but dts_location has not been set up.',
    }
  }

  if (localDbConnected && !hqDbConnected) {
    return {
      ready: true,
      localDbConnected,
      localLocationTableExists: localDb.locationTableExists,
      hqDbConnected,
      requiresStoreSelection: localDb.requiresStoreSelection,
      message: `Unable to connect to the HQ database. ${hqDb.guidance} Local database login is available.`,
    }
  }

  return {
    ready: false,
    localDbConnected,
    localLocationTableExists: localDb.locationTableExists,
    hqDbConnected,
    requiresStoreSelection: localDb.requiresStoreSelection,
    message: `Unable to connect to Local POS and HQ databases. ${hqDb.guidance}`,
  }
}
