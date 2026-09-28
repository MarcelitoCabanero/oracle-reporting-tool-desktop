import { ipcMain } from 'electron'
import { generateEmployeeSales, loadEmployees } from '../employee-sales/employee-sales.service.js'
import type { EmployeeSalesInput } from '../employee-sales/employee-sales.types.js'

export function registerEmployeeSalesIpc() {
  ipcMain.handle('employee-sales:employees', () => loadEmployees())
  ipcMain.handle('employee-sales:generate', (_event, input: EmployeeSalesInput) =>
    generateEmployeeSales(input))
}
