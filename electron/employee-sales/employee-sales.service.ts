import { loadEmployeeSales, loadEmployees, loadEmployeesWithSales } from './employee-sales.repository.js'
import type { EmployeeSalesAllInput, EmployeeSalesInput, EmployeeSalesResult } from './employee-sales.types.js'

const dateIsValid = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export { loadEmployees }

export async function generateEmployeeSales(input: EmployeeSalesInput): Promise<EmployeeSalesResult> {
  if (!input || typeof input.employeeName !== 'string' || !input.employeeName.trim()) {
    throw new Error('Please select an employee.')
  }
  if (!dateIsValid(input.dateFrom) || !dateIsValid(input.dateTo) || input.dateFrom > input.dateTo) {
    throw new Error('Please select a valid date range.')
  }
  const employeeName = input.employeeName.trim()
  const data = await loadEmployeeSales({ ...input, employeeName })
  const m = data.metrics
  const tenderTotal = data.tenders.reduce((sum, item) => ({
    qty: sum.qty + item.qty,
    amount: sum.amount + item.amount,
  }), { qty: 0, amount: 0 })
  // Match the supplied RDLC expressions, including their sign conventions.
  const grossSales = m.netSales + m.taxCollected
    - m.lessNationalAth - m.lessSoloParent - m.otherDiscount
  const totalDiscounts = m.lessVat + m.lessSC + m.lessPWD + m.lessEmp
    + m.lessNationalAth + m.lessSoloParent + m.otherDiscount
  return {
    ...data, employeeName, dateFrom: input.dateFrom, dateTo: input.dateTo,
    tenderTotal, grossSales, totalDiscounts,
    variance: tenderTotal.amount - grossSales,
  }
}

export async function generateAllEmployeeSales(input: EmployeeSalesAllInput): Promise<EmployeeSalesResult[]> {
  if (!input || !dateIsValid(input.dateFrom) || !dateIsValid(input.dateTo) || input.dateFrom > input.dateTo) {
    throw new Error('Please select a valid date range.')
  }
  const employees = await loadEmployeesWithSales(input.dateFrom, input.dateTo)
  const reports: EmployeeSalesResult[] = []
  for (const employeeName of employees) {
    const report = await generateEmployeeSales({ employeeName, dateFrom: input.dateFrom, dateTo: input.dateTo })
    if (report.hasSales) reports.push(report)
  }
  return reports
}
