type SystemApi = Window['api']
type ExportResult = { success: boolean; canceled: boolean; message: string }
type DataRecord = Record<string, unknown>
let pendingDepositAttachment: { fileName: string; dataUrl: string } | null = null

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', ...init?.headers },
  })
  const contentType = response.headers.get('content-type') ?? ''
  const body: unknown = contentType.includes('application/json') ? await response.json() : null
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
      ? body.message
      : 'The System Sales request could not be completed.'
    throw new Error(message)
  }
  return body as T
}

function post<T>(path: string, input: unknown) {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

function record(value: unknown): DataRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as DataRecord : {}
}

function scalar(value: unknown): string | number {
  return typeof value === 'number' || typeof value === 'string' ? value : ''
}

function exportRows(input: unknown, kind: 'system' | 'employee' | 'sc-pwd'): (string | number)[][] {
  const data = record(input)
  if (kind === 'sc-pwd') {
    const rows = Array.isArray(data.rows) ? data.rows.map(record) : []
    const keys = rows.length ? Object.keys(rows[0]) : []
    return [
      ['SC / PWD LISTING'],
      [`Report Period: ${String(data.dateFrom ?? '')} to ${String(data.dateTo ?? '')} | Type: ${String(data.type ?? '')}`],
      [],
      keys,
      ...rows.map((row) => keys.map((key) => scalar(row[key]))),
    ]
  }

  const report = record(data.report)
  if (kind === 'employee') {
    const metrics = record(report.metrics)
    const tenders = Array.isArray(report.tenders) ? report.tenders.map(record) : []
    return [
      ['EMPLOYEE SALES REPORT'],
      [`Employee: ${String(report.employeeName ?? '')}`],
      [`Report Period: ${String(report.dateFrom ?? '')} to ${String(report.dateTo ?? '')}`],
      [],
      ['Sales Metric', 'Amount'],
      ...Object.entries(metrics).map(([label, value]) => [label, scalar(value)]),
      ['Gross Sales', scalar(report.grossSales)],
      ['Total Discounts', scalar(report.totalDiscounts)],
      ['Variance', scalar(report.variance)],
      [],
      ['Tender', 'Qty', 'Amount'],
      ...tenders.map((tender) => [String(tender.tenderName ?? ''), scalar(tender.qty), scalar(tender.amount)]),
    ]
  }

  const summary = record(report.summary)
  const tenders = Array.isArray(report.tenders) ? report.tenders.map(record) : []
  const fields: [string, string][] = [
    ['Net Sales', 'netSales'], ['Revenue', 'revenue'], ['Tax Collected', 'taxCollected'],
    ['Variance', 'varianceAmount'], ['Vatable Sales', 'vatableSales'],
    ['VAT Exempt Sales', 'vatExemptSales'], ['Zero Rated Sales', 'vatZeroRatedSales'],
    ['Less VAT', 'lessVat'], ['Senior Citizen', 'lessSC'], ['PWD', 'lessPWD'],
    ['Employee Discount', 'lessEmployee'], ['National Athlete', 'lessNationalAthlete'],
    ['Solo Parent', 'lessSoloParent'], ['GC Sales', 'gcSales'], ['GC Excess', 'gcExcess'],
    ['Other Discount', 'otherDiscount'], ['Void Amount', 'voidAmount'],
    ['Void Count', 'voidCount'], ['Outstanding', 'outstanding'],
  ]
  return [
    ['SYSTEM SALES REPORT'],
    [`Report Period: ${String(data.dateFrom ?? '')} to ${String(data.dateTo ?? '')}`],
    [],
    ['Sales Breakdown', 'Amount'],
    ...fields.map(([label, key]) => [label, scalar(key === 'revenue' ? Number(summary.netSales ?? 0) + Number(summary.taxCollected ?? 0) : summary[key])]),
    [],
    ['Tender', 'Qty', 'Amount'],
    ...tenders.map((tender) => [String(tender.tenderName ?? ''), scalar(tender.qty), scalar(tender.amount)]),
    ['TOTAL', scalar(record(report.tenderTotal).qty), scalar(record(report.tenderTotal).amount)],
  ]
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '')
}

async function downloadExcel(input: unknown, kind: 'system' | 'employee' | 'sc-pwd'): Promise<ExportResult> {
  const data = record(input)
  const period = `${String(data.dateFrom ?? record(data.report).dateFrom ?? 'report')}_${String(data.dateTo ?? record(data.report).dateTo ?? '')}`
  const name = kind === 'system'
    ? `System_Sales_${period}`
    : kind === 'employee'
      ? `Employee_Sales_${safeFilename(String(record(data.report).employeeName ?? 'All'))}_${period}`
      : `SC_PWD_Listing_${period}`
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Oracle Reporting Tool Web'
  const sheet = workbook.addWorksheet(kind === 'sc-pwd' ? 'SC PWD Listing' : kind === 'employee' ? 'Employee Sales' : 'System Sales')
  sheet.addRows(exportRows(input, kind))
  sheet.getRow(1).font = { bold: true, size: 18, color: { argb: 'FFF36C21' } }
  sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
  sheet.columns.forEach((column) => { column.width = 20 })
  sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 4 }]
  const bytes = await workbook.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${name}.xlsx`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { success: true, canceled: false, message: 'Excel report downloaded.' }
}

async function downloadMenuItemExcel(input: unknown, summary: boolean): Promise<ExportResult> {
  const data = record(input)
  const rows = Array.isArray(data.rows) ? data.rows.map(record) : []
  const reportName = summary ? 'Menu Item Summary' : 'Menu Item by Sales Type'
  if (rows.length === 0) {
    return { success: false, canceled: false, message: `There are no ${reportName} records to export.` }
  }

  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Oracle Reporting Tool Web'
  const sheetName = summary ? 'Menu Item Summary' : 'Menu Item by Sales Type'
  const worksheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 4 }] })
  const columns = summary
    ? [{ width: 16 }, { width: 36 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 20 }, { width: 22 }]
    : [{ width: 16 }, { width: 36 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 18 }]
  worksheet.columns = columns
  const lastColumn = summary ? 'H' : 'G'
  worksheet.mergeCells(`A1:${lastColumn}1`)
  worksheet.getCell('A1').value = summary ? 'MENU ITEM SUMMARY' : 'MENU ITEM BY SALES TYPE'
  worksheet.getCell('A1').font = { bold: true, size: 14 }
  worksheet.getCell('A1').alignment = { horizontal: 'center' }
  worksheet.mergeCells(`A2:${lastColumn}2`)
  worksheet.getCell('A2').value = `Date: ${String(data.dateFrom ?? '')} to ${String(data.dateTo ?? '')}`
  worksheet.mergeCells(`A3:${lastColumn}3`)
  worksheet.getCell('A3').value = summary
    ? `Major Group: ${String(data.majorGroupFilter || 'All Major Groups')}`
    : `Sales Type: ${String(data.salesTypeFilter || 'All Sales Types')}`
  const headers = summary
    ? ['Item Number', 'Item Name', 'Qty', 'Gross', 'Discount', 'Net Sales', 'Major Group', 'Family Group']
    : ['Item Number', 'Item Name', 'Qty', 'Gross', 'Discount', 'Net Sales', 'Sales Type']
  const header = worksheet.getRow(4)
  header.values = headers
  header.font = { bold: true }
  header.eachCell((cell) => {
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  })

  rows.forEach((item, index) => {
    const row = worksheet.getRow(index + 5)
    const values = summary
      ? [item.itemNumber, item.itemName, item.qty, item.grossAmount, item.itemDiscount, item.netSales, item.majorGroup, item.familyGroup]
      : [item.itemNumber, item.itemName, item.qty, item.grossAmount, item.itemDiscount, item.netSales, item.salesType]
    row.values = values.map((value) =>
      value === null || value === undefined || typeof value === 'string' || typeof value === 'number'
        ? value
        : String(value),
    )
    row.eachCell((cell) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    })
  })

  const totalRowNumber = rows.length + 5
  const total = worksheet.getRow(totalRowNumber)
  total.getCell(1).value = 'TOTAL'
  for (const column of [3, 4, 5, 6]) {
    const letter = String.fromCharCode(64 + column)
    total.getCell(column).value = { formula: `SUM(${letter}5:${letter}${totalRowNumber - 1})` }
  }
  total.font = { bold: true }
  total.eachCell((cell) => {
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  })
  worksheet.getColumn(3).numFmt = '#,##0'
  for (const column of [4, 5, 6]) worksheet.getColumn(column).numFmt = '#,##0.00'
  worksheet.autoFilter = { from: 'A4', to: `${lastColumn}4` }

  const bytes = await workbook.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `MenuItem_${summary ? 'Summary' : 'BySalesType'}_${String(data.dateFrom ?? '').replaceAll('-', '')}_${String(data.dateTo ?? '').replaceAll('-', '')}.xlsx`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { success: true, canceled: false, message: `${reportName} exported successfully.` }
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}

function printPdf(input: unknown, kind: 'system' | 'employee' | 'sc-pwd'): Promise<ExportResult> {
  const rows = exportRows(input, kind)
  const popup = window.open('', '_blank')
  if (!popup) return Promise.reject(new Error('Allow pop-ups to print or save the PDF report.'))
  const body = rows.map((row, index) => `<tr>${row.map((value) => index === 0 ? `<th>${escapeHtml(value)}</th>` : `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')
  popup.document.open()
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>System Sales Report</title><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#1f2937}h1{color:#f36c21;font-size:22px}table{width:100%;border-collapse:collapse}td,th{padding:7px;border:1px solid #d9dee7;text-align:left}th{background:#1f2937;color:white}tr:nth-child(even) td{background:#f7f8fa}</style></head><body><h1>${escapeHtml(rows[0]?.[0] ?? 'Report')}</h1><table>${body}</table><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300))</script></body></html>`)
  popup.document.close()
  return Promise.resolve({ success: true, canceled: false, message: 'Print dialog opened. Choose Save as PDF to download.' })
}

const hourlySales = {
  getDailyReport: (input: Parameters<SystemApi['hourlySales']['getDailyReport']>[0]) => request<Awaited<ReturnType<SystemApi['hourlySales']['getDailyReport']>>>(`/hourly-sales/daily-report?businessDate=${encodeURIComponent(input.businessDate)}`),
  createEntries: (input: Parameters<SystemApi['hourlySales']['createEntries']>[0]) => post<Awaited<ReturnType<SystemApi['hourlySales']['createEntries']>>>('/hourly-sales/entries', input),
  getRecords: (input: Parameters<SystemApi['hourlySales']['getRecords']>[0]) => request<Awaited<ReturnType<SystemApi['hourlySales']['getRecords']>>>(`/hourly-sales/records?startDate=${encodeURIComponent(input.startDate)}&endDate=${encodeURIComponent(input.endDate)}`),
  updateRecord: (input: Parameters<SystemApi['hourlySales']['updateRecord']>[0]) => request<Awaited<ReturnType<SystemApi['hourlySales']['updateRecord']>>>('/hourly-sales/records', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }),
}

const systemSales = {
  workstations: () => request<string[]>('/system-sales/workstations'),
  generate: (input: Parameters<SystemApi['systemSales']['generate']>[0]) => post<Awaited<ReturnType<SystemApi['systemSales']['generate']>>>('/system-sales/generate', input),
  exportExcel: (input: unknown) => downloadExcel(input, 'system'),
  exportPdf: (input: unknown) => printPdf(input, 'system'),
}

const employeeSales = {
  employees: () => request<Awaited<ReturnType<SystemApi['employeeSales']['employees']>>>('/employee-sales/employees'),
  generate: (input: Parameters<SystemApi['employeeSales']['generate']>[0]) => post<Awaited<ReturnType<SystemApi['employeeSales']['generate']>>>('/employee-sales/generate', input),
  generateAll: (input: Parameters<SystemApi['employeeSales']['generateAll']>[0]) => post<Awaited<ReturnType<SystemApi['employeeSales']['generateAll']>>>('/employee-sales/generate-all', input),
  exportExcel: (input: unknown) => downloadExcel(input, 'employee'),
  exportPdf: (input: unknown) => printPdf(input, 'employee'),
}

const scPwd = {
  generate: (input: Parameters<SystemApi['scPwd']['generate']>[0]) => post<Awaited<ReturnType<SystemApi['scPwd']['generate']>>>('/sc-pwd/generate', input),
  exportExcel: (input: unknown) => downloadExcel(input, 'sc-pwd'),
  exportPdf: (input: unknown) => printPdf(input, 'sc-pwd'),
}

const tenderListing = {
  generate: (input: Parameters<SystemApi['tenderListing']['generate']>[0]) => post<Awaited<ReturnType<SystemApi['tenderListing']['generate']>>>('/tender-listing/generate', input),
}

const varianceChecking = {
  generate: (input: Parameters<SystemApi['varianceChecking']['generate']>[0]) => post<Awaited<ReturnType<SystemApi['varianceChecking']['generate']>>>('/variance-checking/generate', input),
  receipt: (input: Parameters<SystemApi['varianceChecking']['receipt']>[0]) => post<Awaited<ReturnType<SystemApi['varianceChecking']['receipt']>>>('/variance-checking/receipt', input),
}

const menuItem = {
  getBySalesType: (input: Parameters<SystemApi['menuItem']['getBySalesType']>[0]) => post<Awaited<ReturnType<SystemApi['menuItem']['getBySalesType']>>>('/menu-item/by-sales-type', input),
  getSummary: (input: Parameters<SystemApi['menuItem']['getSummary']>[0]) => post<Awaited<ReturnType<SystemApi['menuItem']['getSummary']>>>('/menu-item/summary', input),
  exportBySalesType: (input: Parameters<SystemApi['menuItem']['exportBySalesType']>[0]) => downloadMenuItemExcel(input, false),
  exportSummary: (input: Parameters<SystemApi['menuItem']['exportSummary']>[0]) => downloadMenuItemExcel(input, true),
}

function printPosJournal(checkNumber: string): Promise<Awaited<ReturnType<SystemApi['posJournal']['exportPdf']>>> {
  const receipt = document.querySelector<HTMLElement>('.pos-journal-export-target pre')?.innerText
  if (!receipt) throw new Error(`Receipt ${checkNumber} is not displayed.`)
  const popup = window.open('', '_blank')
  if (!popup) throw new Error('Allow pop-ups to print or save the receipt as PDF.')
  const safeText = receipt.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  const safeCheck = checkNumber.replace(/[^0-9]/g, '')
  popup.document.open()
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${safeCheck}</title><style>@page{size:A4;margin:12mm}body{font:12px "Courier New",Courier,monospace;color:#111}h1{font:600 14px Arial,sans-serif}.receipt{position:relative;break-inside:avoid}.watermark{position:absolute;top:40%;left:20.5%;z-index:0;transform:translate(-50%,-50%) rotate(-38deg);color:#777;font:700 45pt "Courier New",Courier,monospace;letter-spacing:.08em;opacity:.1;white-space:nowrap;pointer-events:none}pre{position:relative;z-index:1;margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:9pt/1.25 "Courier New",Courier,monospace}</style></head><body><h1>Receipt ${safeCheck}</h1><article class="receipt"><div class="watermark">RE-PRINT</div><pre>${safeText}</pre></article><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250))</script></body></html>`)
  popup.document.close()
  return Promise.resolve({ success: true, message: 'Print dialog opened. Choose Save as PDF to download.' })
}

const posJournal = {
  load: (businessDate: string) => request<Awaited<ReturnType<SystemApi['posJournal']['load']>>>(`/pos-journal/by-date?businessDate=${encodeURIComponent(businessDate)}`),
  loadByCheckNumber: (checkNumber: string) => request<Awaited<ReturnType<SystemApi['posJournal']['loadByCheckNumber']>>>(`/pos-journal/by-check-number?checkNumber=${encodeURIComponent(checkNumber)}`),
  exportPdf: (checkNumber: string) => printPosJournal(checkNumber),
}

const rof = {
  loadSource: (businessDate: string) => request<Awaited<ReturnType<SystemApi['rof']['loadSource']>>>(`/rof/source?businessDate=${encodeURIComponent(businessDate)}`),
  loadDetails: (businessDate: string) => request<Awaited<ReturnType<SystemApi['rof']['loadDetails']>>>(`/rof/details?businessDate=${encodeURIComponent(businessDate)}`),
  loadSummary: (dateFrom: string, dateTo: string, _locationName: string) => request<Awaited<ReturnType<SystemApi['rof']['loadSummary']>>>(`/rof/summary?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`),
  create: (input: Parameters<SystemApi['rof']['create']>[0]) => post<Awaited<ReturnType<SystemApi['rof']['create']>>>('/rof/create', input),
  delete: (businessDate: string) => request<Awaited<ReturnType<SystemApi['rof']['delete']>>>(`/rof/delete?businessDate=${encodeURIComponent(businessDate)}`, { method: 'DELETE' }),
  getDepositSource: (businessDate: string) => request<Awaited<ReturnType<SystemApi['rof']['getDepositSource']>>>(`/rof/deposit-source?businessDate=${encodeURIComponent(businessDate)}`),
}

function pickDepositImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.jpg,.jpeg,.png,.gif,.bmp,.tif,.tiff,image/*'
    input.style.display = 'none'
    let settled = false
    const finish = (file: File | null) => {
      if (settled) return
      settled = true
      window.removeEventListener('focus', onFocus)
      input.remove()
      resolve(file)
    }
    const onFocus = () => window.setTimeout(() => finish(input.files?.[0] ?? null), 250)
    input.addEventListener('change', () => finish(input.files?.[0] ?? null), { once: true })
    input.addEventListener('cancel', () => finish(null), { once: true })
    window.addEventListener('focus', onFocus, { once: true })
    document.body.append(input)
    input.click()
  })
}

async function fileToDataUrl(file: File): Promise<string> {
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error('Attachment must be smaller than 10 MB.')
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tif', 'tiff'].includes(extension)) throw new Error('Choose a JPG, JPEG, PNG, GIF, BMP, or TIFF image.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  const mime = file.type || (extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : `image/${extension}`)
  return `data:${mime};base64,${btoa(binary)}`
}

const deposit = {
  checkStatus: (businessDate: string, _locationName: string) => request<Awaited<ReturnType<SystemApi['deposit']['checkStatus']>>>(`/deposit/check-status?businessDate=${encodeURIComponent(businessDate)}`),
  create: async (input: Parameters<SystemApi['deposit']['create']>[0]) => {
    if (!pendingDepositAttachment) throw new Error('Choose a deposit image attachment.')
    const [header, base64 = ''] = pendingDepositAttachment.dataUrl.split(',', 2)
    const result = await post<Awaited<ReturnType<SystemApi['deposit']['create']>>>('/deposit/create', {
      ...input,
      attachmentName: pendingDepositAttachment.fileName,
      attachmentBase64: base64,
      attachmentMime: header?.match(/^data:([^;]+)/)?.[1] ?? '',
    })
    if (result.success) pendingDepositAttachment = null
    return result
  },
  list: (input: Parameters<SystemApi['deposit']['list']>[0]) => {
    const query = new URLSearchParams({ page: String(input.page), pageSize: String(input.pageSize) })
    if (input.keyword) query.set('keyword', input.keyword)
    if (input.month) query.set('month', String(input.month))
    if (input.year) query.set('year', String(input.year))
    return request<Awaited<ReturnType<SystemApi['deposit']['list']>>>(`/deposit/list?${query}`)
  },
  getById: (depositId: number, _locationName: string) => request<Awaited<ReturnType<SystemApi['deposit']['getById']>>>(`/deposit/record?depositId=${depositId}`),
  update: (input: Parameters<SystemApi['deposit']['update']>[0]) => request<Awaited<ReturnType<SystemApi['deposit']['update']>>>('/deposit/update', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }),
  delete: (depositId: number, _locationName: string) => request<Awaited<ReturnType<SystemApi['deposit']['delete']>>>(`/deposit/delete?depositId=${depositId}`, { method: 'DELETE' }),
  selectAttachment: async (): Promise<Awaited<ReturnType<SystemApi['deposit']['selectAttachment']>>> => {
    const file = await pickDepositImage()
    if (!file) return { canceled: true, filePath: '', fileName: '', previewDataUrl: '' }
    const dataUrl = await fileToDataUrl(file)
    pendingDepositAttachment = { fileName: file.name, dataUrl }
    return { canceled: false, filePath: 'browser-upload', fileName: file.name, previewDataUrl: dataUrl }
  },
  getAttachment: (fileName: string) => request<Awaited<ReturnType<SystemApi['deposit']['getAttachment']>>>(`/deposit/attachment?fileName=${encodeURIComponent(fileName)}`),
  downloadAttachment: async (fileName: string): Promise<Awaited<ReturnType<SystemApi['deposit']['downloadAttachment']>>> => {
    const result = await deposit.getAttachment(fileName)
    if (!result.success) return { success: false, canceled: false, savedPath: '', message: result.message }
    const anchor = document.createElement('a')
    anchor.href = result.previewDataUrl
    anchor.download = fileName
    anchor.click()
    return { success: true, canceled: false, savedPath: fileName, message: 'Attachment downloaded successfully.' }
  },
  replaceAttachment: async (fileName: string): Promise<Awaited<ReturnType<SystemApi['deposit']['replaceAttachment']>>> => {
    const file = await pickDepositImage()
    if (!file) return { success: false, canceled: true, previewDataUrl: '', message: 'Replace canceled.' }
    const [, base64 = ''] = (await fileToDataUrl(file)).split(',', 2)
    return post<Awaited<ReturnType<SystemApi['deposit']['replaceAttachment']>>>('/deposit/replace-attachment', {
      fileName,
      attachmentName: file.name,
      attachmentBase64: base64,
    })
  },
}

const maintenance = {
  loadMissingItems: () => request<Awaited<ReturnType<SystemApi['maintenance']['loadMissingItems']>>>('/maintenance/missing-items'),
  syncItems: (rows: Parameters<SystemApi['maintenance']['syncItems']>[0]) => post<Awaited<ReturnType<SystemApi['maintenance']['syncItems']>>>('/maintenance/sync-items', { rows }),
}

export function installSystemSalesApi() {
  const existing = (window as Window & { api?: Partial<SystemApi> }).api ?? {}
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { ...existing, hourlySales, systemSales, employeeSales, scPwd, tenderListing, varianceChecking, menuItem, posJournal, rof, deposit, maintenance } as SystemApi,
  })
}
