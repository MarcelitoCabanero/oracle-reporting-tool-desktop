import { ipcMain } from 'electron'

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

export function registerMenuItemIpc() {
  console.log('Registering Menu Item IPC...')

  ipcMain.handle(
    'menuitem:by-sales-type',
    async (_event, input: MenuItemDateRangeInput) =>
      loadMenuItemsBySalesType(input),
  )

  ipcMain.handle(
  'menuitem:export-by-sales-type',
  async (_event, input) =>
    exportMenuItemBySalesType(input),
)

  ipcMain.handle(
    'menuitem:summary',
    async (_event, input: MenuItemDateRangeInput) =>
      loadMenuItemSummary(input),
  )
  
ipcMain.handle(
  'menuitem:export-summary',
  async (_event, input) =>
    exportMenuItemSummary(input),
)

}
