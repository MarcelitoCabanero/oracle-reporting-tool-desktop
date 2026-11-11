import sql from 'mssql'
import { getDatabaseSqlConfig } from '../settings/settings.service.js'

let pool: sql.ConnectionPool | null = null
let connecting: Promise<sql.ConnectionPool> | null = null

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

  connecting = getDatabaseSqlConfig('headq')
    .then((config) => new sql.ConnectionPool({
      ...config,
      pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    }))
    .then((nextPool) => nextPool.connect())
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

export async function resetHeadqDbPool(): Promise<void> {
  if (connecting) await connecting.catch(() => undefined)
  if (pool) await pool.close()
  pool = null
}
