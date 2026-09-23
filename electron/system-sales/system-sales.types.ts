export interface SystemSalesDateRangeInput {
  dateFrom: string
  dateTo: string
}

export interface SystemSalesSummary {
  netSales: number
  taxCollected: number

  vatableSales: number
  vatExemptSales: number
  vatZeroRatedSales: number

  lessVat: number
  lessSC: number
  lessPWD: number
  lessEmployee: number
  lessNationalAthlete: number
  lessSoloParent: number

  gcSales: number
  gcExcess: number

  otherDiscount: number

  voidAmount: number
  voidCount: number

  outstanding: number
}

export interface SystemSalesTender {
  tenderName: string
  qty: number
  amount: number
}

export interface SystemSalesTenderTotal {
  qty: number
  amount: number
}

export interface SystemSalesResult {
  success: boolean
  message: string
  summary: SystemSalesSummary
  tenders: SystemSalesTender[]
  tenderTotal: SystemSalesTenderTotal
}