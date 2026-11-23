import sql from 'mssql'
import { getDatabaseSqlConfig } from '../settings/settings.service.js'

let pool: sql.ConnectionPool | null = null
let connecting: Promise<sql.ConnectionPool> | null = null

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

  connecting = getDatabaseSqlConfig('hourly')
    .then((config) => {
      const nextPool = new sql.ConnectionPool({
        ...config,
        pool: {
          max: 5,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      })

      return nextPool.connect().then((connectedPool) => {
        console.log(
          `OracleDB hourly connection established: ${config.server}/${config.database}.`,
        )

        return connectedPool
      })
    })
    .then((connectedPool) => {
      pool = connectedPool

      return connectedPool
    })
    .finally(() => {
      connecting = null
    })

  return connecting
}

export async function resetHourlyDbPool(): Promise<void> {
  if (connecting) await connecting.catch(() => undefined)
  if (pool) await pool.close()
  pool = null
}