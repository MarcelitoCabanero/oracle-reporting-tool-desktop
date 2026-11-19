export type DepositApprovalStatus =
  | 'Not Required'
  | 'Pending'
  | 'Approved'
  | 'Rejected'

export type DepositDeleteStatus =
  | 'None'
  | 'Pending Delete'
  | 'Delete Approved'
  | 'Delete Rejected'

export type PettyCashStatus =
  | 'N/A'
  | 'Unreplenished'
  | 'Replenished'

export type DepositThreadCategory =
  | 'PETTY_CASH'
  | 'PETTY_CASH_REPLENISH'
  | 'OPEN_SALES'
  | 'DEPT_EXPENSE'
  | 'APPROVAL'
  | 'DELETE_REQUEST'
  | 'GENERAL'

export interface CreateDepositInput {
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

  // Local file path returned by Electron's file picker for main deposit slip.
  localFilePath: string

  // Category-specific monitoring fields
  pettyCashRemarks?: string
  pettyCashAttachmentPaths?: string[]

  openSalesSourceDate?: string
  openSalesRemarks?: string

  deptExpenseDepartment?: string
  deptExpenseBorrower?: string
  deptExpenseRemarks?: string
  deptExpenseAttachmentPaths?: string[]
}

export interface InitialDepositThreadInsert {
  category: DepositThreadCategory
  authorName: string
  authorRole: string
  message: string
  filenames: string[]
}

export interface DepositInsert {
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

  filename: string

  approvalStatus: DepositApprovalStatus
  pettyCashStatus: PettyCashStatus
  openSalesSourceDate: string | null
  deptExpenseDepartment: string | null
  deptExpenseBorrower: string | null

  initialThreads: InitialDepositThreadInsert[]
}

export interface SaveDepositResult {
  success: boolean
  depositId?: number
  message: string
}

export interface DepositStatus {
  exists: boolean
  depositId: number | null
}

export interface DepositRecord {
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

export interface DepositListInput {
  locationName: string
  page: number
  pageSize: number
  keyword?: string
  month?: number
  year?: number
}

export interface DepositListResult {
  success: boolean
  rows: DepositRecord[]
  totalRecords: number
  totalPages: number
  message: string
}

export interface UpdateDepositInput {
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

export interface UpdateDepositResult {
  success: boolean
  message: string
}

export interface RequestDeleteDepositInput {
  depositId: number
  locationName: string
  authorName: string
  authorRole: string
  reason: string
}

export interface RequestDeleteDepositResult {
  success: boolean
  message: string
}

export interface RevertDeleteDepositInput {
  depositId: number
  locationName: string
  authorName: string
  authorRole: string
  remarks?: string
}

export interface RevertDeleteDepositResult {
  success: boolean
  message: string
}

export interface DeleteDepositResult {
  success: boolean
  message: string
}

export interface GetDepositResult {
  success: boolean
  deposit: DepositRecord | null
  message: string
}

export interface DepositThreadAttachment {
  attachmentId: number
  depositId: number
  threadId: number | null
  category: DepositThreadCategory
  filename: string
  uploadedBy: string
  uploadedAt: string
}

export interface DepositThreadEntry {
  threadId: number
  depositId: number
  category: DepositThreadCategory
  authorName: string
  authorRole: string
  message: string
  createdAt: string
  attachments: DepositThreadAttachment[]
}

export interface GetDepositThreadResult {
  success: boolean
  deposit: DepositRecord | null
  threads: DepositThreadEntry[]
  message: string
}

export interface AddDepositThreadReplyInput {
  depositId: number
  locationName: string
  category: DepositThreadCategory
  authorName: string
  authorRole: string
  message: string
  attachmentPaths?: string[]
}

export interface AddDepositThreadReplyResult {
  success: boolean
  message: string
}

export interface ReplenishPettyCashInput {
  depositId: number
  locationName: string
  authorName: string
  authorRole: string
  remarks: string
  attachmentPaths: string[]
}

export interface ReplenishPettyCashResult {
  success: boolean
  message: string
}

export interface DepositApprovalNotificationItem {
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
