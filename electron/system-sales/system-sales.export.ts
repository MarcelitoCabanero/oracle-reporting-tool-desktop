import {
  BrowserWindow,
  dialog,
} from 'electron'
import ExcelJS from 'exceljs'
import fs from 'node:fs/promises'

import type {
  SystemSalesExportInput,
  SystemSalesExportResult,
} from './system-sales.types.js'

const ORANGE = 'FFF36C21'
const DARK = 'FF1F2937'
const MUTED = 'FF667085'
const LIGHT = 'FFF7F8FA'
const BORDER = 'FFE4E7EC'
const BLUE = 'FF2563EB'
const RED = 'FFC93434'
const GREEN = 'FF16803C'
const AMBER = 'FFB76E00'
const WHITE = 'FFFFFFFF'

async function showSaveDialog(
  parent: BrowserWindow | undefined,
  options: Electron.SaveDialogOptions,
) {
  if (parent) {
    return dialog.showSaveDialog(
      parent,
      options,
    )
  }

  return dialog.showSaveDialog(
    options,
  )
}

function safeDate(value: string) {
  return value.replace(/[^0-9-]/g, '')
}

function defaultBaseName(input: SystemSalesExportInput) {
  const from = safeDate(input.dateFrom)
  const to = safeDate(input.dateTo)

  return from === to
    ? `System_Sales_${from}`
    : `System_Sales_${from}_to_${to}`
}

function money(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function number(value: number) {
  return new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function periodText(input: SystemSalesExportInput) {
  return input.dateFrom === input.dateTo
    ? input.dateFrom
    : `${input.dateFrom} to ${input.dateTo}`
}

function applyThinBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: BORDER } },
    left: { style: 'thin', color: { argb: BORDER } },
    bottom: { style: 'thin', color: { argb: BORDER } },
    right: { style: 'thin', color: { argb: BORDER } },
  }
}

function addSectionHeader(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  title: string,
  fromColumn: number,
  toColumn: number,
  color = DARK,
) {
  sheet.mergeCells(rowNumber, fromColumn, rowNumber, toColumn)
  const cell = sheet.getCell(rowNumber, fromColumn)
  cell.value = title
  cell.font = { bold: true, color: { argb: WHITE }, size: 11 }
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: color },
  }
  cell.alignment = { vertical: 'middle' }
  sheet.getRow(rowNumber).height = 22
}

function addLabelValue(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  labelColumn: number,
  valueColumn: number,
  label: string,
  value: number,
  tone?: 'positive' | 'negative' | 'warning',
) {
  const labelCell = sheet.getCell(rowNumber, labelColumn)
  const valueCell = sheet.getCell(rowNumber, valueColumn)

  labelCell.value = label
  valueCell.value = value
  valueCell.numFmt = '₱#,##0.00;[Red]-₱#,##0.00'

  labelCell.font = { color: { argb: MUTED }, size: 10 }
  valueCell.font = {
    bold: true,
    size: 10,
    color: {
      argb:
        tone === 'positive'
          ? GREEN
          : tone === 'negative'
            ? RED
            : tone === 'warning'
              ? AMBER
              : DARK,
    },
  }

  valueCell.alignment = { horizontal: 'right' }

  applyThinBorder(labelCell)
  applyThinBorder(valueCell)
}

export async function exportSystemSalesExcel(
  input: SystemSalesExportInput,
  parent?: BrowserWindow,
): Promise<SystemSalesExportResult> {
const save = await showSaveDialog(
  parent,
  {
    title: 'Export System Sales Excel',
    defaultPath: `${defaultBaseName(input)}.xlsx`,
    filters: [
      {
        name: 'Excel Workbook',
        extensions: ['xlsx'],
      },
    ],
  },
)

  if (save.canceled || !save.filePath) {
    return {
      success: false,
      canceled: true,
      message: 'Excel export canceled.',
    }
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Oracle Reporting Tool Desktop'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('System Sales', {
    views: [{ showGridLines: false }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    },
  })

  sheet.columns = [
    { width: 22 },
    { width: 16 },
    { width: 3 },
    { width: 22 },
    { width: 16 },
    { width: 3 },
    { width: 24 },
    { width: 18 },
  ]

  sheet.mergeCells('A1:H1')
  sheet.getCell('A1').value = 'SYSTEM SALES REPORT'
  sheet.getCell('A1').font = {
    bold: true,
    size: 20,
    color: { argb: ORANGE },
  }
  sheet.getCell('A1').alignment = { vertical: 'middle' }
  sheet.getRow(1).height = 30

  sheet.mergeCells('A2:H2')
  sheet.getCell('A2').value =
    `Report Period: ${periodText(input)}`
  sheet.getCell('A2').font = {
    size: 10,
    color: { argb: MUTED },
  }

  addSectionHeader(sheet, 4, 'SALES OVERVIEW', 1, 8, ORANGE)

  const overview = [
    ['Net Sales', input.report.summary.netSales],
    ['Vatable Sales', input.report.summary.vatableSales],
    ['Tax Collected', input.report.summary.taxCollected],
    ['Outstanding', input.report.summary.outstanding],
  ] as const

  overview.forEach(([label, value], index) => {
    const start = index * 2 + 1
    const labelCell = sheet.getCell(5, start)
    const valueCell = sheet.getCell(6, start)

    sheet.mergeCells(5, start, 5, start + 1)
    sheet.mergeCells(6, start, 6, start + 1)

    labelCell.value = label
    labelCell.font = {
      bold: true,
      size: 9,
      color: { argb: MUTED },
    }
    labelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: LIGHT },
    }

    valueCell.value = value
    valueCell.numFmt = '₱#,##0.00;[Red]-₱#,##0.00'
    valueCell.font = {
      bold: true,
      size: 14,
      color: {
        argb: label === 'Outstanding' ? AMBER : DARK,
      },
    }

    labelCell.alignment = { horizontal: 'center' }
    valueCell.alignment = { horizontal: 'center' }

    for (let col = start; col <= start + 1; col += 1) {
      applyThinBorder(sheet.getCell(5, col))
      applyThinBorder(sheet.getCell(6, col))
    }
  })

  addSectionHeader(sheet, 8, 'VAT BREAKDOWN', 1, 2, BLUE)
  addSectionHeader(sheet, 8, 'DISCOUNTS', 4, 5, RED)
  addSectionHeader(
    sheet,
    8,
    'OTHER SALES & ADJUSTMENTS',
    7,
    8,
    AMBER,
  )

  const s = input.report.summary

  const vat = [
    ['Vatable Sales', s.vatableSales],
    ['VAT Exempt Sales', s.vatExemptSales],
    ['Zero Rated Sales', s.vatZeroRatedSales],
    ['Tax Collected', s.taxCollected],
    ['Less VAT', s.lessVat],
  ] as const

  const discounts = [
    ['Senior Citizen', s.lessSC],
    ['PWD', s.lessPWD],
    ['Employee', s.lessEmployee],
    ['National Athlete', s.lessNationalAthlete],
    ['Solo Parent', s.lessSoloParent],
    ['Other Discount', s.otherDiscount],
  ] as const

  const adjustments = [
    ['GC Sales', s.gcSales, 'positive'],
    ['GC Excess', s.gcExcess, 'positive'],
    ['Void Amount', s.voidAmount, 'negative'],
    ['Void Count', s.voidCount, 'negative'],
    ['Outstanding', s.outstanding, 'warning'],
  ] as const

  vat.forEach(([label, value], i) =>
    addLabelValue(
      sheet,
      9 + i,
      1,
      2,
      label,
      value,
      label === 'Less VAT' ? 'negative' : undefined,
    ),
  )

  discounts.forEach(([label, value], i) =>
    addLabelValue(
      sheet,
      9 + i,
      4,
      5,
      label,
      value,
      value !== 0 ? 'negative' : undefined,
    ),
  )

  adjustments.forEach(([label, value, tone], i) => {
    const row = 9 + i

    if (label === 'Void Count') {
      const labelCell = sheet.getCell(row, 7)
      const valueCell = sheet.getCell(row, 8)
      labelCell.value = label
      valueCell.value = value
      valueCell.numFmt = '#,##0'
      labelCell.font = { color: { argb: MUTED }, size: 10 }
      valueCell.font = { bold: true, color: { argb: RED }, size: 10 }
      valueCell.alignment = { horizontal: 'right' }
      applyThinBorder(labelCell)
      applyThinBorder(valueCell)
      return
    }

    addLabelValue(
      sheet,
      row,
      7,
      8,
      label,
      value,
      tone,
    )
  })

  const tenderStart = 17
  addSectionHeader(
    sheet,
    tenderStart,
    'TENDER BREAKDOWN',
    1,
    8,
    DARK,
  )

  sheet.mergeCells(tenderStart + 1, 1, tenderStart + 1, 4)
  sheet.mergeCells(tenderStart + 1, 5, tenderStart + 1, 6)
  sheet.mergeCells(tenderStart + 1, 7, tenderStart + 1, 8)

  const headers = [
    [1, 'Tender Name'],
    [5, 'Qty'],
    [7, 'Amount'],
  ] as const

  headers.forEach(([column, title]) => {
    const cell = sheet.getCell(tenderStart + 1, column)
    cell.value = title
    cell.font = { bold: true, color: { argb: DARK } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: LIGHT },
    }
    cell.alignment = {
      horizontal: column === 1 ? 'left' : 'right',
    }
  })

  let rowNumber = tenderStart + 2

  for (const tender of input.report.tenders) {
    sheet.mergeCells(rowNumber, 1, rowNumber, 4)
    sheet.mergeCells(rowNumber, 5, rowNumber, 6)
    sheet.mergeCells(rowNumber, 7, rowNumber, 8)

    sheet.getCell(rowNumber, 1).value = tender.tenderName
    sheet.getCell(rowNumber, 5).value = tender.qty
    sheet.getCell(rowNumber, 7).value = tender.amount

    sheet.getCell(rowNumber, 5).numFmt = '#,##0.##'
    sheet.getCell(rowNumber, 7).numFmt =
      '₱#,##0.00;[Red]-₱#,##0.00'

    sheet.getCell(rowNumber, 5).alignment = {
      horizontal: 'right',
    }
    sheet.getCell(rowNumber, 7).alignment = {
      horizontal: 'right',
    }

    rowNumber += 1
  }

  sheet.mergeCells(rowNumber, 1, rowNumber, 4)
  sheet.mergeCells(rowNumber, 5, rowNumber, 6)
  sheet.mergeCells(rowNumber, 7, rowNumber, 8)

  sheet.getCell(rowNumber, 1).value = 'TOTAL'
  sheet.getCell(rowNumber, 5).value = input.report.tenderTotal.qty
  sheet.getCell(rowNumber, 7).value = input.report.tenderTotal.amount
  sheet.getCell(rowNumber, 5).numFmt = '#,##0.##'
  sheet.getCell(rowNumber, 7).numFmt =
    '₱#,##0.00;[Red]-₱#,##0.00'

  for (const col of [1, 5, 7]) {
    sheet.getCell(rowNumber, col).font = {
      bold: true,
      color: { argb: DARK },
    }
    sheet.getCell(rowNumber, col).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: LIGHT },
    }
  }

  sheet.getCell(rowNumber, 5).alignment = { horizontal: 'right' }
  sheet.getCell(rowNumber, 7).alignment = { horizontal: 'right' }

  sheet.views = [
    {
      showGridLines: false,
      state: 'frozen',
      ySplit: tenderStart + 1,
    },
  ]

  await workbook.xlsx.writeFile(save.filePath)

  return {
    success: true,
    canceled: false,
    message: 'System Sales Excel exported successfully.',
    filePath: save.filePath,
  }
}

function buildPdfHtml(input: SystemSalesExportInput) {
  const s = input.report.summary

  const detailRow = (
    label: string,
    value: string,
    tone = '',
  ) => `
    <div class="detail-row">
      <span>${escapeHtml(label)}</span>
      <strong class="${tone}">${escapeHtml(value)}</strong>
    </div>
  `

  const tenders = input.report.tenders.length
    ? input.report.tenders
        .map(
          (t) => `
            <tr>
              <td>${escapeHtml(t.tenderName)}</td>
              <td class="num">${escapeHtml(number(t.qty))}</td>
              <td class="num">${escapeHtml(money(t.amount))}</td>
            </tr>
          `,
        )
        .join('')
    : `
      <tr>
        <td colspan="3" class="empty">No tender records found.</td>
      </tr>
    `

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #1f2937;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .title { color: #f36c21; font-size: 22px; font-weight: 800; }
  .period { margin-top: 4px; color: #667085; }
  .section { margin-top: 12px; border: 1px solid #e4e7ec; border-radius: 7px; overflow: hidden; }
  .section-title { padding: 7px 10px; background: #f7f8fa; font-size: 11px; font-weight: 800; }
  .overview { display: grid; grid-template-columns: repeat(4, 1fr); }
  .kpi { padding: 10px; border-right: 1px solid #e4e7ec; }
  .kpi:last-child { border-right: 0; }
  .kpi-label { color: #667085; font-size: 9px; text-transform: uppercase; }
  .kpi-value { margin-top: 5px; font-size: 17px; font-weight: 800; }
  .warning { color: #b76e00; }
  .positive { color: #16803c; }
  .negative { color: #c93434; }
  .breakdown { display: grid; grid-template-columns: repeat(3, 1fr); }
  .column { padding: 9px 11px; border-right: 1px solid #e4e7ec; }
  .column:last-child { border-right: 0; }
  .column h3 { margin: 0 0 6px; font-size: 10px; }
  .blue { color: #2563eb; }
  .red { color: #c93434; }
  .amber { color: #b76e00; }
  .detail-row { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; border-bottom: 1px dashed #edf0f2; }
  .detail-row:last-child { border-bottom: 0; }
  .detail-row span { color: #667085; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f4f6f8; color: #4c5561; text-align: left; padding: 7px 9px; border-bottom: 1px solid #dfe3e8; font-size: 9px; text-transform: uppercase; }
  td { padding: 6px 9px; border-bottom: 1px solid #eef0f2; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  tfoot td { background: #f7f8fa; font-weight: 800; border-top: 1px solid #dfe3e8; }
  .empty { text-align: center; color: #667085; padding: 14px; }
  .footer { margin-top: 8px; color: #98a2b3; font-size: 8px; text-align: right; }
</style>
</head>
<body>
  <div class="title">SYSTEM SALES REPORT</div>
  <div class="period">Report Period: ${escapeHtml(periodText(input))}</div>

  <div class="section">
    <div class="section-title">SALES OVERVIEW</div>
    <div class="overview">
      <div class="kpi">
        <div class="kpi-label">Net Sales</div>
        <div class="kpi-value">${escapeHtml(money(s.netSales))}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Vatable Sales</div>
        <div class="kpi-value">${escapeHtml(money(s.vatableSales))}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Tax Collected</div>
        <div class="kpi-value">${escapeHtml(money(s.taxCollected))}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Outstanding</div>
        <div class="kpi-value warning">${escapeHtml(money(s.outstanding))}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">REPORT BREAKDOWN</div>
    <div class="breakdown">
      <div class="column">
        <h3 class="blue">VAT BREAKDOWN</h3>
        ${detailRow('Vatable Sales', money(s.vatableSales))}
        ${detailRow('VAT Exempt Sales', money(s.vatExemptSales))}
        ${detailRow('Zero Rated Sales', money(s.vatZeroRatedSales))}
        ${detailRow('Tax Collected', money(s.taxCollected))}
        ${detailRow('Less VAT', money(s.lessVat), 'negative')}
      </div>
      <div class="column">
        <h3 class="red">DISCOUNTS</h3>
        ${detailRow('Senior Citizen', money(s.lessSC), s.lessSC ? 'negative' : '')}
        ${detailRow('PWD', money(s.lessPWD), s.lessPWD ? 'negative' : '')}
        ${detailRow('Employee', money(s.lessEmployee), s.lessEmployee ? 'negative' : '')}
        ${detailRow('National Athlete', money(s.lessNationalAthlete), s.lessNationalAthlete ? 'negative' : '')}
        ${detailRow('Solo Parent', money(s.lessSoloParent), s.lessSoloParent ? 'negative' : '')}
        ${detailRow('Other Discount', money(s.otherDiscount), s.otherDiscount ? 'negative' : '')}
      </div>
      <div class="column">
        <h3 class="amber">OTHER SALES &amp; ADJUSTMENTS</h3>
        ${detailRow('GC Sales', money(s.gcSales), 'positive')}
        ${detailRow('GC Excess', money(s.gcExcess), s.gcExcess ? 'positive' : '')}
        ${detailRow('Void Amount', money(s.voidAmount), s.voidAmount ? 'negative' : '')}
        ${detailRow('Void Count', number(s.voidCount), s.voidCount ? 'negative' : '')}
        ${detailRow('Outstanding', money(s.outstanding), s.outstanding ? 'warning' : '')}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">TENDER BREAKDOWN</div>
    <table>
      <thead>
        <tr>
          <th>Tender Name</th>
          <th class="num">Qty</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>${tenders}</tbody>
      <tfoot>
        <tr>
          <td>TOTAL</td>
          <td class="num">${escapeHtml(number(input.report.tenderTotal.qty))}</td>
          <td class="num">${escapeHtml(money(input.report.tenderTotal.amount))}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="footer">Generated by Oracle Reporting Tool Desktop</div>
</body>
</html>`
}

export async function exportSystemSalesPdf(
  input: SystemSalesExportInput,
  parent?: BrowserWindow,
): Promise<SystemSalesExportResult> {
const save = await showSaveDialog(
  parent,
  {
    title: 'Export System Sales PDF',
    defaultPath: `${defaultBaseName(input)}.pdf`,
    filters: [
      {
        name: 'PDF files',
        extensions: ['pdf'],
      },
    ],
  },
)

  if (save.canceled || !save.filePath) {
    return {
      success: false,
      canceled: true,
      message: 'PDF export canceled.',
    }
  }

  const printWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  try {
    const html = buildPdfHtml(input)
    const dataUrl =
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`

    await printWindow.loadURL(dataUrl)

    const pdf = await printWindow.webContents.printToPDF({
      printBackground: true,
      landscape: true,
      pageSize: 'A4',
      margins: {
        top: 0.35,
        bottom: 0.35,
        left: 0.35,
        right: 0.35,
      },
    })

    await fs.writeFile(save.filePath, pdf)

    return {
      success: true,
      canceled: false,
      message: 'System Sales PDF exported successfully.',
      filePath: save.filePath,
    }
  } finally {
    if (!printWindow.isDestroyed()) {
      printWindow.destroy()
    }
  }
}
