import { loadVoidSummaryReportData } from './void-summary.repository.js'
import type { VoidSummaryInput, VoidSummaryResult } from './void-summary.types.js'

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

export async function generateVoidSummaryReport(
  input: VoidSummaryInput,
): Promise<VoidSummaryResult> {
  if (!input || !isValidDate(input.dateFrom) || !isValidDate(input.dateTo)) {
    throw new Error('Please select a valid date range.')
  }
  if (input.dateFrom > input.dateTo) {
    throw new Error('From date cannot be later than To date.')
  }

  const data = await loadVoidSummaryReportData(input)
  return {
    success: true,
    message: 'Void Summary report generated successfully.',
    ...data,
  }
}
