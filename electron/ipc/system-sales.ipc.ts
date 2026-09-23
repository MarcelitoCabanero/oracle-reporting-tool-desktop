import {
  ipcMain,
} from 'electron'

import {
  generateSystemSalesReport,
} from '../system-sales/system-sales.service.js'

import type {
  SystemSalesDateRangeInput,
} from '../system-sales/system-sales.types.js'

export function registerSystemSalesIpc() {
  ipcMain.handle(
    'system-sales:generate',

    async (
      _event,
      input: SystemSalesDateRangeInput,
    ) => {
      return generateSystemSalesReport(
        input,
      )
    },
  )
}