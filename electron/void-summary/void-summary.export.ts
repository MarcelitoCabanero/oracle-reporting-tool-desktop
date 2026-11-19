import { BrowserWindow, dialog } from 'electron'
import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'

import type {
  VoidSummaryExportInput,
  VoidSummaryExportResult,
} from './void-summary.types.js'

const DARK = 'FF1F2937'
const WHITE = 'FFFFFFFF'
const RED = 'FFC93434'
const MONEY_FMT = '#,##0.00'

function showSaveDialog(parent: BrowserWindow | undefined, options: Electron.SaveDialogOptions) {
  return parent ? dialog.showSaveDialog(parent, options) : dialog.showSaveDialog(options)
}

const safeDate = (v: string) => v.replace(/[^0-9-]/g, '')
const baseName = (i: VoidSummaryExportInput) => {
  const from = safeDate(i.dateFrom)
  const to = safeDate(i.dateTo)
  return from === to ? `Void_Summary_${from}` : `Void_Summary_${from}_to_${to}`
}
const money = (v: number) =>
  new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)
const int = (v: number) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(v || 0)
const esc = (v: string) =>
  String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const period = (i: VoidSummaryExportInput) =>
  i.dateFrom === i.dateTo ? i.dateFrom : `${i.dateFrom} to ${i.dateTo}`

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: WHITE } }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } }
  row.alignment = { vertical: 'middle' }
}

export async function exportVoidSummaryExcel(
  input: VoidSummaryExportInput,
  parent?: BrowserWindow,
): Promise<VoidSummaryExportResult> {
  const save = await showSaveDialog(parent, {
    title: 'Export Void Summary Excel',
    defaultPath: `${baseName(input)}.xlsx`,
    filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
  })
  if (save.canceled || !save.filePath) {
    return { success: false, canceled: true, message: 'Excel export canceled.' }
  }

  const r = input.report
  const book = new ExcelJS.Workbook()
  book.creator = 'Oracle Reporting Tool Desktop'
  book.created = new Date()

  // Sheet 1: Void Invoices
  const s1 = book.addWorksheet('Void Invoices', { views: [{ showGridLines: false }] })
  s1.columns = [14, 22, 14, 16, 20, 20, 15, 18, 18, 12].map((width) => ({ width }))
  s1.getCell('A1').value = 'SYSTEM SALES - VOID TRANSACTIONS'
  s1.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFF36C21' } }
  s1.getCell('A2').value = `Business Date Range: ${period(input)}`
  s1.getCell('A3').value = `Generated At: ${new Date().toLocaleString('en-PH')}`
  s1.getCell('A5').value = 'Total Void Invoices'
  s1.getCell('B5').value = r.voidSummary.totalVoidCount
  s1.getCell('A6').value = 'Total Void Amount (PHP)'
  s1.getCell('B6').value = r.voidSummary.totalVoidAmount
  s1.getCell('B6').numFmt = MONEY_FMT
  s1.getCell('A7').value = 'Average Void Process Interval'
  s1.getCell('B7').value = r.voidSummary.avgIntervalFormatted
  const h1 = s1.getRow(9)
  h1.values = [
    'Business Date', 'Invoice Number', 'Check #', 'POS Terminal', 'Start Time', 'Void Time',
    'Void Interval', 'Interval (Seconds)', 'Void Amount (PHP)', 'Log Entries',
  ]
  styleHeader(h1)
  let row = 10
  for (const i of r.voidItems) {
    s1.getRow(row).values = [
      i.businessDate, i.fcrInvNum, i.checkNum, i.posName, i.startTime, i.voidTime,
      i.intervalFormatted, i.intervalSeconds, i.voidAmount, i.transactionCount,
    ]
    s1.getCell(row, 9).numFmt = MONEY_FMT
    row += 1
  }

  // Sheet 2: Audit Log Details
  const s2 = book.addWorksheet('Audit Log Details')
  s2.columns = [22, 14, 16, 22, 18].map((width) => ({ width }))
  const h2 = s2.getRow(1)
  h2.values = ['Invoice Number', 'Check #', 'POS Terminal', 'Transaction Datetime', 'Gross Sale (PHP)']
  styleHeader(h2)
  let row2 = 2
  for (const i of r.voidItems) {
    for (const rec of i.records) {
      s2.getRow(row2).values = [
        i.fcrInvNum, rec.checknum || i.checkNum, rec.posname || i.posName, rec.transdatetime, rec.grossSale,
      ]
      s2.getCell(row2, 5).numFmt = MONEY_FMT
      row2 += 1
    }
  }

  // Sheet 3: Cancelled Items
  const s3 = book.addWorksheet('Cancelled Items')
  s3.columns = [14, 20, 22, 14, 16, 32, 16, 22].map((width) => ({ width }))
  const h3 = s3.getRow(1)
  h3.values = [
    'Business Date', 'Transaction Time', 'Invoice Number', 'Check #', 'Item Number', 'Item Name',
    'Cancelled Qty', 'Cancelled Amount (PHP)',
  ]
  styleHeader(h3)
  let row3 = 2
  for (const c of r.cancelItems) {
    s3.getRow(row3).values = [
      c.businessDate, c.transDatetime, c.fcrInvNum, c.checkNum, c.itemNumber, c.itemName,
      c.lineCount, c.lineTotal,
    ]
    s3.getCell(row3, 8).numFmt = MONEY_FMT
    row3 += 1
  }
  s3.getCell(row3, 6).value = 'TOTAL'
  s3.getCell(row3, 7).value = r.cancelSummary.totalCancelledQty
  s3.getCell(row3, 8).value = r.cancelSummary.totalCancelledAmount
  s3.getCell(row3, 8).numFmt = MONEY_FMT
  s3.getRow(row3).font = { bold: true, color: { argb: RED } }

  await book.xlsx.writeFile(save.filePath)
  return {
    success: true,
    canceled: false,
    message: 'Void Summary Excel exported successfully.',
    filePath: save.filePath,
  }
}

function buildPdfHtml(input: VoidSummaryExportInput) {
  const r = input.report
  const voidRows = r.voidItems.length
    ? r.voidItems
        .map(
          (i) => `<tr><td>${esc(i.businessDate)}</td><td><b>${esc(i.fcrInvNum)}</b></td><td>${esc(i.checkNum)}</td>
          <td>${esc(i.posName)}</td><td>${esc(i.startTime)}</td><td>${esc(i.voidTime)}</td>
          <td class="c">${esc(i.intervalFormatted)}</td><td class="n red">${money(i.voidAmount)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="8" class="empty">No void transactions found.</td></tr>'

  const cancelRows = r.cancelItems.length
    ? r.cancelItems
        .map(
          (c) => `<tr><td>${esc(c.businessDate)}</td><td>${esc(c.transDatetime)}</td><td><b>${esc(c.fcrInvNum)}</b></td>
          <td>${esc(c.checkNum)}</td><td>${esc(c.itemNumber)}</td><td>${esc(c.itemName)}</td>
          <td class="c red">-${int(c.lineCount)}</td><td class="n red">-${money(c.lineTotal)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="8" class="empty">No cancelled items found.</td></tr>'

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin:0; color:#1f2937; font-family: Arial, Helvetica, sans-serif; font-size:10px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .title { color:#f36c21; font-size:22px; font-weight:800; }
  .period { margin-top:4px; color:#667085; }
  .kpis { display:grid; grid-template-columns:repeat(3,1fr); margin-top:12px; border:1px solid #e4e7ec; border-radius:7px; overflow:hidden; }
  .kpi { padding:10px; border-right:1px solid #e4e7ec; } .kpi:last-child { border-right:0; }
  .kpi-label { color:#667085; font-size:9px; text-transform:uppercase; }
  .kpi-value { margin-top:5px; font-size:17px; font-weight:800; }
  h3 { margin:16px 0 6px; font-size:12px; }
  table { width:100%; border-collapse:collapse; }
  th { background:#374151; color:#fff; text-align:left; padding:6px 8px; font-size:9px; text-transform:uppercase; }
  td { padding:5px 8px; border-bottom:1px solid #eef0f2; }
  tbody tr:nth-child(even) td { background:#fafbfc; }
  .n { text-align:right; font-variant-numeric:tabular-nums; } .c { text-align:center; } .red { color:#b91c1c; font-weight:700; }
  tfoot td { background:#f3f4f6; font-weight:800; border-top:1px solid #dfe3e8; }
  .empty { text-align:center; color:#667085; padding:14px; }
  .footer { margin-top:8px; color:#98a2b3; font-size:8px; text-align:right; }
  </style></head><body>
  <div class="title">VOID SUMMARY REPORT</div>
  <div class="period">Report Period: ${esc(period(input))} &nbsp;|&nbsp; Generated: ${esc(new Date().toLocaleString('en-PH'))}</div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Total Void Count</div><div class="kpi-value">${int(r.voidSummary.totalVoidCount)} Invoices</div></div>
    <div class="kpi"><div class="kpi-label">Total Void Amount</div><div class="kpi-value">PHP ${money(r.voidSummary.totalVoidAmount)}</div></div>
    <div class="kpi"><div class="kpi-label">Avg Void Process Interval</div><div class="kpi-value">${esc(r.voidSummary.avgIntervalFormatted || '0s')}</div></div>
  </div>
  <h3>1. Void Transactions (${r.voidItems.length} Invoices)</h3>
  <table><thead><tr><th>Business Date</th><th>Invoice Number</th><th>Check #</th><th>POS Terminal</th><th>Start Time</th><th>Void Time</th><th class="c">Void Interval</th><th class="n">Void Amount</th></tr></thead>
  <tbody>${voidRows}</tbody>
  <tfoot><tr><td>TOTAL</td><td>${r.voidItems.length} Invoices</td><td></td><td></td><td></td><td></td><td class="c">Avg: ${esc(r.voidSummary.avgIntervalFormatted || '0s')}</td><td class="n">PHP ${money(r.voidSummary.totalVoidAmount)}</td></tr></tfoot></table>
  <h3>2. Cancelled Items (${r.cancelItems.length} Line Items)</h3>
  <table><thead><tr><th>Business Date</th><th>Time</th><th>Invoice Number</th><th>Check #</th><th>Item Code</th><th>Item Description</th><th class="c">Qty</th><th class="n">Cancel Amount</th></tr></thead>
  <tbody>${cancelRows}</tbody>
  <tfoot><tr><td>TOTAL</td><td></td><td></td><td></td><td></td><td>${r.cancelItems.length} line items</td><td class="c red">-${int(r.cancelSummary.totalCancelledQty)}</td><td class="n red">-PHP ${money(r.cancelSummary.totalCancelledAmount)}</td></tr></tfoot></table>
  <div class="footer">Generated by Oracle Reporting Tool Desktop</div>
  </body></html>`
}

export async function exportVoidSummaryPdf(
  input: VoidSummaryExportInput,
  parent?: BrowserWindow,
): Promise<VoidSummaryExportResult> {
  const save = await showSaveDialog(parent, {
    title: 'Export Void Summary PDF',
    defaultPath: `${baseName(input)}.pdf`,
    filters: [{ name: 'PDF files', extensions: ['pdf'] }],
  })
  if (save.canceled || !save.filePath) {
    return { success: false, canceled: true, message: 'PDF export canceled.' }
  }

  const printWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })

  try {
    await printWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(buildPdfHtml(input))}`,
    )
    const pdf = await printWindow.webContents.printToPDF({
      printBackground: true,
      landscape: true,
      pageSize: 'A4',
      margins: { top: 0.35, bottom: 0.35, left: 0.35, right: 0.35 },
    })
    await fs.writeFile(save.filePath, pdf)
    return {
      success: true,
      canceled: false,
      message: 'Void Summary PDF exported successfully.',
      filePath: save.filePath,
    }
  } finally {
    if (!printWindow.isDestroyed()) printWindow.destroy()
  }
}
