import { BrowserWindow } from 'electron'
import {
  exportSalesTargetAnalyticsExcel,
  exportSalesTargetAnalyticsPdf,
  exportSalesTargetWorksheetExcel,
  exportSalesTargetWorksheetPdf,
} from '../sales-target/sales-target.export.js'
import { loadSalesTargetData } from '../sales-target/sales-target.repository.js'
import { handleIpc } from './ipc-handler.js'

export function registerSalesTargetIpc(): void {
  handleIpc(
    'sales-target:load',
    (_e, input: Parameters<typeof loadSalesTargetData>[0]) => loadSalesTargetData(input),
  )
  handleIpc(
    'sales-target:export-worksheet-excel',
    (e, input: Parameters<typeof exportSalesTargetWorksheetExcel>[0]) =>
      exportSalesTargetWorksheetExcel(input, BrowserWindow.fromWebContents(e.sender) ?? undefined),
  )
  handleIpc(
    'sales-target:export-worksheet-pdf',
    (e, input: Parameters<typeof exportSalesTargetWorksheetPdf>[0]) =>
      exportSalesTargetWorksheetPdf(input, BrowserWindow.fromWebContents(e.sender) ?? undefined),
  )
  handleIpc(
    'sales-target:export-analytics-excel',
    (e, input: Parameters<typeof exportSalesTargetAnalyticsExcel>[0]) =>
      exportSalesTargetAnalyticsExcel(input, BrowserWindow.fromWebContents(e.sender) ?? undefined),
  )
  handleIpc(
    'sales-target:export-analytics-pdf',
    (e, input: Parameters<typeof exportSalesTargetAnalyticsPdf>[0]) =>
      exportSalesTargetAnalyticsPdf(input, BrowserWindow.fromWebContents(e.sender) ?? undefined),
  )
}
