import { getLocalDbPool } from '../database/localdb.js'
import { getHqDbPool } from '../database/hqdb.js'

export interface SystemHealthResult {
  ready: boolean
  localDbConnected: boolean
  localLocationTableExists: boolean
  hqDbConnected: boolean
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

async function checkLocalDb(): Promise<{ connected: boolean; locationTableExists: boolean }> {
  try {
    const pool = await getLocalDbPool()

    const result = await pool.request().query(`
      SELECT
        1 AS healthcheck,
        CASE WHEN OBJECT_ID('dbo.dts_location', 'U') IS NULL THEN 0 ELSE 1 END AS locationTableExists
    `)

    return {
      connected: true,
      locationTableExists:
        result.recordset[0]?.locationTableExists === true ||
        Number(result.recordset[0]?.locationTableExists) === 1,
    }
  } catch (error) {
    console.error('LocalDB health check failed:', error)

    return { connected: false, locationTableExists: false }
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
      message: 'System Ready',
    }
  }

  if (!localDbConnected && hqDbConnected) {
    return {
      ready: false,
      localDbConnected,
      localLocationTableExists: false,
      hqDbConnected,
      message: 'Unable to connect to the Local POS database.',
    }
  }

  if (localDbConnected && !localDb.locationTableExists) {
    return {
      ready: false,
      localDbConnected,
      localLocationTableExists: false,
      hqDbConnected,
      message: 'Local POS database is connected, but dts_location has not been set up.',
    }
  }

  if (localDbConnected && !hqDbConnected) {
    return {
      ready: true,
      localDbConnected,
      localLocationTableExists: localDb.locationTableExists,
      hqDbConnected,
      message: `Unable to connect to the HQ database. ${hqDb.guidance} Local database login is available.`,
    }
  }

  return {
    ready: false,
    localDbConnected,
    localLocationTableExists: localDb.locationTableExists,
    hqDbConnected,
    message: `Unable to connect to Local POS and HQ databases. ${hqDb.guidance}`,
  }
}