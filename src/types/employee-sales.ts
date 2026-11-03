export interface EmployeeOption {
  employeeId: string
  checkName: string
}

export interface EmployeeSalesInput {
  employeeName: string
  dateFrom: string
  dateTo: string
}

export interface EmployeeSalesAllInput {
  dateFrom: string
  dateTo: string
}

export interface EmployeeSalesMetrics {
  netSales: number
  taxCollected: number
  lessVat: number
  lessSC: number
  lessPWD: number
  lessEmp: number
  lessNationalAth: number
  lessSoloParent: number
  serviceAmount: number
  otherDiscount: number
  voidAmount: number
  voidCount: number
  vatableSales: number
  vatExemptSales: number
  vatZeroRatedSales: number
  gcSales: number
  gcExcess: number
  outstanding: number
  varianceAmount: number
}

export interface EmployeeTender {
  tenderName: string
  qty: number
  amount: number
}

export interface EmployeeSalesResult {
  employeeName: string
  dateFrom: string
  dateTo: string
  hasSales: boolean
  metrics: EmployeeSalesMetrics
  tenders: EmployeeTender[]
  tenderTotal: { qty: number; amount: number }
  grossSales: number
  totalDiscounts: number
  variance: number
}
