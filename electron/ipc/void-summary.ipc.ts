import { BrowserWindow, ipcMain } from 'electron'

import { generateVoidSummaryReport } from '../void-summary/void-summary.service.js'
import {
  exportVoidSummaryExcel,
  exportVoidSummaryPdf,
} from '../void-summary/void-summary.export.js'

export function registerVoidSummaryIpc() {
  ipcMain.handle('void-summary:generate', (_event, input) =>
    generateVoidSummaryReport(input),
  )
  ipcMain.handle('void-summary:export-excel', (event, input) =>
    exportVoidSummaryExcel(input, BrowserWindow.fromWebContents(event.sender) ?? undefined),
  )
  ipcMain.handle('void-summary:export-pdf', (event, input) =>
    exportVoidSummaryPdf(input, BrowserWindow.fromWebContents(event.sender) ?? undefined),
  )
}
