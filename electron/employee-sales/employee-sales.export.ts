import { BrowserWindow, dialog } from 'electron'
import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'
import type { EmployeeSalesExportInput, EmployeeSalesExportResult } from './employee-sales.types.js'

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value || 0)
const period = (report: EmployeeSalesExportInput['report']) => report.dateFrom === report.dateTo ? report.dateFrom : `${report.dateFrom} to ${report.dateTo}`
const fileName = (input: EmployeeSalesExportInput) => `Employee_Sales_${input.report.employeeName.replace(/[^a-z0-9]+/gi, '_')}_${input.report.dateFrom}${input.report.dateTo === input.report.dateFrom ? '' : `_to_${input.report.dateTo}`}`
const result = (success: boolean, canceled: boolean, message: string, filePath?: string): EmployeeSalesExportResult => ({ success, canceled, message, filePath })
async function save(parent: BrowserWindow | undefined, title: string, defaultPath: string, extension: string) { return parent ? dialog.showSaveDialog(parent, { title, defaultPath, filters: [{ name: extension === 'xlsx' ? 'Excel Workbook' : 'PDF files', extensions: [extension] }] }) : dialog.showSaveDialog({ title, defaultPath, filters: [{ name: extension === 'xlsx' ? 'Excel Workbook' : 'PDF files', extensions: [extension] }] }) }

export async function exportEmployeeSalesExcel(input: EmployeeSalesExportInput, parent?: BrowserWindow): Promise<EmployeeSalesExportResult> {
  const target = await save(parent, 'Export Employee Sales Excel', `${fileName(input)}.xlsx`, 'xlsx')
  if (target.canceled || !target.filePath) return result(false, true, 'Excel export canceled.')
  const r = input.report, m = r.metrics, book = new ExcelJS.Workbook(), sheet = book.addWorksheet('Employee Sales')
  sheet.columns = [{ width: 27 }, { width: 18 }, { width: 4 }, { width: 27 }, { width: 18 }]
  sheet.mergeCells('A1:E1'); sheet.getCell('A1').value = 'EMPLOYEE SALES REPORT'; sheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FFF36C21' } }
  sheet.mergeCells('A2:E2'); sheet.getCell('A2').value = `Employee: ${r.employeeName}   |   Report Period: ${period(r)}`
  const add = (row: number, label: string, value: number, column = 1) => { sheet.getCell(row, column).value = label; sheet.getCell(row, column + 1).value = value; sheet.getCell(row, column + 1).numFmt = '₱#,##0.00;[Red]-₱#,##0.00' }
  sheet.mergeCells('A4:E4'); sheet.getCell('A4').value = 'SALES OVERVIEW'; sheet.getCell('A4').font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
  add(5, 'Net Sales', m.netSales); add(6, 'Revenue', m.netSales + m.taxCollected); add(7, 'Tax Collected', m.taxCollected); add(8, 'Variance Amount', m.varianceAmount)
  add(5, 'Vatable Sales', m.vatableSales, 4); add(6, 'VAT Exempt Sales', m.vatExemptSales, 4); add(7, 'Zero Rated Sales', m.vatZeroRatedSales, 4); add(8, 'Outstanding', m.outstanding, 4)
  sheet.mergeCells('A10:E10'); sheet.getCell('A10').value = 'DISCOUNTS & ADJUSTMENTS'; sheet.getCell('A10').font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getCell('A10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
  ;[['Less VAT',m.lessVat],['Senior Citizen',m.lessSC],['PWD',m.lessPWD],['Employee',m.lessEmp],['National Athlete',m.lessNationalAth],['Solo Parent',m.lessSoloParent],['Other Discount',m.otherDiscount],['GC Sales',m.gcSales],['GC Excess',m.gcExcess],['Void Amount',m.voidAmount],['Void Count',m.voidCount]].forEach(([label, value], index) => add(11 + index, label as string, value as number, index < 6 ? 1 : 4))
  const start = 18; sheet.mergeCells(start, 1, start, 5); sheet.getCell(start, 1).value = 'TENDER BREAKDOWN'; sheet.getCell(start, 1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getCell(start, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
  sheet.getRow(start + 1).values = ['Tender Name', 'Qty', 'Amount']; let row = start + 2
  r.tenders.forEach(t => { sheet.getRow(row).values = [t.tenderName, t.qty, t.amount]; sheet.getCell(row, 3).numFmt = '₱#,##0.00;[Red]-₱#,##0.00'; row += 1 })
  sheet.getRow(row).values = ['TOTAL', r.tenderTotal.qty, r.tenderTotal.amount]; sheet.getCell(row, 3).numFmt = '₱#,##0.00;[Red]-₱#,##0.00'; sheet.getRow(row).font = { bold: true }
  await book.xlsx.writeFile(target.filePath)
  return result(true, false, 'Employee Sales Excel exported successfully.', target.filePath)
}

export async function exportEmployeeSalesPdf(input: EmployeeSalesExportInput, parent?: BrowserWindow): Promise<EmployeeSalesExportResult> {
  const target = await save(parent, 'Export Employee Sales PDF', `${fileName(input)}.pdf`, 'pdf')
  if (target.canceled || !target.filePath) return result(false, true, 'PDF export canceled.')
  const r = input.report, m = r.metrics
  const rows = [['Net Sales',m.netSales],['Revenue',m.netSales+m.taxCollected],['Tax Collected',m.taxCollected],['Vatable Sales',m.vatableSales],['VAT Exempt Sales',m.vatExemptSales],['Zero Rated Sales',m.vatZeroRatedSales],['Less VAT',m.lessVat],['Senior Citizen',m.lessSC],['PWD',m.lessPWD],['Employee Discount',m.lessEmp],['Other Discount',m.otherDiscount],['GC Sales',m.gcSales],['Void Amount',m.voidAmount],['Outstanding',m.outstanding],['Variance Amount',m.varianceAmount]].map(([label, value]) => `<tr><td>${label}</td><td>${money(value as number)}</td></tr>`).join('')
  const tenders = r.tenders.map(t => `<tr><td>${t.tenderName}</td><td>${t.qty}</td><td>${money(t.amount)}</td></tr>`).join('') || '<tr><td colspan="3">No tender records found.</td></tr>'
  const html = `<!doctype html><html><head><style>@page{size:A4;margin:12mm}body{font:11px Arial;color:#1f2937}h1{color:#f36c21;margin:0}h2{font-size:12px;background:#1f2937;color:#fff;padding:7px;margin:18px 0 0}table{width:100%;border-collapse:collapse}td,th{padding:7px;border-bottom:1px solid #e4e7ec;text-align:left}td:not(:first-child),th:not(:first-child){text-align:right}.muted{color:#667085}</style></head><body><h1>EMPLOYEE SALES REPORT</h1><p class="muted">Employee: ${r.employeeName}<br>Report Period: ${period(r)}</p><h2>SALES & ADJUSTMENTS</h2><table>${rows}</table><h2>TENDER BREAKDOWN</h2><table><tr><th>Tender Name</th><th>Qty</th><th>Amount</th></tr>${tenders}<tr><th>TOTAL</th><th>${r.tenderTotal.qty}</th><th>${money(r.tenderTotal.amount)}</th></tr></table></body></html>`
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } })
  try { await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`); await fs.writeFile(target.filePath, await window.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })); return result(true, false, 'Employee Sales PDF exported successfully.', target.filePath) } finally { if (!window.isDestroyed()) window.destroy() }
}
