import {
  ipcMain,
} from 'electron'

import {
  createHourlyEntries,
  getHourlyDailyReport,
} from '../hourly-sales/hourly-sales.service.js'

import type {
  CreateHourlyEntriesInput,
  HourlyDailyReportInput,
} from '../hourly-sales/hourly-sales.types.js'

export function registerHourlySalesIpc() {
  ipcMain.handle(
    'hourly-sales:get-daily-report',
    async (_event, input: HourlyDailyReportInput) =>
      getHourlyDailyReport(input),
  )

  ipcMain.handle(
    'hourly-sales:create-entries',
    async (_event, input: CreateHourlyEntriesInput) =>
      createHourlyEntries(input),
  )
}