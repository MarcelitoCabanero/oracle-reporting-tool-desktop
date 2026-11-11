import { randomUUID } from 'node:crypto'
import { ipcMain } from 'electron'

import { verifyAdminPassword } from '../auth/auth.repository.js'
import {
  resetHeadqDbPool,
} from '../database/headqdb.js'
import {
  resetHqDbPool,
} from '../database/hqdb.js'
import {
  resetHourlyDbPool,
} from '../database/hourlydb.js'
import {
  resetLocalDbPool,
} from '../database/localdb.js'
import {
  getConnectionSettingsView,
  getLocationOptions,
  provisionLocalDatabase,
  saveConnectionSettings,
  testDatabaseSettings,
  testFtpSettings,
} from '../settings/settings.service.js'
import type {
  ConnectionSettings,
  DatabaseKey,
} from '../settings/settings.types.js'

const adminSessions = new Map<string, number>()
const adminSessionLifetimeMs = 10 * 60 * 1000

function requireAdminSession(token: string): void {
  const expiresAt = adminSessions.get(token)
  if (!expiresAt || expiresAt <= Date.now()) {
    adminSessions.delete(token)
    throw new Error('Admin authorization expired. Enter the admin password again.')
  }
}

async function resetDatabasePools(): Promise<void> {
  await Promise.all([
    resetLocalDbPool(),
    resetHqDbPool(),
    resetHeadqDbPool(),
    resetHourlyDbPool(),
  ])
}

function authorizeSettingsOperation(token?: string): void {
  if (token) {
    requireAdminSession(token)
  }
}

export function registerSettingsIpc() {
  ipcMain.handle('settings:get', () => getConnectionSettingsView())

  ipcMain.handle('settings:admin-unlock', async (_event, password: string) => {
    const valid = await verifyAdminPassword(password)
    if (!valid) {
      throw new Error('The admin password is invalid.')
    }

    const token = randomUUID()
    adminSessions.set(token, Date.now() + adminSessionLifetimeMs)
    return token
  })

  ipcMain.handle('settings:test-database', async (_event, input: ConnectionSettings, key: DatabaseKey, token?: string) => {
    authorizeSettingsOperation(token)
    await testDatabaseSettings(input, key)
    return { success: true, message: `${key} database connection successful.` }
  })

  ipcMain.handle('settings:test-ftp', async (_event, input: ConnectionSettings, token?: string) => {
    authorizeSettingsOperation(token)
    await testFtpSettings(input)
    return { success: true, message: 'FTP connection successful.' }
  })

  ipcMain.handle('settings:save-bootstrap', async (_event, input: ConnectionSettings) => {
    await saveConnectionSettings(input)
    await resetDatabasePools()
    return { success: true, message: 'Connection settings saved securely.' }
  })

  ipcMain.handle('settings:save-admin', async (_event, input: ConnectionSettings, token: string) => {
    requireAdminSession(token)
    await saveConnectionSettings(input)
    await resetDatabasePools()
    return { success: true, message: 'Connection settings saved securely.' }
  })

  ipcMain.handle('settings:location-options', async (_event, input: ConnectionSettings, token?: string) => {
    authorizeSettingsOperation(token)
    return getLocationOptions(input)
  })

  ipcMain.handle('settings:provision-local-db', async (
    _event,
    input: ConnectionSettings,
    locationIds: number[],
    token?: string,
  ) => {
    authorizeSettingsOperation(token)
    await saveConnectionSettings(input)
    await resetDatabasePools()
    const result = await provisionLocalDatabase(input, locationIds)
    await resetDatabasePools()
    return { success: true, ...result }
  })
}
