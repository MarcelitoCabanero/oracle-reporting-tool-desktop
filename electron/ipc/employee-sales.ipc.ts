import { BrowserWindow } from 'electron'
import { generateAllEmployeeSales, generateEmployeeSales, loadEmployees } from '../employee-sales/employee-sales.service.js'
import { exportEmployeeSalesExcel, exportEmployeeSalesPdf } from '../employee-sales/employee-sales.export.js'
import type { EmployeeSalesAllInput, EmployeeSalesExportInput, EmployeeSalesInput } from '../employee-sales/employee-sales.types.js'
import { handleIpc } from './ipc-handler.js'

export function registerEmployeeSalesIpc() {
  handleIpc('employee-sales:employees', () => loadEmployees())
  handleIpc('employee-sales:generate', (_event, input: EmployeeSalesInput) =>
    generateEmployeeSales(input))
  handleIpc('employee-sales:generate-all', (_event, input: EmployeeSalesAllInput) =>
    generateAllEmployeeSales(input))
  handleIpc('employee-sales:export-excel', (event, input: EmployeeSalesExportInput) =>
    exportEmployeeSalesExcel(input, BrowserWindow.fromWebContents(event.sender) ?? undefined))
  handleIpc('employee-sales:export-pdf', (event, input: EmployeeSalesExportInput) =>
    exportEmployeeSalesPdf(input, BrowserWindow.fromWebContents(event.sender) ?? undefined))
}
