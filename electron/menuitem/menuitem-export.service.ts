import { dialog } from 'electron'
import ExcelJS, { Cell } from 'exceljs'

import type {
  MenuItemBySalesTypeRow,
  MenuItemSummaryRow,
} from './menuitem.types.js'

interface ExportBySalesTypeInput {
  dateFrom: string
  dateTo: string
  rows: MenuItemBySalesTypeRow[]
  salesTypeFilter?: string
}

interface ExportSummaryInput {
  dateFrom: string
  dateTo: string
  rows: MenuItemSummaryRow[]
  majorGroupFilter?: string
}

export interface MenuItemExportResult {
  success: boolean
  canceled: boolean
  message: string
  filePath?: string
}

function safeDate(value: string) {
  return value.replace(/-/g, '')
}

function styleBorder(row: ExcelJS.Row) {
  row.eachCell((cell: Cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  })
}

export async function exportMenuItemBySalesType(
  input: ExportBySalesTypeInput,
): Promise<MenuItemExportResult> {
  if (input.rows.length === 0) {
    return {
      success: false,
      canceled: false,
      message: 'There are no Menu Item by Sales Type records to export.',
    }
  }

  const saveResult = await dialog.showSaveDialog({
    title: 'Export Menu Item by Sales Type',
    defaultPath:
      `MenuItem_BySalesType_${safeDate(input.dateFrom)}_${safeDate(input.dateTo)}.xlsx`,
    filters: [
      {
        name: 'Excel Workbook',
        extensions: ['xlsx'],
      },
    ],
  })

  if (saveResult.canceled || !saveResult.filePath) {
    return {
      success: false,
      canceled: true,
      message: 'Excel export canceled.',
    }
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Oracle Reporting Tool Desktop'

  const ws = workbook.addWorksheet(
    'Menu Item by Sales Type',
    {
      views: [
        {
          state: 'frozen',
          ySplit: 4,
        },
      ],
    },
  )

  ws.columns = [
    { width: 16 },
    { width: 36 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
  ]

  ws.mergeCells('A1:G1')
  ws.getCell('A1').value = 'MENU ITEM BY SALES TYPE'
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A1').alignment = { horizontal: 'center' }

  ws.mergeCells('A2:G2')
  ws.getCell('A2').value =
    `Date: ${input.dateFrom} to ${input.dateTo}`

  ws.mergeCells('A3:G3')
  ws.getCell('A3').value =
    `Sales Type: ${input.salesTypeFilter?.trim() || 'All Sales Types'}`

  const header = ws.getRow(4)
  header.values = [
    'Item Number',
    'Item Name',
    'Qty',
    'Gross',
    'Discount',
    'Net Sales',
    'Sales Type',
  ]
  header.font = { bold: true }
  styleBorder(header)

  let rowNo = 5

  for (const item of input.rows) {
    const row = ws.getRow(rowNo)

    // Exact requested order:
    // Itemnumber, Itemname, Qty, Gross, Discount, NetSales, SalesType
    row.values = [
      item.itemNumber,
      item.itemName,
      item.qty,
      item.grossAmount,
      item.itemDiscount,
      item.netSales,
      item.salesType,
    ]

    styleBorder(row)
    rowNo += 1
  }

  const firstDataRow = 5
  const lastDataRow = rowNo - 1
  const totalRow = ws.getRow(rowNo)

  totalRow.getCell(1).value = 'TOTAL'
  totalRow.getCell(3).value = {
    formula: `SUM(C${firstDataRow}:C${lastDataRow})`,
  }
  totalRow.getCell(4).value = {
    formula: `SUM(D${firstDataRow}:D${lastDataRow})`,
  }
  totalRow.getCell(5).value = {
    formula: `SUM(E${firstDataRow}:E${lastDataRow})`,
  }
  totalRow.getCell(6).value = {
    formula: `SUM(F${firstDataRow}:F${lastDataRow})`,
  }

  totalRow.font = { bold: true }
  styleBorder(totalRow)

  ws.getColumn(3).numFmt = '#,##0'
  ws.getColumn(4).numFmt = '#,##0.00'
  ws.getColumn(5).numFmt = '#,##0.00'
  ws.getColumn(6).numFmt = '#,##0.00'

  ws.autoFilter = {
    from: 'A4',
    to: 'G4',
  }

  await workbook.xlsx.writeFile(saveResult.filePath)

  return {
    success: true,
    canceled: false,
    message: 'Menu Item by Sales Type exported successfully.',
    filePath: saveResult.filePath,
  }
}

export async function exportMenuItemSummary(
  input: ExportSummaryInput,
): Promise<MenuItemExportResult> {
  if (input.rows.length === 0) {
    return {
      success: false,
      canceled: false,
      message: 'There are no Menu Item Summary records to export.',
    }
  }

  const saveResult = await dialog.showSaveDialog({
    title: 'Export Menu Item Summary',
    defaultPath:
      `MenuItem_Summary_${safeDate(input.dateFrom)}_${safeDate(input.dateTo)}.xlsx`,
    filters: [
      {
        name: 'Excel Workbook',
        extensions: ['xlsx'],
      },
    ],
  })

  if (saveResult.canceled || !saveResult.filePath) {
    return {
      success: false,
      canceled: true,
      message: 'Excel export canceled.',
    }
  }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Oracle Reporting Tool Desktop'

  const ws = workbook.addWorksheet(
    'Menu Item Summary',
    {
      views: [
        {
          state: 'frozen',
          ySplit: 4,
        },
      ],
    },
  )

  ws.columns = [
    { width: 16 },
    { width: 36 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 20 },
    { width: 22 },
  ]

  ws.mergeCells('A1:H1')
  ws.getCell('A1').value = 'MENU ITEM SUMMARY'
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A1').alignment = { horizontal: 'center' }

  ws.mergeCells('A2:H2')
  ws.getCell('A2').value =
    `Date: ${input.dateFrom} to ${input.dateTo}`

  ws.mergeCells('A3:H3')
  ws.getCell('A3').value =
    `Major Group: ${input.majorGroupFilter?.trim() || 'All Major Groups'}`

  const header = ws.getRow(4)
  header.values = [
    'Item Number',
    'Item Name',
    'Qty',
    'Gross',
    'Discount',
    'Net Sales',
    'Major Group',
    'Family Group',
  ]
  header.font = { bold: true }
  styleBorder(header)

  let rowNo = 5

  for (const item of input.rows) {
    const row = ws.getRow(rowNo)

    row.values = [
      item.itemNumber,
      item.itemName,
      item.qty,
      item.grossAmount,
      item.itemDiscount,
      item.netSales,
      item.majorGroup,
      item.familyGroup,
    ]

    styleBorder(row)
    rowNo += 1
  }

  const firstDataRow = 5
  const lastDataRow = rowNo - 1
  const totalRow = ws.getRow(rowNo)

  totalRow.getCell(1).value = 'TOTAL'
  totalRow.getCell(3).value = {
    formula: `SUM(C${firstDataRow}:C${lastDataRow})`,
  }
  totalRow.getCell(4).value = {
    formula: `SUM(D${firstDataRow}:D${lastDataRow})`,
  }
  totalRow.getCell(5).value = {
    formula: `SUM(E${firstDataRow}:E${lastDataRow})`,
  }
  totalRow.getCell(6).value = {
    formula: `SUM(F${firstDataRow}:F${lastDataRow})`,
  }

  totalRow.font = { bold: true }
  styleBorder(totalRow)

 ws.getColumn(3).numFmt = '#,##0'
  ws.getColumn(4).numFmt = '#,##0.00'
  ws.getColumn(5).numFmt = '#,##0.00'
  ws.getColumn(6).numFmt = '#,##0.00'

  ws.autoFilter = {
    from: 'A4',
    to: 'H4',
  }

  await workbook.xlsx.writeFile(saveResult.filePath)

  return {
    success: true,
    canceled: false,
    message: 'Menu Item Summary exported successfully.',
    filePath: saveResult.filePath,
  }
}
