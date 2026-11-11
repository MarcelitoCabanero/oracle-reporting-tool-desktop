import sql from 'mssql'
import { getDatabaseSqlConfig } from '../settings/settings.service.js'

let pool: sql.ConnectionPool | null = null
let connecting: Promise<sql.ConnectionPool> | null = null

export async function getHqDbPool(): Promise<sql.ConnectionPool> {
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
      // Ignore errors when cleaning up an old pool.
    }

    pool = null
  }

  connecting = getDatabaseSqlConfig('hq')
    .then((config) => new sql.ConnectionPool({
      ...config,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    }))
    .then((nextPool) => nextPool.connect())
    .then((connectedPool) => {
      console.log('HQDB connection established.')
      pool = connectedPool

      return connectedPool
    })
    .finally(() => {
      connecting = null
    })

  return connecting
}

export async function resetHqDbPool(): Promise<void> {
  if (connecting) await connecting.catch(() => undefined)
  if (pool) await pool.close()
  pool = null
}