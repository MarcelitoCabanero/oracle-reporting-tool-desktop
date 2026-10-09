export interface VarianceCheckingInput {
  dateFrom: string
  dateTo: string
  employeeName?: string
  workstation?: string
}

export interface VarianceCheckingRow {
  checkNumber: string
  businessDate: string
  gross: number
  totalTender: number
  variance: number
}

export interface VarianceCheckingTotals {
  gross: number
  totalTender: number
  variance: number
}

export interface VarianceCheckingResult {
  success: boolean
  message: string
  rows: VarianceCheckingRow[]
  totals: VarianceCheckingTotals
}

export interface VarianceReceiptInput {
  checkNumber: string
}

export interface VarianceReceiptResult {
  success: boolean
  message: string
  checkNumber: string
  lines: string[]
}
