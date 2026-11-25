export type SystemSalesView =
  | 'sales-summary'
  | 'employee-sales'
  | 'pos-sales'
  | 'sc-pwd-listing'
  | 'tender-listing'
  | 'void-summary'

export interface SystemSalesSharedDatesProps {
  dateFrom?: string
  dateTo?: string
  onDateFromChange?: (value: string) => void
  onDateToChange?: (value: string) => void
}

export function formatSystemSalesPeriodDate(value: string): string {
  if (!value) return ''
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export function formatSystemSalesReportPeriod(dateFrom: string, dateTo: string): string {
  if (!dateFrom || !dateTo) return 'Not generated'
  if (dateFrom === dateTo) return formatSystemSalesPeriodDate(dateFrom)
  return `${formatSystemSalesPeriodDate(dateFrom)} – ${formatSystemSalesPeriodDate(dateTo)}`
}
