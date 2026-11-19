export interface VoidSummaryInput {
  dateFrom: string
  dateTo: string
}

export interface VoidTransactionRecord {
  transdatetime: string
  grossSale: number
  posname: string
  checknum: string
}

export interface VoidTransactionItem {
  fcrInvNum: string
  checkNum: string
  posName: string
  businessDate: string
  startTime: string
  voidTime: string
  intervalSeconds: number
  intervalFormatted: string
  voidAmount: number
  transactionCount: number
  records: VoidTransactionRecord[]
}

export interface VoidTransactionsSummary {
  totalVoidCount: number
  totalVoidAmount: number
  avgIntervalSeconds: number
  avgIntervalFormatted: string
}

export interface CancelItemRow {
  businessDate: string
  transDatetime: string
  fcrInvNum: string
  checkNum: string
  itemNumber: string
  itemName: string
  lineCount: number
  lineTotal: number
}

export interface CancelItemsSummary {
  totalCancelledQty: number
  totalCancelledAmount: number
  rowCount: number
  uniqueChecks: number
}

export interface VoidSummaryResult {
  success: boolean
  message: string
  warning?: string
  dateFrom: string
  dateTo: string
  voidSummary: VoidTransactionsSummary
  voidItems: VoidTransactionItem[]
  cancelSummary: CancelItemsSummary
  cancelItems: CancelItemRow[]
}

export interface VoidSummaryExportInput {
  dateFrom: string
  dateTo: string
  report: VoidSummaryResult
}

export interface VoidSummaryExportResult {
  success: boolean
  canceled: boolean
  message: string
  filePath?: string
}
