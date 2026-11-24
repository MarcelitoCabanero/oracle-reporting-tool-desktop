import { BrowserWindow } from 'electron'

import { generateVoidSummaryReport } from '../void-summary/void-summary.service.js'
import {
  exportVoidSummaryExcel,
  exportVoidSummaryPdf,
} from '../void-summary/void-summary.export.js'
import type {
  VoidSummaryExportInput,
  VoidSummaryInput,
} from '../void-summary/void-summary.types.js'
import { handleIpc } from './ipc-handler.js'

export function registerVoidSummaryIpc() {
  handleIpc('void-summary:generate', (_event, input: VoidSummaryInput) =>
    generateVoidSummaryReport(input),
  )
  handleIpc('void-summary:export-excel', (event, input: VoidSummaryExportInput) =>
    exportVoidSummaryExcel(input, BrowserWindow.fromWebContents(event.sender) ?? undefined),
  )
  handleIpc('void-summary:export-pdf', (event, input: VoidSummaryExportInput) =>
    exportVoidSummaryPdf(input, BrowserWindow.fromWebContents(event.sender) ?? undefined),
  )
}
