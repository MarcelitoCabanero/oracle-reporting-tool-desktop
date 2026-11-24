import {
  loadMenuItemSummary,
  loadMenuItemsBySalesType,
} from '../menuitem/menuitem.service.js'

import {
  exportMenuItemBySalesType,
  exportMenuItemSummary,
} from '../menuitem/menuitem-export.service.js'

import type {
  MenuItemDateRangeInput,
} from '../menuitem/menuitem.types.js'
import { handleIpc } from './ipc-handler.js'

export function registerMenuItemIpc() {
  console.log('Registering Menu Item IPC...')

  handleIpc(
    'menuitem:by-sales-type',
    async (_event, input: MenuItemDateRangeInput) =>
      loadMenuItemsBySalesType(input),
  )

  handleIpc(
    'menuitem:export-by-sales-type',
    async (_event, input: Parameters<typeof exportMenuItemBySalesType>[0]) =>
      exportMenuItemBySalesType(input),
  )

  handleIpc(
    'menuitem:summary',
    async (_event, input: MenuItemDateRangeInput) =>
      loadMenuItemSummary(input),
  )

  handleIpc(
    'menuitem:export-summary',
    async (_event, input: Parameters<typeof exportMenuItemSummary>[0]) =>
      exportMenuItemSummary(input),
  )
}
