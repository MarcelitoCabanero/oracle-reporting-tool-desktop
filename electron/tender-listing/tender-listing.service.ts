import { getTenderListing } from './tender-listing.repository.js'
import type { TenderListingInput } from './tender-listing.repository.js'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export async function generateTenderListing(input: TenderListingInput) {
  if (!isValidDate(input.dateFrom) || !isValidDate(input.dateTo)) {
    throw new Error('Select valid From and To dates.')
  }
  if (input.dateFrom > input.dateTo) {
    throw new Error('From date cannot be later than To date.')
  }
  return getTenderListing(input.dateFrom, input.dateTo)
}
