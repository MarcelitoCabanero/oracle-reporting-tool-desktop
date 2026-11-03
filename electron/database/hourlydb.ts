import sql from 'mssql'
import 'dotenv/config'

let pool: sql.ConnectionPool | null = null
let connecting: Promise<sql.ConnectionPool> | null = null

function requireCredential(
  preferredName: string,
  fallbackName: string,
): string {
  const value = process.env[preferredName] || process.env[fallbackName]

  if (!value) {
    throw new Error(`${preferredName} or ${fallbackName} is not configured.`)
  }

  return value
}

function createConfig(): sql.config {
  return {
    server: process.env.HOURLY_DB_SERVER || '192.168.5.201',
    database: process.env.HOURLY_DB_DATABASE || 'oracledb',
    user: requireCredential('HOURLY_DB_USER', 'HQ_DB_USER'),
    password: requireCredential('HOURLY_DB_PASSWORD', 'HQ_DB_PASSWORD'),
    port: Number(process.env.HOURLY_DB_PORT || process.env.HQ_DB_PORT || 1433),
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate:
        process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: 10000,
    requestTimeout: 30000,
  }
}

export async function getHourlyDbPool(): Promise<sql.ConnectionPool> {
  if (pool?.connected) {
    return pool
  }

  if (connecting) {
    return connecting
  }

  if (pool) {
    try {
      await pool.close()
    } catch {
      // Ignore errors while cleaning up a disconnected pool.
    }

    pool = null
  }

  const nextPool = new sql.ConnectionPool(createConfig())

  connecting = nextPool
    .connect()
    .then((connectedPool) => {
      pool = connectedPool

      return connectedPool
    })
    .finally(() => {
      connecting = null
    })

  return connecting
}