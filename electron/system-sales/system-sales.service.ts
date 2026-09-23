import {
  getSystemSalesSummary,
  getSystemSalesTenders,
} from './system-sales.repository.js'

import type {
  SystemSalesDateRangeInput,
  SystemSalesResult,
} from './system-sales.types.js'

function isValidDate(
  value: string,
): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  )
}

export async function generateSystemSalesReport(
  input: SystemSalesDateRangeInput,
): Promise<SystemSalesResult> {
  if (
    !input ||
    !isValidDate(input.dateFrom) ||
    !isValidDate(input.dateTo)
  ) {
    throw new Error(
      'Please select a valid date range.',
    )
  }

  if (
    input.dateFrom >
    input.dateTo
  ) {
    throw new Error(
      'From date cannot be later than To date.',
    )
  }

  const [
    summary,
    tenders,
  ] = await Promise.all([
    getSystemSalesSummary(input),
    getSystemSalesTenders(input),
  ])

  const tenderTotal =
    tenders.reduce(
      (total, tender) => {
        total.qty += tender.qty
        total.amount +=
          tender.amount

        return total
      },
      {
        qty: 0,
        amount: 0,
      },
    )

  return {
    success: true,

    message:
      'System Sales report generated successfully.',

    summary,
    tenders,
    tenderTotal,
  }
}