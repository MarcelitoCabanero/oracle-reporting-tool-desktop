import { randomUUID } from 'node:crypto'
import { handleIpc } from './ipc-handler.js'

import { verifyAdminPassword } from '../auth/auth.repository.js'
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
  getFirstRunStoreOptions,
  getLocationOptions,
  initializeLocalDatabase,
  saveConnectionSettings,
  setLocalStore,
  setFirstRunStore,
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
    resetHourlyDbPool(),
  ])
}

function authorizeSettingsOperation(token?: string): void {
  if (token) {
    requireAdminSession(token)
  }
}

export function registerSettingsIpc() {
  handleIpc('settings:get', () => getConnectionSettingsView())

  handleIpc('settings:admin-unlock', async (_event, password: string) => {
    const valid = await verifyAdminPassword(password)
    if (!valid) {
      throw new Error('The admin password is invalid.')
    }

    const token = randomUUID()
    adminSessions.set(token, Date.now() + adminSessionLifetimeMs)
    return token
  })

  handleIpc('settings:test-database', async (_event, input: ConnectionSettings, key: DatabaseKey, token?: string) => {
    authorizeSettingsOperation(token)
    await testDatabaseSettings(input, key)
    return { success: true, message: `${key} database connection successful.` }
  })

  handleIpc('settings:test-ftp', async (_event, input: ConnectionSettings, token?: string) => {
    authorizeSettingsOperation(token)
    await testFtpSettings(input)
    return { success: true, message: 'FTP connection successful.' }
  })

  handleIpc('settings:save-bootstrap', async (_event, input: ConnectionSettings) => {
    await saveConnectionSettings(input)
    await resetDatabasePools()
    return { success: true, message: 'Connection settings saved securely.' }
  })

  handleIpc('settings:save-admin', async (_event, input: ConnectionSettings, token: string) => {
    requireAdminSession(token)
    await saveConnectionSettings(input)
    await resetDatabasePools()
    return { success: true, message: 'Connection settings saved securely.' }
  })

  handleIpc('settings:location-options', async (_event, input: ConnectionSettings, token: string) => {
    requireAdminSession(token)
    return getLocationOptions(input)
  })

  handleIpc('settings:first-run-store-options', async () => getFirstRunStoreOptions())

  handleIpc('settings:first-run-set-store', async (_event, locationId: number) => {
    const result = await setFirstRunStore(locationId)
    await resetDatabasePools()
    return { success: true, ...result }
  })

  handleIpc('settings:initialize-local-db', async (_event, input: ConnectionSettings) => {
    await saveConnectionSettings(input)
    await resetDatabasePools()
    let result: Awaited<ReturnType<typeof initializeLocalDatabase>>
    try {
      result = await initializeLocalDatabase(input)
    } finally {
      await resetDatabasePools()
    }
    return { success: true, ...result }
  })

  handleIpc('settings:set-local-store', async (
    _event,
    input: ConnectionSettings,
    locationId: number,
    token: string,
  ) => {
    requireAdminSession(token)
    await saveConnectionSettings(input)
    await resetDatabasePools()
    let result: Awaited<ReturnType<typeof setLocalStore>>
    try {
      result = await setLocalStore(input, locationId)
    } finally {
      await resetDatabasePools()
    }
    return { success: true, ...result }
  })
}
