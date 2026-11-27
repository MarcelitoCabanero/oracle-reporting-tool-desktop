import type {
  SystemSalesDateRangeInput,
  SystemSalesExportInput,
  SystemSalesExportResult,
  SystemSalesResult,
} from './system-sales'
import type {
  VarianceCheckingInput,
  VarianceCheckingResult,
  VarianceReceiptInput,
  VarianceReceiptResult,
} from './variance-checking'
import type {
  EmployeeOption,
  EmployeeSalesInput,
  EmployeeSalesResult,
} from './employee-sales'
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
  localLocationTableExists: boolean
  hqDbConnected: boolean
  requiresStoreSelection: boolean
  message: string
}
type DatabaseKey = 'local' | 'hq' | 'hourly'
interface DatabaseConnectionSettingsView {
  server: string
  database: string
  username: string
  password: string
  passwordConfigured: boolean
  port: number
}
interface ConnectionSettingsView {
  databases: Record<DatabaseKey, DatabaseConnectionSettingsView>
  ftp: {
    host: string
    username: string
    password: string
    passwordConfigured: boolean
    secure: boolean
  }
  encrypt: boolean
  trustServerCertificate: boolean
}
interface ConnectionTestResult {
  success: boolean
  message: string
}
interface LocationOption {
  locationId: number
  locationName: string
}
export type AppUpdateStatus = 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'idle'
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

type DepositApprovalStatus =
  | 'Not Required'
  | 'Pending'
  | 'Approved'
  | 'Rejected'

type DepositDeleteStatus =
  | 'None'
  | 'Pending Delete'
  | 'Delete Approved'
  | 'Delete Rejected'

type PettyCashStatus =
  | 'N/A'
  | 'Unreplenished'
  | 'Replenished'

type DepositThreadCategory =
  | 'PETTY_CASH'
  | 'PETTY_CASH_REPLENISH'
  | 'OPEN_SALES'
  | 'DEPT_EXPENSE'
  | 'APPROVAL'
  | 'DELETE_REQUEST'
  | 'GENERAL'

interface CreateDepositInput {
  locationName: string
  authorName?: string
  authorRole?: string
  businessDate: string
  depositDate: string
  depositReference: string
  pettyCash: number
  bir2307: number
  openSales: number
  otherDepartmentExpense: number

  localFilePath: string

  pettyCashRemarks?: string
  pettyCashAttachmentPaths?: string[]

  openSalesSourceDate?: string
  openSalesRemarks?: string

  deptExpenseDepartment?: string
  deptExpenseBorrower?: string
  deptExpenseRemarks?: string
  deptExpenseAttachmentPaths?: string[]
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

  approvalStatus: DepositApprovalStatus
  approvedBy: string
  approvedAt: string

  deleteStatus: DepositDeleteStatus
  deleteReason: string
  deleteRequestedBy: string
  deleteRequestedAt: string
  deleteApprovedBy: string
  deleteApprovedAt: string

  pettyCashStatus: PettyCashStatus
  pettyCashReplenishedAt: string

  openSalesSourceDate: string
  deptExpenseDepartment: string
  deptExpenseBorrower: string

  threadCount: number
  supportingAttachmentCount: number
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
  authorName?: string
  authorRole?: string

  depositDate: string
  depositReference: string

  pettyCash: number
  bir2307: number
  openSales: number
  otherDepartmentExpense: number

  pettyCashRemarks?: string
  pettyCashAttachmentPaths?: string[]

  openSalesSourceDate?: string
  openSalesRemarks?: string

  deptExpenseDepartment?: string
  deptExpenseBorrower?: string
  deptExpenseRemarks?: string
  deptExpenseAttachmentPaths?: string[]
}

interface UpdateDepositResult {
  success: boolean
  message: string
}

interface RequestDeleteDepositInput {
  depositId: number
  locationName: string
  authorName: string
  authorRole: string
  reason: string
}

interface RequestDeleteDepositResult {
  success: boolean
  message: string
}

interface RevertDeleteDepositInput {
  depositId: number
  locationName: string
  authorName: string
  authorRole: string
  remarks?: string
}

interface RevertDeleteDepositResult {
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

interface SelectedDepositAttachmentItem {
  filePath: string
  fileName: string
  previewDataUrl: string
}

interface SelectDepositAttachmentResult {
  canceled: boolean
  filePath: string
  fileName: string
  previewDataUrl: string
}

interface SelectMultipleDepositAttachmentsResult {
  canceled: boolean
  files: SelectedDepositAttachmentItem[]
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

interface DepositThreadAttachment {
  attachmentId: number
  depositId: number
  threadId: number | null
  category: DepositThreadCategory
  filename: string
  uploadedBy: string
  uploadedAt: string
}

interface DepositThreadEntry {
  threadId: number
  depositId: number
  category: DepositThreadCategory
  authorName: string
  authorRole: string
  message: string
  createdAt: string
  attachments: DepositThreadAttachment[]
}

interface GetDepositThreadResult {
  success: boolean
  deposit: DepositRecord | null
  threads: DepositThreadEntry[]
  message: string
}

interface AddDepositThreadReplyInput {
  depositId: number
  locationName: string
  category: DepositThreadCategory
  authorName: string
  authorRole: string
  message: string
  attachmentPaths?: string[]
}

interface AddDepositThreadReplyResult {
  success: boolean
  message: string
}

interface ReplenishPettyCashInput {
  depositId: number
  locationName: string
  authorName: string
  authorRole: string
  remarks: string
  attachmentPaths: string[]
}

interface ReplenishPettyCashResult {
  success: boolean
  message: string
}

interface DepositApprovalNotificationItem {
  depositId: number
  businessDate: string
  depositReference: string
  approvalStatus: DepositApprovalStatus
  approvedBy: string
  approvedAt: string
  deleteStatus: DepositDeleteStatus
  deleteApprovedBy: string
  deleteApprovedAt: string
  deleteReason: string
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

interface TenderListingInput {
  dateFrom: string
  dateTo: string
}

interface TenderListingRow {
  checkNumber: string
  tenderType: string
  amount: number
  reference: string
  businessDate: string
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

interface HourlyEntryRow {
  time: string
  entryDate: string
  shellQty: number | null
  ringQty: number | null
  jpopsQty: number | null
  remarks: string
}

interface CreateHourlyEntriesInput {
  kind: 'produce' | 'waste' | 'transfers'
  businessDate: string
  locationName: string
  rows: HourlyEntryRow[]
}

interface CreateHourlyEntriesResult {
  success: boolean
  insertedCount: number
  syncStatus: 'synced' | 'pending'
  message: string
}

interface HourlyQuantityTotals {
  ring: number
  shell: number
  jpops: number
  total: number
}

interface HourlyDailyRow {
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
  transfers: HourlyQuantityTotals
  ending: HourlyQuantityTotals
}

interface HourlyDailySummary {
  produced: HourlyQuantityTotals
  received: HourlyQuantityTotals
  sold: HourlyQuantityTotals
  transferred: HourlyQuantityTotals
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

interface HourlyPosSalesRow {
  businessDate: string
  hourRange: string
  ringSold: number
  shellSold: number
  jpopsSold: number
  jclubSold: number
}

interface HourlyPosWasteTotals {
  ring: number
  shell: number
  jpops: number
}

interface HourlyPosFocTotals {
  ring: number
  shell: number
  jpops: number
  jclub: number
}

interface HourlyDailyReport {
  businessDate: string
  locationName: string
  retardingProduced: HourlyQuantityTotals
  retardingReceived: HourlyQuantityTotals
  posSales?: HourlyPosSalesRow[]
  posWaste?: HourlyPosWasteTotals
  posFoc: HourlyPosFocTotals
  rows: HourlyDailyRow[]
  summary: HourlyDailySummary
}

interface HourlyDailyReportInput {
  businessDate: string
  locationName: string
}

interface HourlyRecordsInput {
  startDate: string
  endDate: string
  locationName: string
}

interface HourlySummaryInputKey {
  dateFrom: string
  dateTo: string
  locationName: string
}

interface HourlySummaryInputValues {
  promotions_ring: number | null
  promotions_shell: number | null
  training_ring: number | null
  training_shell: number | null
  staff_meal_ring: number | null
  staff_meal_shell: number | null
  waste_dough_grams_ring: number | null
  waste_dough_grams_shell: number | null
  waste_frozen_dough_ring: number | null
  waste_frozen_dough_shell: number | null
  buffer_jpops_ring: number | null
  buffer_jpops_shell: number | null
}

interface SaveHourlySummaryInput extends HourlySummaryInputKey {
  values: HourlySummaryInputValues
}

interface HourlyRecord {
  id: number
  kind: 'produce' | 'waste' | 'transfers'
  entryDate: string
  time: string
  shellQty: number
  ringQty: number
  jpopsQty: number
  remarks: string
}

interface UpdateHourlyRecordInput extends HourlyRecord {
  locationName: string
}

interface UpdateHourlyRecordResult {
  success: boolean
  syncStatus: 'synced' | 'pending'
  message: string
}


declare global {
  interface Window {
    api: {
      app: {
        getVersion: () =>
          Promise<string>
        getUpdateStatus: () => Promise<AppUpdateStatus>
        installUpdate: () => Promise<void>
        retryUpdate: () => Promise<void>
        onUpdateStatus: (callback: (status: AppUpdateStatus) => void) => () => void
      }

      auth: {
        login: (
          username: string,
          password: string,
        ) => Promise<LoginResult>
      }
      settings: {
        get: () => Promise<ConnectionSettingsView>
        unlockAdmin: (password: string) => Promise<string>
        testDatabase: (
          settings: ConnectionSettingsView,
          key: DatabaseKey,
          token?: string,
        ) => Promise<ConnectionTestResult>
        testFtp: (
          settings: ConnectionSettingsView,
          token?: string,
        ) => Promise<ConnectionTestResult>
        getLocationOptions: (
          settings: ConnectionSettingsView,
          token: string,
        ) => Promise<LocationOption[]>
        getFirstRunStoreOptions: () => Promise<LocationOption[]>
        setFirstRunStore: (locationId: number) => Promise<ConnectionTestResult>
        initializeLocalDatabase: (
          settings: ConnectionSettingsView,
        ) => Promise<ConnectionTestResult>
        setLocalStore: (
          settings: ConnectionSettingsView,
          locationId: number,
          token: string,
        ) => Promise<ConnectionTestResult>
        saveBootstrap: (settings: ConnectionSettingsView) => Promise<ConnectionTestResult>
        saveAdmin: (settings: ConnectionSettingsView, token: string) => Promise<ConnectionTestResult>
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

requestDelete: (
  input: RequestDeleteDepositInput,
) => Promise<RequestDeleteDepositResult>

revertDelete: (
  input: RevertDeleteDepositInput,
) => Promise<RevertDeleteDepositResult>

selectAttachment: () =>
  Promise<SelectDepositAttachmentResult>

selectMultipleAttachments: () =>
  Promise<SelectMultipleDepositAttachmentsResult>

getAttachment: (
  fileName: string,
) => Promise<DepositAttachmentPreviewResult>

downloadAttachment: (
  fileName: string,
) => Promise<DepositAttachmentDownloadResult>

replaceAttachment: (
  fileName: string,
) => Promise<DepositAttachmentReplaceResult>

getThread: (
  depositId: number,
  locationName: string,
) => Promise<GetDepositThreadResult>

addThreadReply: (
  input: AddDepositThreadReplyInput,
) => Promise<AddDepositThreadReplyResult>

replenishPettyCash: (
  input: ReplenishPettyCashInput,
) => Promise<ReplenishPettyCashResult>

getNotifications: (
  locationName: string,
) => Promise<DepositApprovalNotificationItem[]>

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

tenderListing: {
  generate: (input: TenderListingInput) => Promise<TenderListingRow[]>
}

maintenance: {
  getFtpConfig: () => Promise<FtpConfig>
  testFtp: (config: FtpConfig) => Promise<MaintenanceResult>
  saveFtp: (config: FtpConfig) => Promise<MaintenanceResult>
  loadMissingItems: () => Promise<MissingMenuItem[]>
  syncItems: (rows: MissingMenuItem[]) => Promise<MaintenanceResult>
}

systemSales: {
  workstations: () => Promise<string[]>
  generate: (
    input: SystemSalesDateRangeInput,
  ) => Promise<SystemSalesResult>

  exportExcel: (
    input: SystemSalesExportInput,
  ) => Promise<SystemSalesExportResult>

  exportPdf: (
    input: SystemSalesExportInput,
  ) => Promise<SystemSalesExportResult>
}

hourlySales: {
  getDailyReport: (
    input: HourlyDailyReportInput,
  ) => Promise<HourlyDailyReport>
  createEntries: (
    input: CreateHourlyEntriesInput,
  ) => Promise<CreateHourlyEntriesResult>
  getRecords: (
    input: HourlyRecordsInput,
  ) => Promise<HourlyRecord[]>
  updateRecord: (
    input: UpdateHourlyRecordInput,
  ) => Promise<UpdateHourlyRecordResult>
  getSummaryInput: (input: HourlySummaryInputKey) => Promise<{ found: boolean; values: HourlySummaryInputValues }>
  saveSummaryInput: (input: SaveHourlySummaryInput) => Promise<string | null>
}

varianceChecking: {
  generate: (input: VarianceCheckingInput) => Promise<VarianceCheckingResult>
  receipt: (input: VarianceReceiptInput) => Promise<VarianceReceiptResult>
}

employeeSales: {
  employees: () => Promise<EmployeeOption[]>
  generate: (input: EmployeeSalesInput) => Promise<EmployeeSalesResult>
  generateAll: (input: { dateFrom: string; dateTo: string }) => Promise<EmployeeSalesResult[]>
  exportExcel: (input: { report: EmployeeSalesResult }) => Promise<{ success: boolean; canceled: boolean; message: string }>
  exportPdf: (input: { report: EmployeeSalesResult }) => Promise<{ success: boolean; canceled: boolean; message: string }>
}
voidSummary: {
  generate: (input: import('./void-summary').VoidSummaryInput) => Promise<import('./void-summary').VoidSummaryResult>
  exportExcel: (input: import('./void-summary').VoidSummaryExportInput) => Promise<import('./void-summary').VoidSummaryExportResult>
  exportPdf: (input: import('./void-summary').VoidSummaryExportInput) => Promise<import('./void-summary').VoidSummaryExportResult>
}
scPwd: { generate: (input: { dateFrom: string; dateTo: string; type: string }) => Promise<Array<Record<string, unknown>>>; exportExcel: (input: unknown) => Promise<{ success: boolean; canceled: boolean; message: string }>; exportPdf: (input: unknown) => Promise<{ success: boolean; canceled: boolean; message: string }> }
salesTarget: {
  load: (input: { targetYear: number; targetQuarter: number }) => Promise<import('../../electron/sales-target/sales-target.repository').SalesTargetLoadResult>
  exportWorksheetExcel: (input: unknown) => Promise<{ success: boolean; canceled: boolean; message: string; filePath?: string }>
  exportWorksheetPdf: (input: unknown) => Promise<{ success: boolean; canceled: boolean; message: string; filePath?: string }>
  exportAnalyticsExcel: (input: unknown) => Promise<{ success: boolean; canceled: boolean; message: string; filePath?: string }>
  exportAnalyticsPdf: (input: unknown) => Promise<{ success: boolean; canceled: boolean; message: string; filePath?: string }>
}
financeInsight: {
  load: (input: { dateFrom: string; dateTo: string }) => Promise<import('../../electron/finance-insight/finance-insight.repository').FinanceInsightLoadResult>
}
dashboard: {
  load: (input?: { locationName?: string }) => Promise<import('../../electron/dashboard/dashboard.repository').DashboardLoadResult>
}


    }
  }
}
