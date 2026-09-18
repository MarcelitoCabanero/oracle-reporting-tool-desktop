import {
  getPosJournalByCheckNumber,
  getPosJournals,
} from './pos-journal.repository.js'

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export async function loadPosJournals(
  businessDate: string,
) {
  if (!isValidDate(businessDate)) {
    throw new Error('Invalid journal date.')
  }

  return getPosJournals(businessDate)
}

export async function loadPosJournalByCheckNumber(
  value: string,
) {
  const checkNumber = Number(value)

  if (!Number.isInteger(checkNumber) || checkNumber <= 0) {
    throw new Error('Enter a valid check number.')
  }

  return getPosJournalByCheckNumber(checkNumber)
}
