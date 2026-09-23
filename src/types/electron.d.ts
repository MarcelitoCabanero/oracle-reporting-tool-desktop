import type {
  SystemSalesDateRangeInput,
  SystemSalesResult,
} from './system-sales'

export {}

interface LoginUser {
  username: string
  displayName: string
  role: string
  locationName: string
  locationId: string
}

interface LoginResult {
  success: boolean
  user?: LoginUser
  message?: string
}

interface SystemHealthResult {
  ready: boolean
  localDbConnected: boolean
  hqDbConnected: boolean
  message: string
}
interface VersionCheckResult {
  success: boolean
  currentVersion: string
  latestVersion: string | null
  updateAvailable: boolean
  message: string
}
interface RofCashSource {
  cashierName: string
  tenderName: string
  posAmount: number
}

interface RofNonCashSource {
  tenderName: string
  posAmount: number
}

interface RofCashEntry {
  cashierName: string
  tenderName: string
  posAmount: number
  actualAmount: number
  mod: string
  remarks: string
}

interface RofNonCashEntry {
  tenderName: string
  posAmount: number
  actualAmount: number
  remarks: string
}

interface SaveRofInput {
  businessDate: string
  locationName: string
  cash: RofCashEntry[]
  nonCash: RofNonCashEntry[]
}

interface SaveRofResult {
  success: boolean
  rofId?: number
  message: string
}

interface RofSourceResult {
  businessDate: string
  exists: boolean
  rofId: number | null
  cash: RofCashSource[]
  nonCash: RofNonCashSource[]
}

interface RofDetails {
  exists: boolean
  businessDate: string
  cash: RofCashEntry[]
  nonCash: RofNonCashEntry[]
}
interface DeleteRofResult {
  success: boolean
  message: string
}

interface RofSummaryRow {
  businessDate: string
  locationName: string
  netSalesVat: number
  vat: number
  netSales: number
  gcSales: number
  cash: number
  nonCash: number
  variance: number
  cashRemarks: string
  nonCashRemarks: string
}

interface RofSummaryResult {
  success: boolean
  rows: RofSummaryRow[]
  message: string
}

interface RofDepositSource {
  exists: boolean
  businessDate: string
  rofId: number | null
  posAmount: number
  actualAmount: number
  message: string
}

interface CreateDepositInput {
  locationName: string
  businessDate: string
  depositDate: string
  depositReference: string
  pettyCash: number
  bir2307: number
  openSales: number
  otherDepartmentExpense: number

  localFilePath: string
}


interface SaveDepositResult {
  success: boolean
  depositId?: number
  message: string
}

interface DepositStatus {
  exists: boolean
  depositId: number | null
}
interface DepositRecord {
  depositId: number
  locationName: string
  businessDate: string
  depositDate: string
  depositReference: string

  posAmount: number
  depositAmount: number
  pettyCash: number
  bir2307: number
  openSales: number
  otherDepartmentExpense: number

  variance: number
  filename: string
}

interface DepositListInput {
  locationName: string
  page: number
  pageSize: number
  keyword?: string
  month?: number
  year?: number
}

interface DepositListResult {
  success: boolean
  rows: DepositRecord[]
  totalRecords: number
  totalPages: number
  message: string
}

interface UpdateDepositInput {
  depositId: number
  locationName: string

  depositDate: string
  depositReference: string

  pettyCash: number
  bir2307: number
  openSales: number
  otherDepartmentExpense: number
}

interface UpdateDepositResult {
  success: boolean
  message: string
}

interface DeleteDepositResult {
  success: boolean
  message: string
}

interface GetDepositResult {
  success: boolean
  deposit: DepositRecord | null
  message: string
}

interface SelectDepositAttachmentResult {
  canceled: boolean
  filePath: string
  fileName: string
  previewDataUrl: string
}

interface DepositAttachmentPreviewResult {
  success: boolean
  fileName: string
  previewDataUrl: string
  message: string
}

interface DepositAttachmentDownloadResult {
  success: boolean
  canceled: boolean
  savedPath: string
  message: string
}

interface DepositAttachmentReplaceResult {
  success: boolean
  canceled: boolean
  previewDataUrl: string
  message: string
}

interface MenuItemDateRangeInput {
  dateFrom: string
  dateTo: string
}

interface MenuItemBySalesTypeRow {
  itemNumber: string
  itemName: string
  qty: number
  grossAmount: number
  itemDiscount: number
  netSales: number
  salesType: string
}

interface MenuItemSummaryRow {
  itemNumber: string
  itemName: string
  qty: number
  grossAmount: number
  itemDiscount: number
  netSales: number
  majorGroup: string
  familyGroup: string
}

interface MenuItemTotals {
  qty: number
  grossAmount: number
  itemDiscount: number
  netSales: number
}

interface MenuItemBySalesTypeResult {
  success: boolean
  message: string
  rows: MenuItemBySalesTypeRow[]
  totals: MenuItemTotals
}

interface MenuItemSummaryResult {
  success: boolean
  message: string
  rows: MenuItemSummaryRow[]
  totals: MenuItemTotals
  majorGroups: string[]
}
interface MenuItemExportResult {
  success: boolean
  canceled: boolean
  message: string
  filePath?: string
}

interface PosJournalRecord {
  posJournalLogId: number
  journalId: number
  checkNum: number
  transDateTime: string
  chkOpenDateTime: string
  journalText: string
}

interface PosJournalExportResult {
  success: boolean
  message: string
}

interface FtpConfig {
  host: string
  username: string
  password: string
}

interface MissingMenuItem {
  itemnumber: string
  itemname: string
  transtype: string
  majorgroup: string
  familygroup: string
}

interface MaintenanceResult {
  success: boolean
  message: string
}


declare global {
  interface Window {
    api: {
      app: {
        getVersion: () =>
          Promise<string>
      }

      auth: {
        login: (
          username: string,
          password: string,
        ) => Promise<LoginResult>
      }
        system: {
    healthCheck: () => Promise<SystemHealthResult>
      checkVersion:
    () => Promise<VersionCheckResult>
  }
  loadSummary: (
  dateFrom: string,
  dateTo: string,
  locationName: string,
) => Promise<RofSummaryResult>

rof: {
  loadSource: (
    businessDate: string,
  ) => Promise<RofSourceResult>

  loadDetails: (
    businessDate: string,
  ) => Promise<RofDetails>

  loadSummary: (
    dateFrom: string,
    dateTo: string,
    locationName: string,
  ) => Promise<RofSummaryResult>

  create: (
    input: SaveRofInput,
  ) => Promise<SaveRofResult>

  delete: (
    businessDate: string,
  ) => Promise<DeleteRofResult>

getDepositSource: (
  businessDate: string,
) => Promise<RofDepositSource>

}
deposit: {
  checkStatus: (
    businessDate: string,
    locationName: string,
  ) => Promise<DepositStatus>

  create: (
    input: CreateDepositInput,
  ) => Promise<SaveDepositResult>

list: (
  input: DepositListInput,
) => Promise<DepositListResult>

getById: (
  depositId: number,
  locationName: string,
) => Promise<GetDepositResult>

update: (
  input: UpdateDepositInput,
) => Promise<UpdateDepositResult>

delete: (
  depositId: number,
  locationName: string,
) => Promise<DeleteDepositResult>

selectAttachment: () =>
  Promise<SelectDepositAttachmentResult>

getAttachment: (
  fileName: string,
) => Promise<DepositAttachmentPreviewResult>

downloadAttachment: (
  fileName: string,
) => Promise<DepositAttachmentDownloadResult>

replaceAttachment: (
  fileName: string,
) => Promise<DepositAttachmentReplaceResult>

}

menuItem: {
  getBySalesType: (
    input: MenuItemDateRangeInput,
  ) => Promise<MenuItemBySalesTypeResult>

  getSummary: (
    input: MenuItemDateRangeInput,
  ) => Promise<MenuItemSummaryResult>

  exportBySalesType: (
  input: {
    dateFrom: string
    dateTo: string
    rows: MenuItemBySalesTypeRow[]
    salesTypeFilter?: string
  },
) => Promise<MenuItemExportResult>

exportSummary: (
  input: {
    dateFrom: string
    dateTo: string
    rows: MenuItemSummaryRow[]
    majorGroupFilter?: string
  },
) => Promise<MenuItemExportResult>


}

posJournal: {
  load: (
    businessDate: string,
  ) => Promise<PosJournalRecord[]>

  loadByCheckNumber: (
    checkNumber: string,
  ) => Promise<PosJournalRecord[]>

  exportPdf: (
    checkNumber: string,
  ) => Promise<PosJournalExportResult>
}

maintenance: {
  getFtpConfig: () => Promise<FtpConfig>
  testFtp: (config: FtpConfig) => Promise<MaintenanceResult>
  saveFtp: (config: FtpConfig) => Promise<MaintenanceResult>
  loadMissingItems: () => Promise<MissingMenuItem[]>
  syncItems: (rows: MissingMenuItem[]) => Promise<MaintenanceResult>
}

systemSales: {
  generate: (
    input: SystemSalesDateRangeInput,
  ) => Promise<SystemSalesResult>
}

    }
  }
}