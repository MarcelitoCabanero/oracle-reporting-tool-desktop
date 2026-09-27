import {
  BrowserWindow,
  ipcMain,
} from 'electron'

import {
  exportSystemSalesExcel,
  exportSystemSalesPdf,
} from '../system-sales/system-sales.export.js'

import {
  generateSystemSalesReport,
} from '../system-sales/system-sales.service.js'

import type {
  SystemSalesDateRangeInput,
  SystemSalesExportInput,
} from '../system-sales/system-sales.types.js'

export function registerSystemSalesIpc() {
  ipcMain.handle(
    'system-sales:generate',
    async (
      _event,
      input: SystemSalesDateRangeInput,
    ) => {
      return generateSystemSalesReport(input)
    },
  )

  ipcMain.handle(
    'system-sales:export-excel',
    async (
      event,
      input: SystemSalesExportInput,
    ) => {
      const parent =
        BrowserWindow.fromWebContents(
          event.sender,
        ) ?? undefined

      return exportSystemSalesExcel(
        input,
        parent,
      )
    },
  )

  ipcMain.handle(
    'system-sales:export-pdf',
    async (
      event,
      input: SystemSalesExportInput,
    ) => {
      const parent =
        BrowserWindow.fromWebContents(
          event.sender,
        ) ?? undefined

      return exportSystemSalesPdf(
        input,
        parent,
      )
    },
  )
}
