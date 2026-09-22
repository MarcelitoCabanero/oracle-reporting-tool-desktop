import { ipcMain } from 'electron'

import {
  getFtpConfig,
  loadMissingMenuItems,
  saveFtpConfig,
  syncMissingMenuItems,
  testConfiguredFtp,
} from '../maintenance/maintenance.service.js'

import type {
  FtpConfig,
  MissingMenuItem,
} from '../maintenance/maintenance.types.js'

export function registerMaintenanceIpc() {
  ipcMain.handle('maintenance:ftp-config', () => getFtpConfig())
  ipcMain.handle(
    'maintenance:ftp-test',
    (_event, config: FtpConfig) => testConfiguredFtp(config),
  )
  ipcMain.handle(
    'maintenance:ftp-save',
    (_event, config: FtpConfig) => saveFtpConfig(config),
  )
  ipcMain.handle('maintenance:missing-items', () => loadMissingMenuItems())
  ipcMain.handle(
    'maintenance:sync-items',
    (_event, rows: MissingMenuItem[]) => syncMissingMenuItems(rows),
  )
}