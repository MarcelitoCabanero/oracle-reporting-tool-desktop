import {
  ipcMain,
} from 'electron'

import {
  createHourlyEntries,
  editHourlyRecord,
  getHourlyRecords,
  getHourlyDailyReport,
} from '../hourly-sales/hourly-sales.service.js'

import type {
  CreateHourlyEntriesInput,
  HourlyDailyReportInput,
  HourlyRecordsInput,
  UpdateHourlyRecordInput,
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

  ipcMain.handle(
    'hourly-sales:get-records',
    async (_event, input: HourlyRecordsInput) =>
      getHourlyRecords(input),
  )

  ipcMain.handle(
    'hourly-sales:update-record',
    async (_event, input: UpdateHourlyRecordInput) =>
      editHourlyRecord(input),
  )
}