import { handleIpc } from './ipc-handler.js'

import {
  createHourlyEntries,
  editHourlyRecord,
  getHourlyRecords,
  getHourlyDailyReport,
} from '../hourly-sales/hourly-sales.service.js'
import {
  loadHourlySummaryInput,
  saveHourlySummaryInput,
} from '../hourly-sales/hourly-summary.repository.js'
import type {
  HourlySummaryInputKey,
  SaveHourlySummaryInput,
} from '../hourly-sales/hourly-summary.repository.js'

import type {
  CreateHourlyEntriesInput,
  HourlyDailyReportInput,
  HourlyRecordsInput,
  UpdateHourlyRecordInput,
} from '../hourly-sales/hourly-sales.types.js'

export function registerHourlySalesIpc() {
  handleIpc(
    'hourly-sales:get-daily-report',
    async (_event, input: HourlyDailyReportInput) =>
      getHourlyDailyReport(input),
  )

  handleIpc(
    'hourly-sales:create-entries',
    async (_event, input: CreateHourlyEntriesInput) =>
      createHourlyEntries(input),
  )

  handleIpc(
    'hourly-sales:get-records',
    async (_event, input: HourlyRecordsInput) =>
      getHourlyRecords(input),
  )

  handleIpc(
    'hourly-sales:update-record',
    async (_event, input: UpdateHourlyRecordInput) =>
      editHourlyRecord(input),
  )

  handleIpc(
    'hourly-sales:get-summary-input',
    async (_event, input: HourlySummaryInputKey) => loadHourlySummaryInput(input),
  )

  handleIpc(
    'hourly-sales:save-summary-input',
    async (_event, input: SaveHourlySummaryInput) => saveHourlySummaryInput(input),
  )
}
