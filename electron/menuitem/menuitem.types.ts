export interface MenuItemDateRangeInput {
  dateFrom: string
  dateTo: string
}

export interface MenuItemBySalesTypeRow {
  itemNumber: string
  itemName: string
  qty: number
  grossAmount: number
  itemDiscount: number
  netSales: number
  salesType: string
}

export interface MenuItemSummaryRow {
  itemNumber: string
  itemName: string
  qty: number
  grossAmount: number
  itemDiscount: number
  netSales: number
  majorGroup: string
  familyGroup: string
}

export interface MenuItemTotals {
  qty: number
  grossAmount: number
  itemDiscount: number
  netSales: number
}

export interface MenuItemBySalesTypeResult {
  success: boolean
  message: string
  rows: MenuItemBySalesTypeRow[]
  totals: MenuItemTotals
}

export interface MenuItemSummaryResult {
  success: boolean
  message: string
  rows: MenuItemSummaryRow[]
  totals: MenuItemTotals
  majorGroups: string[]
}
