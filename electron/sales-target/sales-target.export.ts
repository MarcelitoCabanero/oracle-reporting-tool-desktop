import { BrowserWindow, dialog } from 'electron'
import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'
import type {
  SalesTargetAnalyticsSummaryRow,
  SalesTargetCategoryRow,
  SalesTargetWeekdayWeekendRow,
  SalesTargetWorksheet,
} from './sales-target.repository.js'

export interface SalesTargetExportResult {
  success: boolean
  canceled: boolean
  message: string
  filePath?: string
}

export interface SalesTargetAnalyticsExportInput {
  targetYear: number
  targetQuarter: number
  locationName: string
  orgLocationRef?: string
  monthLabel?: string
  salesMetric: 'net' | 'gross'
  summary: SalesTargetAnalyticsSummaryRow[]
  weekdayWeekend: SalesTargetWeekdayWeekendRow[]
  categories: SalesTargetCategoryRow[]
}

const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(amount || 0),
  )

const qty = (amount: number, decimals = 0) =>
  new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(Number(amount || 0))

const pct = (decimalVal: number, decimals = 1) =>
  `${(Number(decimalVal || 0) * 100).toFixed(decimals)}%`

const save = (
  parent: BrowserWindow | undefined,
  title: string,
  defaultPath: string,
  extension: 'xlsx' | 'pdf',
) => {
  const options = {
    title,
    defaultPath,
    filters: [
      {
        name: extension === 'xlsx' ? 'Excel Workbook' : 'PDF files',
        extensions: [extension],
      },
    ],
  }
  return parent ? dialog.showSaveDialog(parent, options) : dialog.showSaveDialog(options)
}

const result = (
  success: boolean,
  canceled: boolean,
  message: string,
  filePath?: string,
): SalesTargetExportResult => ({ success, canceled, message, filePath })

async function renderHtmlToPdf(html: string, filePath: string): Promise<void> {
  const window = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })
  try {
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    const pdfBytes = await window.webContents.printToPDF({
      printBackground: true,
      landscape: true,
      pageSize: 'A4',
    })
    await fs.writeFile(filePath, pdfBytes)
  } finally {
    if (!window.isDestroyed()) window.destroy()
  }
}

export async function exportSalesTargetWorksheetExcel(
  worksheet: SalesTargetWorksheet,
  parent?: BrowserWindow,
): Promise<SalesTargetExportResult> {
  const safeLoc = worksheet.locationName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const target = await save(
    parent,
    'Export Sales Target Worksheet Excel',
    `Sales_Target_${safeLoc}_${worksheet.targetYear}_Q${worksheet.targetQuarter}.xlsx`,
    'xlsx',
  )
  if (target.canceled || !target.filePath) return result(false, true, 'Excel export canceled.')

  const book = new ExcelJS.Workbook()
  const sheetName = `${worksheet.orgLocationRef || worksheet.locationName}_Q${worksheet.targetQuarter}`.slice(0, 31)
  const sheet = book.addWorksheet(sheetName)
  sheet.columns = [
    { width: 40 },
    { width: 15 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 28 },
  ]

  const [m0, m1, m2] = worksheet.months
  const qtrTargetSales = worksheet.months.reduce((s, m) => s + m.targetNetSales, 0)
  const qtrLastYearSales = worksheet.months.reduce((s, m) => s + m.lastYearNetSales, 0)
  const qtrTotalDays = worksheet.months.reduce((s, m) => s + m.totalOperatingDays, 0)
  const qtrWdDays = worksheet.months.reduce((s, m) => s + m.weekdayDays, 0)
  const qtrWeDays = worksheet.months.reduce((s, m) => s + m.weekendHdDays, 0)
  const qtrAds = qtrTotalDays > 0 ? qtrTargetSales / qtrTotalDays : 0
  const qtrCustomers = worksheet.months.reduce((s, m) => s + m.monthlyCustomerCount, 0)

  sheet.mergeCells('A1:I1')
  sheet.getCell('A1').value = `J.CO DONUTS & COFFEE — QUARTERLY SALES TARGET & CATEGORY WORKSHEET (Q${worksheet.targetQuarter} ${worksheet.targetYear})`
  sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFF36C21' } }

  sheet.mergeCells('A2:I2')
  sheet.getCell('A2').value = `Store: ${worksheet.locationName} (${worksheet.orgLocationRef}) | Status: ${worksheet.status} | Basis: ${worksheet.suggestionBasis} | Default Avg Check: ₱${money(worksheet.avgPerCheckDefault)}`

  sheet.getRow(4).values = [
    'PARTICULARS',
    'PRICE / UOM',
    m0 ? `${m0.monthName.toUpperCase()} (WD)` : 'M1 WD',
    m0 ? `${m0.monthName.toUpperCase()} (WE/HD)` : 'M1 WE/HD',
    m1 ? `${m1.monthName.toUpperCase()} (WD)` : 'M2 WD',
    m1 ? `${m1.monthName.toUpperCase()} (WE/HD)` : 'M2 WE/HD',
    m2 ? `${m2.monthName.toUpperCase()} (WD)` : 'M3 WD',
    m2 ? `${m2.monthName.toUpperCase()} (WE/HD)` : 'M3 WE/HD',
    `Q${worksheet.targetQuarter} ${worksheet.targetYear} TOTAL / AVG`,
  ]
  sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }

  let rowIdx = 5
  const addRow = (values: Array<string | number>, numCols: number[] = [], bold = false) => {
    const r = sheet.getRow(rowIdx)
    r.values = values
    if (bold) r.font = { bold: true }
    for (const c of numCols) {
      sheet.getCell(rowIdx, c).numFmt = '#,##0.00'
    }
    rowIdx += 1
  }

  addRow(
    [
      'MONTHLY TARGET NET SALES (₱)',
      'PHP',
      m0?.targetNetSales ?? 0,
      m0?.targetNetSales ?? 0,
      m1?.targetNetSales ?? 0,
      m1?.targetNetSales ?? 0,
      m2?.targetNetSales ?? 0,
      m2?.targetNetSales ?? 0,
      qtrTargetSales,
    ],
    [3, 4, 5, 6, 7, 8, 9],
    true,
  )
  addRow(
    [
      'Historical Reference (LY Sales | Basis ADS)',
      'Ref (₱)',
      m0?.lastYearNetSales ?? 0,
      m0?.basisMonthAds ?? 0,
      m1?.lastYearNetSales ?? 0,
      m1?.basisMonthAds ?? 0,
      m2?.lastYearNetSales ?? 0,
      m2?.basisMonthAds ?? 0,
      qtrLastYearSales,
    ],
    [3, 4, 5, 6, 7, 8, 9],
  )
  addRow(
    [
      'MONTHLY ADS (Target ÷ Total Days)',
      'PHP / Day',
      m0?.monthlyAds ?? 0,
      `${m0?.totalOperatingDays ?? 0} days`,
      m1?.monthlyAds ?? 0,
      `${m1?.totalOperatingDays ?? 0} days`,
      m2?.monthlyAds ?? 0,
      `${m2?.totalOperatingDays ?? 0} days`,
      qtrAds,
    ],
    [3, 5, 7, 9],
    true,
  )
  addRow(
    [
      'NUMBER OF OPERATING DAYS (WD vs. WE/HD)',
      'Days',
      m0?.weekdayDays ?? 0,
      m0?.weekendHdDays ?? 0,
      m1?.weekdayDays ?? 0,
      m1?.weekendHdDays ?? 0,
      m2?.weekdayDays ?? 0,
      m2?.weekendHdDays ?? 0,
      `${qtrWdDays} WD / ${qtrWeDays} WE (${qtrTotalDays}d)`,
    ],
    [],
    true,
  )
  addRow([
    '% SHARE OF MONTHLY SALES',
    '% Split',
    pct(m0?.weekdaySalesPct ?? 0.5, 2),
    pct(m0?.weekendHdSalesPct ?? 0.5, 2),
    pct(m1?.weekdaySalesPct ?? 0.5, 2),
    pct(m1?.weekendHdSalesPct ?? 0.5, 2),
    pct(m2?.weekdaySalesPct ?? 0.5, 2),
    pct(m2?.weekendHdSalesPct ?? 0.5, 2),
    '100.00%',
  ])
  addRow(
    [
      'DAILY TARGET SALES (₱ / Day)',
      'PHP / Day',
      m0?.dailyTargetSalesWeekday ?? 0,
      m0?.dailyTargetSalesWeekendHd ?? 0,
      m1?.dailyTargetSalesWeekday ?? 0,
      m1?.dailyTargetSalesWeekendHd ?? 0,
      m2?.dailyTargetSalesWeekday ?? 0,
      m2?.dailyTargetSalesWeekendHd ?? 0,
      qtrAds,
    ],
    [3, 4, 5, 6, 7, 8, 9],
    true,
  )
  addRow(
    [
      'AVERAGE PER CHECK',
      'PHP / Check',
      m0?.avgPerCheckWeekday ?? 470,
      m0?.avgPerCheckWeekendHd ?? 470,
      m1?.avgPerCheckWeekday ?? 470,
      m1?.avgPerCheckWeekendHd ?? 470,
      m2?.avgPerCheckWeekday ?? 470,
      m2?.avgPerCheckWeekendHd ?? 470,
      worksheet.avgPerCheckDefault,
    ],
    [3, 4, 5, 6, 7, 8, 9],
  )
  addRow(
    [
      'DAILY CUSTOMER COUNT (Checks / Day)',
      'Checks',
      m0?.dailyCustomerCountWeekday ?? 0,
      m0?.dailyCustomerCountWeekendHd ?? 0,
      m1?.dailyCustomerCountWeekday ?? 0,
      m1?.dailyCustomerCountWeekendHd ?? 0,
      m2?.dailyCustomerCountWeekday ?? 0,
      m2?.dailyCustomerCountWeekendHd ?? 0,
      Math.round(qtrCustomers),
    ],
    [3, 4, 5, 6, 7, 8],
    true,
  )

  const cats = m0?.categories ?? []
  addRow(['--- PER CATEGORY % MIX ---', 'Unit Price (₱)', '', '', '', '', '', '', ''], [], true)
  for (let i = 0; i < cats.length; i += 1) {
    const c0 = m0?.categories[i]
    const c1 = m1?.categories[i]
    const c2 = m2?.categories[i]
    if (!c0) continue
    addRow(
      [
        `${c0.categoryName} (${c0.qtyUom})`,
        c0.unitPriceDivisor,
        pct(c0.weekdayMixPct, 2),
        pct(c0.weekendHdMixPct, 2),
        pct(c1?.weekdayMixPct ?? 0, 2),
        pct(c1?.weekendHdMixPct ?? 0, 2),
        pct(c2?.weekdayMixPct ?? 0, 2),
        pct(c2?.weekendHdMixPct ?? 0, 2),
        pct(c0.weekdayMixPct, 2),
      ],
      [2],
    )
  }

  addRow(['--- DAILY TARGET SALES PER CATEGORY (₱) ---', 'Unit Price (₱)', '', '', '', '', '', '', ''], [], true)
  for (let i = 0; i < cats.length; i += 1) {
    const c0 = m0?.categories[i]
    const c1 = m1?.categories[i]
    const c2 = m2?.categories[i]
    if (!c0) continue
    const qtrSales = (c0.monthlySales ?? 0) + (c1?.monthlySales ?? 0) + (c2?.monthlySales ?? 0)
    addRow(
      [
        c0.categoryName,
        c0.unitPriceDivisor,
        c0.dailySalesWeekday,
        c0.dailySalesWeekendHd,
        c1?.dailySalesWeekday ?? 0,
        c1?.dailySalesWeekendHd ?? 0,
        c2?.dailySalesWeekday ?? 0,
        c2?.dailySalesWeekendHd ?? 0,
        qtrSales,
      ],
      [2, 3, 4, 5, 6, 7, 8, 9],
    )
  }

  addRow(['--- DAILY TARGET QUANTITY PER CATEGORY ---', 'UOM / Day', '', '', '', '', '', '', ''], [], true)
  for (let i = 0; i < cats.length; i += 1) {
    const c0 = m0?.categories[i]
    const c1 = m1?.categories[i]
    const c2 = m2?.categories[i]
    if (!c0) continue
    const qtrQty = (c0.monthlyQty ?? 0) + (c1?.monthlyQty ?? 0) + (c2?.monthlyQty ?? 0)
    addRow(
      [
        `${c0.categoryName} (${c0.qtyUom})`,
        `${c0.qtyUom} / Day`,
        c0.dailyQtyWeekday,
        c0.dailyQtyWeekendHd,
        c1?.dailyQtyWeekday ?? 0,
        c1?.dailyQtyWeekendHd ?? 0,
        c2?.dailyQtyWeekday ?? 0,
        c2?.dailyQtyWeekendHd ?? 0,
        Math.round(qtrQty),
      ],
      [3, 4, 5, 6, 7, 8],
    )
  }

  addRow(['--- MONTHLY TOTAL CATEGORY TARGETS (Sales ₱ | Qty) ---', 'Sales / UOM', '', '', '', '', '', '', ''], [], true)
  for (let i = 0; i < cats.length; i += 1) {
    const c0 = m0?.categories[i]
    const c1 = m1?.categories[i]
    const c2 = m2?.categories[i]
    if (!c0) continue
    const qtrSales = (c0.monthlySales ?? 0) + (c1?.monthlySales ?? 0) + (c2?.monthlySales ?? 0)
    const qtrQty = Math.round((c0.monthlyQty ?? 0) + (c1?.monthlyQty ?? 0) + (c2?.monthlyQty ?? 0))
    addRow(
      [
        `${c0.categoryName} (Monthly Total)`,
        `Sales / ${c0.qtyUom}`,
        c0.monthlySales,
        `${qty(c0.monthlyQty, 0)} ${c0.qtyUom}`,
        c1?.monthlySales ?? 0,
        `${qty(c1?.monthlyQty ?? 0, 0)} ${c0.qtyUom}`,
        c2?.monthlySales ?? 0,
        `${qty(c2?.monthlyQty ?? 0, 0)} ${c0.qtyUom}`,
        `₱${money(qtrSales)} (${qty(qtrQty, 0)} ${c0.qtyUom})`,
      ],
      [3, 5, 7],
      true,
    )
  }

  await book.xlsx.writeFile(target.filePath)
  return result(true, false, 'Sales Target Worksheet Excel exported successfully.', target.filePath)
}

export async function exportSalesTargetWorksheetPdf(
  worksheet: SalesTargetWorksheet,
  parent?: BrowserWindow,
): Promise<SalesTargetExportResult> {
  const safeLoc = worksheet.locationName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const target = await save(
    parent,
    'Export Sales Target Worksheet PDF',
    `Sales_Target_${safeLoc}_${worksheet.targetYear}_Q${worksheet.targetQuarter}.pdf`,
    'pdf',
  )
  if (target.canceled || !target.filePath) return result(false, true, 'PDF export canceled.')

  const [m0, m1, m2] = worksheet.months
  const qtrTargetSales = worksheet.months.reduce((s, m) => s + m.targetNetSales, 0)
  const qtrLastYearSales = worksheet.months.reduce((s, m) => s + m.lastYearNetSales, 0)
  const qtrTotalDays = worksheet.months.reduce((s, m) => s + m.totalOperatingDays, 0)
  const qtrAds = qtrTotalDays > 0 ? qtrTargetSales / qtrTotalDays : 0
  const qtrCustomers = worksheet.months.reduce((s, m) => s + m.monthlyCustomerCount, 0)
  const cats = m0?.categories ?? []

  const html = `<!doctype html>
  <style>
    @page { size: A4 landscape; margin: 7mm; }
    body { font: 8.5px Arial, sans-serif; color: #111827; }
    h1 { color: #f36c21; font-size: 14px; margin: 0 0 3px; }
    p { margin: 0 0 8px; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { padding: 3.5px 5px; border: 1px solid #d1d5db; }
    th { background: #1f2937; color: #fff; text-align: center; }
    td.num { text-align: right; }
    td.center { text-align: center; }
    tr.sec td { background: #e5e7eb; font-weight: bold; }
    tr.tot td { background: #fff2e5; font-weight: bold; }
  </style>
  <h1>QUARTERLY SALES TARGET WORKSHEET — Q${worksheet.targetQuarter} ${worksheet.targetYear}</h1>
  <p>Store: <strong>${worksheet.locationName} (${worksheet.orgLocationRef})</strong> | Status: ${worksheet.status} | Qtr Target: <strong>₱${money(qtrTargetSales)}</strong> | Qtr ADS: <strong>₱${money(qtrAds)}</strong> | LY Same Qtr: <strong>₱${money(qtrLastYearSales)}</strong> | Qtr Checks: <strong>${qty(qtrCustomers, 0)}</strong></p>
  <table>
    <tr>
      <th>PARTICULARS</th>
      <th>PRICE / UOM</th>
      <th colspan="2">${m0?.monthName ?? 'Month 1'} (WD | WE/HD)</th>
      <th colspan="2">${m1?.monthName ?? 'Month 2'} (WD | WE/HD)</th>
      <th colspan="2">${m2?.monthName ?? 'Month 3'} (WD | WE/HD)</th>
      <th>Q${worksheet.targetQuarter} SUMMARY</th>
    </tr>
    <tr class="tot">
      <td>MONTHLY TARGET NET SALES (₱)</td>
      <td class="center">PHP</td>
      <td colspan="2" class="num">₱${money(m0?.targetNetSales ?? 0)}</td>
      <td colspan="2" class="num">₱${money(m1?.targetNetSales ?? 0)}</td>
      <td colspan="2" class="num">₱${money(m2?.targetNetSales ?? 0)}</td>
      <td class="num">₱${money(qtrTargetSales)}</td>
    </tr>
    <tr>
      <td>MONTHLY ADS / TOTAL DAYS</td>
      <td class="center">PHP / Day</td>
      <td class="num">₱${money(m0?.monthlyAds ?? 0)}</td>
      <td class="center">${m0?.totalOperatingDays ?? 0}d</td>
      <td class="num">₱${money(m1?.monthlyAds ?? 0)}</td>
      <td class="center">${m1?.totalOperatingDays ?? 0}d</td>
      <td class="num">₱${money(m2?.monthlyAds ?? 0)}</td>
      <td class="center">${m2?.totalOperatingDays ?? 0}d</td>
      <td class="num">₱${money(qtrAds)} (${qtrTotalDays}d)</td>
    </tr>
    <tr>
      <td>OPERATING DAYS (WD / WE)</td>
      <td class="center">Days</td>
      <td class="center">${m0?.weekdayDays ?? 0}</td>
      <td class="center">${m0?.weekendHdDays ?? 0}</td>
      <td class="center">${m1?.weekdayDays ?? 0}</td>
      <td class="center">${m1?.weekendHdDays ?? 0}</td>
      <td class="center">${m2?.weekdayDays ?? 0}</td>
      <td class="center">${m2?.weekendHdDays ?? 0}</td>
      <td class="center">${qtrTotalDays} days</td>
    </tr>
    <tr>
      <td>% SHARE OF MONTHLY SALES</td>
      <td class="center">% Split</td>
      <td class="num">${pct(m0?.weekdaySalesPct ?? 0.5, 1)}</td>
      <td class="num">${pct(m0?.weekendHdSalesPct ?? 0.5, 1)}</td>
      <td class="num">${pct(m1?.weekdaySalesPct ?? 0.5, 1)}</td>
      <td class="num">${pct(m1?.weekendHdSalesPct ?? 0.5, 1)}</td>
      <td class="num">${pct(m2?.weekdaySalesPct ?? 0.5, 1)}</td>
      <td class="num">${pct(m2?.weekendHdSalesPct ?? 0.5, 1)}</td>
      <td class="center">100%</td>
    </tr>
    <tr class="tot">
      <td>DAILY TARGET SALES (₱)</td>
      <td class="center">PHP / Day</td>
      <td class="num">₱${money(m0?.dailyTargetSalesWeekday ?? 0)}</td>
      <td class="num">₱${money(m0?.dailyTargetSalesWeekendHd ?? 0)}</td>
      <td class="num">₱${money(m1?.dailyTargetSalesWeekday ?? 0)}</td>
      <td class="num">₱${money(m1?.dailyTargetSalesWeekendHd ?? 0)}</td>
      <td class="num">₱${money(m2?.dailyTargetSalesWeekday ?? 0)}</td>
      <td class="num">₱${money(m2?.dailyTargetSalesWeekendHd ?? 0)}</td>
      <td class="num">₱${money(qtrAds)}</td>
    </tr>
    <tr>
      <td>DAILY CUSTOMER COUNT (@ ₱${money(worksheet.avgPerCheckDefault)})</td>
      <td class="center">Checks/Day</td>
      <td class="num">${qty(m0?.dailyCustomerCountWeekday ?? 0, 1)}</td>
      <td class="num">${qty(m0?.dailyCustomerCountWeekendHd ?? 0, 1)}</td>
      <td class="num">${qty(m1?.dailyCustomerCountWeekday ?? 0, 1)}</td>
      <td class="num">${qty(m1?.dailyCustomerCountWeekendHd ?? 0, 1)}</td>
      <td class="num">${qty(m2?.dailyCustomerCountWeekday ?? 0, 1)}</td>
      <td class="num">${qty(m2?.dailyCustomerCountWeekendHd ?? 0, 1)}</td>
      <td class="num">${qty(qtrCustomers, 0)} checks</td>
    </tr>
    <tr class="sec"><td colspan="9">DAILY TARGET QUANTITY PER CATEGORY (PCS / BOXES)</td></tr>
    ${cats
      .map((c0, i) => {
        const c1 = m1?.categories[i]
        const c2 = m2?.categories[i]
        const qtrQty = (c0.monthlyQty ?? 0) + (c1?.monthlyQty ?? 0) + (c2?.monthlyQty ?? 0)
        return `<tr>
          <td>${c0.categoryName} (${c0.qtyUom})</td>
          <td class="center">₱${money(c0.unitPriceDivisor)}</td>
          <td class="num">${qty(c0.dailyQtyWeekday, 1)}</td>
          <td class="num">${qty(c0.dailyQtyWeekendHd, 1)}</td>
          <td class="num">${qty(c1?.dailyQtyWeekday ?? 0, 1)}</td>
          <td class="num">${qty(c1?.dailyQtyWeekendHd ?? 0, 1)}</td>
          <td class="num">${qty(c2?.dailyQtyWeekday ?? 0, 1)}</td>
          <td class="num">${qty(c2?.dailyQtyWeekendHd ?? 0, 1)}</td>
          <td class="num">${qty(qtrQty, 0)} ${c0.qtyUom}</td>
        </tr>`
      })
      .join('')}
    <tr class="sec"><td colspan="9">MONTHLY TOTAL CATEGORY TARGETS (SALES ₱ &amp; QTY)</td></tr>
    ${cats
      .map((c0, i) => {
        const c1 = m1?.categories[i]
        const c2 = m2?.categories[i]
        const qtrSales = (c0.monthlySales ?? 0) + (c1?.monthlySales ?? 0) + (c2?.monthlySales ?? 0)
        const qtrQty = (c0.monthlyQty ?? 0) + (c1?.monthlyQty ?? 0) + (c2?.monthlyQty ?? 0)
        return `<tr>
          <td>${c0.categoryName}</td>
          <td class="center">Sales / ${c0.qtyUom}</td>
          <td class="num">₱${money(c0.monthlySales)}</td>
          <td class="num">${qty(c0.monthlyQty, 0)} ${c0.qtyUom}</td>
          <td class="num">₱${money(c1?.monthlySales ?? 0)}</td>
          <td class="num">${qty(c1?.monthlyQty ?? 0, 0)} ${c0.qtyUom}</td>
          <td class="num">₱${money(c2?.monthlySales ?? 0)}</td>
          <td class="num">${qty(c2?.monthlyQty ?? 0, 0)} ${c0.qtyUom}</td>
          <td class="num">₱${money(qtrSales)} (${qty(qtrQty, 0)} ${c0.qtyUom})</td>
        </tr>`
      })
      .join('')}
  </table>`

  await renderHtmlToPdf(html, target.filePath)
  return result(true, false, 'Sales Target Worksheet PDF exported successfully.', target.filePath)
}

export async function exportSalesTargetAnalyticsExcel(
  input: SalesTargetAnalyticsExportInput,
  parent?: BrowserWindow,
): Promise<SalesTargetExportResult> {
  const safeLoc = (input.locationName || 'Store').replace(/[^a-zA-Z0-9_-]/g, '_')
  const target = await save(
    parent,
    'Export Sales Target Analytics Excel',
    `Sales_Target_Analytics_${safeLoc}_${input.targetYear}_Q${input.targetQuarter}.xlsx`,
    'xlsx',
  )
  if (target.canceled || !target.filePath) return result(false, true, 'Excel export canceled.')

  const book = new ExcelJS.Workbook()
  const metricLabel = input.salesMetric === 'gross' ? 'Gross Sales' : 'Net Sales'
  const periodLabel = input.monthLabel
    ? `${input.monthLabel} (Q${input.targetQuarter} ${input.targetYear})`
    : `All 3 Months — Q${input.targetQuarter} ${input.targetYear}`

  // Sheet 1: Summary & YoY
  const s1 = book.addWorksheet('Summary & YoY')
  s1.columns = [22, 10, 14, 15, 18, 18, 18, 16, 14, 16, 16, 18, 18, 14, 16, 20].map((width) => ({ width }))
  s1.mergeCells('A1:P1')
  s1.getCell('A1').value = `QUARTERLY SALES TARGET VS. ACTUAL ANALYTICS (${periodLabel})`
  s1.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFF36C21' } }
  s1.mergeCells('A2:P2')
  s1.getCell('A2').value = `Store: ${input.locationName} | Period: ${periodLabel} | Basis: ${metricLabel}`

  s1.getRow(4).values = [
    'Store Location',
    'Code',
    'Month',
    'Days (Act / Tgt)',
    'Target Net Sales (₱)',
    'Actual Net Sales (₱)',
    'Actual Gross Sales (₱)',
    'Variance (₱)',
    'Achievement %',
    'Target ADS (₱)',
    'Actual ADS (₱)',
    'Req. Daily Run Rate (₱)',
    'Last Year Net Sales (₱)',
    'YoY Growth %',
    'Actual Avg Check (₱)',
    'Customer Checks (Act / Tgt)',
  ]
  s1.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  s1.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }

  let r1 = 5
  for (const r of input.summary) {
    const primaryAct = input.salesMetric === 'gross' ? r.ActualGrossSales : r.ActualNetSales
    const variance = primaryAct - r.TargetNetSales
    const achvPct = r.TargetNetSales > 0 ? (primaryAct / r.TargetNetSales) * 100 : 0
    s1.getRow(r1).values = [
      r.LocationName,
      r.OrgLocationRef,
      r.MonthName,
      `${r.ActualOperatingDays} / ${r.TotalOperatingDays}`,
      r.TargetNetSales,
      r.ActualNetSales,
      r.ActualGrossSales,
      variance,
      `${achvPct.toFixed(1)}%`,
      r.TargetADS,
      r.ActualADS,
      r.RequiredDailyRunRate,
      r.LastYearNetSales,
      `${r.YoYGrowthPct.toFixed(1)}%`,
      r.ActualAvgCheck,
      `${qty(r.ActualCustomerCount, 0)} / ${qty(r.TargetCustomerCount, 0)}`,
    ]
    ;[5, 6, 7, 8, 10, 11, 12, 13, 15].forEach((c) => {
      s1.getCell(r1, c).numFmt = '#,##0.00'
    })
    r1 += 1
  }

  // Sheet 2: Category Sales & Qty
  const s2 = book.addWorksheet('Category Sales & Qty')
  s2.columns = [22, 13, 18, 10, 15, 18, 18, 18, 14, 14, 14, 14, 14].map((width) => ({ width }))
  s2.mergeCells('A1:M1')
  s2.getCell('A1').value = `CATEGORY TARGET VS. ACTUAL PERFORMANCE (SALES ₱ & QTY)`
  s2.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFF36C21' } }
  s2.getRow(3).values = [
    'Store Location',
    'Month',
    'Category',
    'UOM',
    'Price Divisor (₱)',
    'Target Sales (₱)',
    'Actual Net Sales (₱)',
    'Sales Variance (₱)',
    'Sales Achv %',
    'Target Qty',
    'Actual Qty',
    'Qty Variance',
    'Qty Achv %',
  ]
  s2.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  s2.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }

  let r2 = 4
  for (const c of input.categories) {
    const primaryAct =
      input.salesMetric === 'gross' ? c.ActualCategoryGrossSales : c.ActualCategoryNetSales
    const salesVar = primaryAct - c.TargetCategorySales
    const salesAchv = c.TargetCategorySales > 0 ? (primaryAct / c.TargetCategorySales) * 100 : 0
    s2.getRow(r2).values = [
      c.LocationName,
      c.MonthName,
      c.CategoryName,
      c.QtyUOM,
      c.UnitPriceDivisor,
      c.TargetCategorySales,
      primaryAct,
      salesVar,
      `${salesAchv.toFixed(1)}%`,
      Math.round(c.TargetCategoryQty),
      Math.round(c.ActualCategoryQty),
      Math.round(c.VarianceCategoryQty),
      `${c.CategoryQtyAchievementPct.toFixed(1)}%`,
    ]
    ;[5, 6, 7, 8].forEach((col) => {
      s2.getCell(r2, col).numFmt = '#,##0.00'
    })
    r2 += 1
  }

  // Sheet 3: Weekday vs Weekend-HD
  const s3 = book.addWorksheet('Weekday vs Weekend-HD')
  s3.columns = [22, 14, 16, 18, 20, 20, 20, 20, 20, 20].map((width) => ({ width }))
  s3.mergeCells('A1:J1')
  s3.getCell('A1').value = `WEEKDAY VS. WEEKEND / HOLIDAY TARGET & ACTUAL BREAKDOWN`
  s3.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFF36C21' } }
  s3.getRow(3).values = [
    'Store Location',
    'Month',
    'WD Days (Act/Tgt)',
    'WE/HD Days (Act/Tgt)',
    'Target Daily (WD)',
    'Actual Daily (WD)',
    'Target Daily (WE/HD)',
    'Actual Daily (WE/HD)',
    'Planned Split (WD/WE)',
    'Actual Split (WD/WE)',
  ]
  s3.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  s3.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }

  let r3 = 4
  for (const w of input.weekdayWeekend) {
    s3.getRow(r3).values = [
      w.LocationName,
      w.MonthName,
      `${w.ActualWeekdayDays} / ${w.TargetWeekdayDays}`,
      `${w.ActualWeekendHdDays} / ${w.TargetWeekendHdDays}`,
      w.TargetDailySalesWeekday,
      w.ActualDailySalesWeekday,
      w.TargetDailySalesWeekendHd,
      w.ActualDailySalesWeekendHd,
      `${pct(w.TargetWeekdaySalesPct, 1)} / ${pct(w.TargetWeekendHdSalesPct, 1)}`,
      `${pct(w.ActualWeekdaySalesPct, 1)} / ${pct(w.ActualWeekendHdSalesPct, 1)}`,
    ]
    ;[5, 6, 7, 8].forEach((col) => {
      s3.getCell(r3, col).numFmt = '#,##0.00'
    })
    r3 += 1
  }

  await book.xlsx.writeFile(target.filePath)
  return result(true, false, 'Sales Target Analytics Excel exported successfully.', target.filePath)
}

export async function exportSalesTargetAnalyticsPdf(
  input: SalesTargetAnalyticsExportInput,
  parent?: BrowserWindow,
): Promise<SalesTargetExportResult> {
  const safeLoc = (input.locationName || 'Store').replace(/[^a-zA-Z0-9_-]/g, '_')
  const target = await save(
    parent,
    'Export Sales Target Analytics PDF',
    `Sales_Target_Analytics_${safeLoc}_${input.targetYear}_Q${input.targetQuarter}.pdf`,
    'pdf',
  )
  if (target.canceled || !target.filePath) return result(false, true, 'PDF export canceled.')

  const metricLabel = input.salesMetric === 'gross' ? 'Gross Sales' : 'Net Sales'
  const periodLabel = input.monthLabel
    ? `${input.monthLabel} (Q${input.targetQuarter} ${input.targetYear})`
    : `All 3 Months — Q${input.targetQuarter} ${input.targetYear}`

  // Roll up category breakdown across selected months
  const catRollup = new Map<
    string,
    {
      name: string
      uom: string
      sortOrder: number
      price: number
      tgtSales: number
      actSales: number
      tgtQty: number
      actQty: number
    }
  >()
  for (const c of input.categories) {
    const actVal =
      input.salesMetric === 'gross' ? c.ActualCategoryGrossSales : c.ActualCategoryNetSales
    const existing = catRollup.get(c.CategoryCode)
    if (!existing) {
      catRollup.set(c.CategoryCode, {
        name: c.CategoryName,
        uom: c.QtyUOM,
        sortOrder: c.CategorySortOrder,
        price: c.UnitPriceDivisor,
        tgtSales: c.TargetCategorySales,
        actSales: actVal,
        tgtQty: c.TargetCategoryQty,
        actQty: c.ActualCategoryQty,
      })
    } else {
      existing.tgtSales += c.TargetCategorySales
      existing.actSales += actVal
      existing.tgtQty += c.TargetCategoryQty
      existing.actQty += c.ActualCategoryQty
    }
  }
  const sortedCats = Array.from(catRollup.values()).sort((a, b) => a.sortOrder - b.sortOrder)

  const html = `<!doctype html>
  <style>
    @page { size: A4 landscape; margin: 7mm; }
    body { font: 8.5px Arial, sans-serif; color: #111827; }
    h1 { color: #f36c21; font-size: 14px; margin: 0 0 3px; }
    h2 { font-size: 10px; margin: 8px 0 4px; color: #1f2937; }
    p { margin: 0 0 6px; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    th, td { padding: 3.5px 5px; border: 1px solid #d1d5db; }
    th { background: #1f2937; color: #fff; text-align: center; }
    td.num { text-align: right; }
    td.center { text-align: center; }
  </style>
  <h1>QUARTERLY SALES TARGET VS. ACTUAL ANALYTICS (${periodLabel})</h1>
  <p>Store: <strong>${input.locationName}</strong> | Period: <strong>${periodLabel}</strong> | Metric Basis: <strong>${metricLabel}</strong></p>

  <h2>1. Store &amp; Monthly Target vs. Actual Summary</h2>
  <table>
    <tr>
      <th>Month</th>
      <th>Days (Act/Tgt)</th>
      <th>Target Sales (₱)</th>
      <th>Actual Net (₱)</th>
      <th>Actual Gross (₱)</th>
      <th>Variance (₱)</th>
      <th>Achv %</th>
      <th>Target ADS</th>
      <th>Actual ADS</th>
      <th>Req. Run Rate</th>
      <th>Last Year Net</th>
      <th>YoY %</th>
      <th>Actual Avg Check</th>
    </tr>
    ${input.summary
      .map((r) => {
        const primaryAct = input.salesMetric === 'gross' ? r.ActualGrossSales : r.ActualNetSales
        const variance = primaryAct - r.TargetNetSales
        const achv = r.TargetNetSales > 0 ? (primaryAct / r.TargetNetSales) * 100 : 0
        return `<tr>
          <td><strong>${r.MonthName}</strong></td>
          <td class="center">${r.ActualOperatingDays} / ${r.TotalOperatingDays}</td>
          <td class="num">₱${money(r.TargetNetSales)}</td>
          <td class="num">₱${money(r.ActualNetSales)}</td>
          <td class="num">₱${money(r.ActualGrossSales)}</td>
          <td class="num">${variance >= 0 ? '+' : ''}₱${money(variance)}</td>
          <td class="center"><strong>${achv.toFixed(1)}%</strong></td>
          <td class="num">₱${money(r.TargetADS)}</td>
          <td class="num">₱${money(r.ActualADS)}</td>
          <td class="num">₱${money(r.RequiredDailyRunRate)}</td>
          <td class="num">₱${money(r.LastYearNetSales)}</td>
          <td class="center">${r.LastYearNetSales > 0 ? `${r.YoYGrowthPct.toFixed(1)}%` : '—'}</td>
          <td class="num">₱${money(r.ActualAvgCheck)}</td>
        </tr>`
      })
      .join('')}
  </table>

  <h2>2. Consolidated Category Performance (Sales ₱ &amp; Quantity PCS/BOXES)</h2>
  <table>
    <tr>
      <th>Category</th>
      <th>UOM</th>
      <th>Price Divisor</th>
      <th>Target Sales (₱)</th>
      <th>Actual ${metricLabel} (₱)</th>
      <th>Sales Variance (₱)</th>
      <th>Sales Achv %</th>
      <th>Target Qty</th>
      <th>Actual Qty</th>
      <th>Qty Variance</th>
      <th>Qty Achv %</th>
    </tr>
    ${sortedCats
      .map((c) => {
        const sVar = c.actSales - c.tgtSales
        const sAchv = c.tgtSales > 0 ? (c.actSales / c.tgtSales) * 100 : 0
        const qVar = c.actQty - c.tgtQty
        const qAchv = c.tgtQty > 0 ? (c.actQty / c.tgtQty) * 100 : 0
        return `<tr>
          <td><strong>${c.name}</strong></td>
          <td class="center">${c.uom}</td>
          <td class="num">₱${money(c.price)}</td>
          <td class="num">₱${money(c.tgtSales)}</td>
          <td class="num">₱${money(c.actSales)}</td>
          <td class="num">${sVar >= 0 ? '+' : ''}₱${money(sVar)}</td>
          <td class="center"><strong>${sAchv.toFixed(1)}%</strong></td>
          <td class="num">${qty(c.tgtQty, 0)}</td>
          <td class="num">${qty(c.actQty, 0)}</td>
          <td class="num">${qVar >= 0 ? '+' : ''}${qty(qVar, 0)}</td>
          <td class="center"><strong>${qAchv.toFixed(1)}%</strong></td>
        </tr>`
      })
      .join('')}
  </table>

  <h2>3. Weekday vs. Weekend / Holiday Breakdown</h2>
  <table>
    <tr>
      <th>Month</th>
      <th>WD Days (Act/Tgt)</th>
      <th>WE/HD Days (Act/Tgt)</th>
      <th>Target Daily (WD)</th>
      <th>Actual Daily (WD)</th>
      <th>Target Daily (WE/HD)</th>
      <th>Actual Daily (WE/HD)</th>
      <th>Planned Split (WD/WE)</th>
      <th>Actual Split (WD/WE)</th>
    </tr>
    ${input.weekdayWeekend
      .map(
        (w) => `<tr>
          <td><strong>${w.MonthName}</strong></td>
          <td class="center">${w.ActualWeekdayDays} / ${w.TargetWeekdayDays}</td>
          <td class="center">${w.ActualWeekendHdDays} / ${w.TargetWeekendHdDays}</td>
          <td class="num">₱${money(w.TargetDailySalesWeekday)}</td>
          <td class="num">₱${money(w.ActualDailySalesWeekday)}</td>
          <td class="num">₱${money(w.TargetDailySalesWeekendHd)}</td>
          <td class="num">₱${money(w.ActualDailySalesWeekendHd)}</td>
          <td class="center">${pct(w.TargetWeekdaySalesPct, 1)} / ${pct(w.TargetWeekendHdSalesPct, 1)}</td>
          <td class="center">${pct(w.ActualWeekdaySalesPct, 1)} / ${pct(w.ActualWeekendHdSalesPct, 1)}</td>
        </tr>`,
      )
      .join('')}
  </table>`

  await renderHtmlToPdf(html, target.filePath)
  return result(true, false, 'Sales Target Analytics PDF exported successfully.', target.filePath)
}
