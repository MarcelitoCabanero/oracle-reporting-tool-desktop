import { BrowserWindow, dialog } from 'electron'
import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'

type Row = Record<string, unknown>
type Input = { dateFrom: string; dateTo: string; type: string; rows: Row[] }
type Result = { success: boolean; canceled: boolean; message: string; filePath?: string }
const value = (row: Row, key: string) => Number(row[key] ?? 0)
const money = (amount: number) => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
const date = (raw: unknown) => { const value = String(raw ?? '').slice(0, 10); const parts = value.split('-'); return parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : value }
const groups = (rows: Row[]) => ['OSCA', 'PWD'].map(kind => [kind, rows.filter(row => row.discountType === kind)] as const).filter(([, rows]) => rows.length)
const save = (parent: BrowserWindow | undefined, title: string, path: string, extension: string) => { const options = { title, defaultPath: path, filters: [{ name: extension === 'xlsx' ? 'Excel Workbook' : 'PDF files', extensions: [extension] }] }; return parent ? dialog.showSaveDialog(parent, options) : dialog.showSaveDialog(options) }
const result = (success: boolean, canceled: boolean, message: string, filePath?: string): Result => ({ success, canceled, message, filePath })

export async function exportScPwdExcel(input: Input, parent?: BrowserWindow): Promise<Result> {
  const target = await save(parent, 'Export SC / PWD Listing Excel', `SC_PWD_Listing_${input.dateFrom}_to_${input.dateTo}.xlsx`, 'xlsx')
  if (target.canceled || !target.filePath) return result(false, true, 'Excel export canceled.')
  const book = new ExcelJS.Workbook(), sheet = book.addWorksheet('SC PWD Listing')
  sheet.columns = [16, 16, 16, 18, 25, 15, 15, 15, 15, 16]
  sheet.mergeCells('A1:J1'); sheet.getCell('A1').value = 'SC / PWD LISTING'; sheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FFF36C21' } }
  sheet.mergeCells('A2:J2'); sheet.getCell('A2').value = `Report Period: ${input.dateFrom} to ${input.dateTo} | Type: ${input.type}`
  const headers = ['Check Number', 'Business Date', 'Discount Type', 'SC/PWD ID', 'SC/PWD Name', 'Gross Sale', 'Less VAT', 'Less Disc.', 'Net Sales', 'Workstation']; sheet.getRow(4).values = headers; sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
  let row = 5; input.rows.forEach(item => { sheet.getRow(row).values = [String(item.checkNumber ?? ''), date(item.businessDate), String(item.discountType ?? ''), String(item.discountId ?? ''), String(item.discountName ?? ''), value(item, 'grossSale'), value(item, 'lessVat'), value(item, 'lessDisc'), value(item, 'netSales'), String(item.workstation ?? '')]; [6,7,8,9].forEach(column => sheet.getCell(row, column).numFmt = '#,##0.00'); row += 1 })
  for (const [kind, items] of groups(input.rows)) { sheet.getCell(row, 3).value = `TOTAL ${kind}`; sheet.getCell(row, 4).value = `${items.length} Qty(s)`; ['grossSale','lessVat','lessDisc','netSales'].forEach((key, i) => { sheet.getCell(row, i + 6).value = items.reduce((sum, item) => sum + value(item, key), 0); sheet.getCell(row, i + 6).numFmt = '#,##0.00' }); sheet.getRow(row).font = { bold: true }; row += 1 }
  sheet.getCell(row, 3).value = 'GRAND TOTAL'; sheet.getCell(row, 4).value = `${input.rows.length} Transaction(s)`; ['grossSale','lessVat','lessDisc','netSales'].forEach((key, i) => { sheet.getCell(row, i + 6).value = input.rows.reduce((sum, item) => sum + value(item, key), 0); sheet.getCell(row, i + 6).numFmt = '#,##0.00' }); sheet.getRow(row).font = { bold: true }
  await book.xlsx.writeFile(target.filePath); return result(true, false, 'SC / PWD Listing Excel exported successfully.', target.filePath)
}

export async function exportScPwdPdf(input: Input, parent?: BrowserWindow): Promise<Result> {
  const target = await save(parent, 'Export SC / PWD Listing PDF', `SC_PWD_Listing_${input.dateFrom}_to_${input.dateTo}.pdf`, 'pdf')
  if (target.canceled || !target.filePath) return result(false, true, 'PDF export canceled.')
  const cells = (row: Row) => `<tr><td>${row.checkNumber ?? ''}</td><td>${date(row.businessDate)}</td><td>${row.discountType ?? ''}</td><td>${row.discountId ?? ''}</td><td>${row.discountName ?? ''}</td><td>${money(value(row,'grossSale'))}</td><td>${money(value(row,'lessVat'))}</td><td>${money(value(row,'lessDisc'))}</td><td>${money(value(row,'netSales'))}</td><td>${row.workstation ?? ''}</td></tr>`
  const html = `<!doctype html><style>@page{size:A4 landscape;margin:8mm}body{font:9px Arial}h1{color:#f36c21}table{width:100%;border-collapse:collapse}td,th{padding:5px;border:1px solid #ddd}th{background:#1f2937;color:#fff}td:nth-child(n+6){text-align:right}.total{font-weight:bold;background:#fff2e5}</style><h1>SC / PWD LISTING</h1><p>Report Period: ${input.dateFrom} to ${input.dateTo} | Type: ${input.type}</p><table><tr>${['Check Number','Business Date','Type','SC/PWD ID','SC/PWD Name','Gross Sale','Less VAT','Less Disc.','Net Sales','Workstation'].map(x=>`<th>${x}</th>`).join('')}</tr>${input.rows.map(cells).join('')}${groups(input.rows).map(([kind, rows])=>`<tr class="total"><td colspan="2"></td><td>TOTAL ${kind}</td><td>${rows.length} Qty(s)</td><td></td>${['grossSale','lessVat','lessDisc','netSales'].map(key=>`<td>${money(rows.reduce((s,r)=>s+value(r,key),0))}</td>`).join('')}<td></td></tr>`).join('')}<tr class="total"><td colspan="2"></td><td>GRAND TOTAL</td><td>${input.rows.length} Transaction(s)</td><td></td>${['grossSale','lessVat','lessDisc','netSales'].map(key=>`<td>${money(input.rows.reduce((s,r)=>s+value(r,key),0))}</td>`).join('')}<td></td></tr></table>`
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } }); try { await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`); await fs.writeFile(target.filePath, await window.webContents.printToPDF({ printBackground: true, landscape: true, pageSize: 'A4' })); return result(true, false, 'SC / PWD Listing PDF exported successfully.', target.filePath) } finally { if (!window.isDestroyed()) window.destroy() }
}
