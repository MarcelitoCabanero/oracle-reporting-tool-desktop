import { handleIpc } from './ipc-handler.js'

import {
  checkSystemHealth,
  runFirstRunSetup,
} from '../system/system.service.js'

import {
  checkAppVersion,
} from '../system/version.service.js'

export function registerSystemIpc() {
  console.log(
    'Registering system IPC...',
  )

  handleIpc(
    'system:health-check',
    async () => {
      console.log(
        'System health check requested',
      )

      return checkSystemHealth()
    },
  )

  handleIpc(
    'system:check-version',
    async () => {
      console.log(
        'Application version check requested',
      )

      return checkAppVersion()
    },
  )

  handleIpc(
    'system:run-first-run-setup',
    async () => {
      console.log(
        'First-run database setup requested',
      )

      return runFirstRunSetup()
    },
  )
}