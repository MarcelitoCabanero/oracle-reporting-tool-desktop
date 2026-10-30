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
    server: process.env.HEADQ_DB_SERVER || '192.168.5.201',
    database: process.env.HEADQ_DB_DATABASE || 'HEADQ',
    user: requireCredential('HEADQ_DB_USER', 'HQ_DB_USER'),
    password: requireCredential('HEADQ_DB_PASSWORD', 'HQ_DB_PASSWORD'),
    port: Number(process.env.HEADQ_DB_PORT || process.env.HQ_DB_PORT || 1433),
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

export async function getHeadqDbPool(): Promise<sql.ConnectionPool> {
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
      console.log('HEADQ database connection established.')

      return connectedPool
    })
    .finally(() => {
      connecting = null
    })

  return connecting
}
