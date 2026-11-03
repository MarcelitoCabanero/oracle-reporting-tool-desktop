import { ipcMain } from 'electron'
import { generateAllEmployeeSales, generateEmployeeSales, loadEmployees } from '../employee-sales/employee-sales.service.js'
import { exportEmployeeSalesExcel, exportEmployeeSalesPdf } from '../employee-sales/employee-sales.export.js'
import { BrowserWindow } from 'electron'
import type { EmployeeSalesAllInput, EmployeeSalesInput } from '../employee-sales/employee-sales.types.js'

export function registerEmployeeSalesIpc() {
  ipcMain.handle('employee-sales:employees', () => loadEmployees())
  ipcMain.handle('employee-sales:generate', (_event, input: EmployeeSalesInput) =>
    generateEmployeeSales(input))
  ipcMain.handle('employee-sales:generate-all', (_event, input: EmployeeSalesAllInput) =>
    generateAllEmployeeSales(input))
  ipcMain.handle('employee-sales:export-excel', (event, input) =>
    exportEmployeeSalesExcel(input, BrowserWindow.fromWebContents(event.sender) ?? undefined))
  ipcMain.handle('employee-sales:export-pdf', (event, input) =>
    exportEmployeeSalesPdf(input, BrowserWindow.fromWebContents(event.sender) ?? undefined))
}
