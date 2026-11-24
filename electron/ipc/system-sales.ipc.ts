import {
  BrowserWindow,
} from 'electron'
import { handleIpc } from './ipc-handler.js'

import {
  exportSystemSalesExcel,
  exportSystemSalesPdf,
} from '../system-sales/system-sales.export.js'

import {
  getWorkstations,
  generateSystemSalesReport,
} from '../system-sales/system-sales.service.js'

import type {
  SystemSalesDateRangeInput,
  SystemSalesExportInput,
} from '../system-sales/system-sales.types.js'

export function registerSystemSalesIpc() {
  handleIpc(
    'system-sales:workstations',
    () => getWorkstations(),
  )

  handleIpc(
    'system-sales:generate',
    async (
      _event,
      input: SystemSalesDateRangeInput,
    ) => {
      return generateSystemSalesReport(input)
    },
  )

  handleIpc(
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

  handleIpc(
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
