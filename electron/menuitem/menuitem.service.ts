import {
  getMenuItemSummary,
  getMenuItemsBySalesType,
} from './menuitem.repository.js'

import type {
  MenuItemBySalesTypeResult,
  MenuItemDateRangeInput,
  MenuItemSummaryResult,
  MenuItemTotals,
} from './menuitem.types.js'

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime())
}

function validateRange(
  input: MenuItemDateRangeInput,
): string | null {
  if (!validDate(input.dateFrom)) return 'From Date is invalid.'
  if (!validDate(input.dateTo)) return 'To Date is invalid.'
  if (input.dateTo < input.dateFrom) {
    return 'To Date cannot be earlier than From Date.'
  }
  return null
}

function totals(
  rows: Array<{
    qty: number
    grossAmount: number
    itemDiscount: number
    netSales: number
  }>,
): MenuItemTotals {
  return rows.reduce(
    (sum, row) => ({
      qty: sum.qty + row.qty,
      grossAmount: sum.grossAmount + row.grossAmount,
      itemDiscount: sum.itemDiscount + row.itemDiscount,
      netSales: sum.netSales + row.netSales,
    }),
    {
      qty: 0,
      grossAmount: 0,
      itemDiscount: 0,
      netSales: 0,
    },
  )
}

export async function loadMenuItemsBySalesType(
  input: MenuItemDateRangeInput,
): Promise<MenuItemBySalesTypeResult> {
  const error = validateRange(input)

  if (error) {
    return {
      success: false,
      message: error,
      rows: [],
      totals: totals([]),
    }
  }

  try {
    const rows = await getMenuItemsBySalesType(
      input.dateFrom,
      input.dateTo,
    )

    return {
      success: true,
      message:
        rows.length === 0
          ? 'No Menu Item by Sales Type records found.'
          : `${rows.length} Menu Item by Sales Type record(s) found.`,
      rows,
      totals: totals(rows),
    }
  } catch (error) {
    console.error('Load Menu Item by Sales Type failed:', error)

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to load Menu Item by Sales Type.',
      rows: [],
      totals: totals([]),
    }
  }
}

export async function loadMenuItemSummary(
  input: MenuItemDateRangeInput,
): Promise<MenuItemSummaryResult> {
  const error = validateRange(input)

  if (error) {
    return {
      success: false,
      message: error,
      rows: [],
      totals: totals([]),
      majorGroups: [],
    }
  }

  try {
    const rows = await getMenuItemSummary(
      input.dateFrom,
      input.dateTo,
    )

    const majorGroups = Array.from(
      new Set(
        rows
          .map((row) => row.majorGroup.trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b))

    return {
      success: true,
      message:
        rows.length === 0
          ? 'No Menu Item Summary records found.'
          : `${rows.length} Menu Item Summary record(s) found.`,
      rows,
      totals: totals(rows),
      majorGroups,
    }
  } catch (error) {
    console.error('Load Menu Item Summary failed:', error)

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to load Menu Item Summary.',
      rows: [],
      totals: totals([]),
      majorGroups: [],
    }
  }
}
