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
import { handleIpc } from './ipc-handler.js'

export function registerMaintenanceIpc() {
  handleIpc('maintenance:ftp-config', () => getFtpConfig())
  handleIpc(
    'maintenance:ftp-test',
    (_event, config: FtpConfig) => testConfiguredFtp(config),
  )
  handleIpc(
    'maintenance:ftp-save',
    (_event, config: FtpConfig) => saveFtpConfig(config),
  )
  handleIpc('maintenance:missing-items', () => loadMissingMenuItems())
  handleIpc(
    'maintenance:sync-items',
    (_event, rows: MissingMenuItem[]) => syncMissingMenuItems(rows),
  )
}