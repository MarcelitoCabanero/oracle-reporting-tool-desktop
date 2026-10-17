export type HourlyEntryKind = 'produce' | 'waste'

export interface HourlyEntryRow {
  time: string
  entryDate: string
  shellQty: number | null
  ringQty: number | null
  jpopsQty: number | null
  remarks: string
}

export interface CreateHourlyEntriesInput {
  kind: HourlyEntryKind
  businessDate: string
  locationName: string
  rows: HourlyEntryRow[]
}

export interface CreateHourlyEntriesResult {
  success: boolean
  insertedCount: number
  message: string
}

export interface HourlyDailyReportInput {
  businessDate: string
  locationName: string
}

export interface HourlyRecordsInput {
  startDate: string
  endDate: string
  locationName: string
}

export interface HourlyRecord {
  id: number
  kind: HourlyEntryKind
  entryDate: string
  time: string
  shellQty: number
  ringQty: number
  jpopsQty: number
  remarks: string
}

export interface UpdateHourlyRecordInput extends Omit<HourlyRecord, 'id'> {
  id: number
  locationName: string
}

export interface UpdateHourlyRecordResult {
  success: boolean
  message: string
}

export interface HourlyReportSourceRow {
  time: string
  remarks: string
  shellQty: number
  ringQty: number
  jpopsQty: number
}

export interface HourlySalesSourceRow {
  hourRange: string
  ringSold: number
  shellSold: number
  jpopsSold: number
  jclubSold: number
}

export interface HourlyPosSalesRow extends HourlySalesSourceRow {
  businessDate: string
}

export interface HourlyPosWasteTotals {
  ring: number
  shell: number
  jpops: number
}

export interface HourlyReportSources {
  produce: HourlyReportSourceRow[]
  waste: HourlyReportSourceRow[]
  sales: HourlySalesSourceRow[]
  posWaste: HourlyPosWasteTotals
}

export interface HourlyQuantityTotals {
  ring: number
  shell: number
  jpops: number
  total: number
}

export interface HourlyDailyRow {
  hourRange: string
  opening: HourlyQuantityTotals
  received: HourlyQuantityTotals
  produced: HourlyQuantityTotals
  proofingWaste: HourlyQuantityTotals
  proofingGood: HourlyQuantityTotals
  proofingWasteRate: number
  fryingWaste: HourlyQuantityTotals
  fryingGood: HourlyQuantityTotals
  fryingWasteRate: number
  toppingWaste: HourlyQuantityTotals
  toppingGood: HourlyQuantityTotals
  toppingWasteRate: number
  sold: HourlyQuantityTotals
  ending: HourlyQuantityTotals
}

export interface HourlyDailySummary {
  produced: HourlyQuantityTotals
  received: HourlyQuantityTotals
  sold: HourlyQuantityTotals
  netProducedSales: HourlyQuantityTotals
  variance: HourlyQuantityTotals
  tolerableVariance: number
  proofingWaste: HourlyQuantityTotals
  fryingWaste: HourlyQuantityTotals
  toppingWaste: HourlyQuantityTotals
  totalWaste: HourlyQuantityTotals
  tolerableWaste: number
  excessWaste: number
  excessWasteEquivalent: number
  endingInventory: HourlyQuantityTotals
  salesAllocation: number
  wasteAllocation: number
  varianceAllocation: number
}

export interface HourlyDailyReport {
  businessDate: string
  locationName: string
  retardingProduced: HourlyQuantityTotals
  retardingReceived: HourlyQuantityTotals
  posSales: HourlyPosSalesRow[]
  posWaste: HourlyPosWasteTotals
  rows: HourlyDailyRow[]
  summary: HourlyDailySummary
}