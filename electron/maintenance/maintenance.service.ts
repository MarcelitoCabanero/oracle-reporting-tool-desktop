import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

import { Client } from 'basic-ftp'

import {
  getMissingMenuItems,
  insertMissingMenuItems,
} from './maintenance.repository.js'

import type {
  FtpConfig,
  MaintenanceResult,
  MissingMenuItem,
} from './maintenance.types.js'

const configFileName = 'ftp_config.txt'

function configPath() {
  return path.join(app.getPath('userData'), configFileName)
}

function validateFtpConfig(config: FtpConfig) {
  if (!config.host.trim()) return 'FTP host is required.'
  if (!config.username.trim()) return 'FTP username is required.'
  if (!config.password) return 'FTP password is required.'
  return null
}

async function testFtpConnection(config: FtpConfig) {
  const validationError = validateFtpConfig(config)
  if (validationError) throw new Error(validationError)

  const client = new Client()
  client.ftp.verbose = false
//-test
  try {
    await client.access({
      host: config.host.trim(),
      user: config.username.trim(),
      password: config.password,
      secure: false,
    })
    await client.list()
  } finally {
    client.close()
  }
}

export async function getFtpConfig(): Promise<FtpConfig> {
  try {
    const contents = await fs.readFile(configPath(), 'utf8')
    const config = JSON.parse(contents) as Partial<FtpConfig>

    return {
      host: config.host ?? '',
      username: config.username ?? '',
      password: config.password ?? '',
    }
  } catch {
    return { host: '', username: '', password: '' }
  }
}

export async function testConfiguredFtp(
  config: FtpConfig,
): Promise<MaintenanceResult> {
  try {
    await testFtpConnection(config)
    return { success: true, message: 'FTP connection successful.' }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'FTP connection failed.',
    }
  }
}

export async function saveFtpConfig(
  config: FtpConfig,
): Promise<MaintenanceResult> {
  const testResult = await testConfiguredFtp(config)
  if (!testResult.success) return testResult

  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(configPath(), JSON.stringify(config, null, 2), 'utf8')

  return {
    success: true,
    message: `FTP configuration saved. Config file: ${configPath()}`,
  }
}

export async function loadMissingMenuItems() {
  return getMissingMenuItems()
}

export async function syncMissingMenuItems(
  rows: MissingMenuItem[],
): Promise<MaintenanceResult> {
  if (rows.length === 0) {
    return { success: false, message: 'There are no missing items to sync.' }
  }

  await insertMissingMenuItems(rows)
  return {
    success: true,
    message: `${rows.length} missing item(s) synced to POS.`,
  }
}