import {
  addDepositThreadEntry,
  deleteDeposit,
  getDepositById,
  getDeposits,
  getDepositStatus,
  getDepositSupportingFilenames,
  getDepositThreadEntries,
  replenishDepositPettyCash,
  saveDeposit,
  updateDeposit,
} from './deposit.repository.js'

import {
  getDepositSource,
} from '../rof/rof.service.js'

import {
  deleteDepositImage,
  uploadDepositImage,
  validateDepositImagePath,
} from '../ftp/ftp.service.js'

import type {
  AddDepositThreadReplyInput,
  AddDepositThreadReplyResult,
  CreateDepositInput,
  DeleteDepositResult,
  DepositApprovalStatus,
  DepositInsert,
  DepositListInput,
  DepositListResult,
  GetDepositResult,
  GetDepositThreadResult,
  InitialDepositThreadInsert,
  PettyCashStatus,
  ReplenishPettyCashInput,
  ReplenishPettyCashResult,
  SaveDepositResult,
  UpdateDepositInput,
  UpdateDepositResult,
} from './deposit.types.js'

function isValidDate(
  value: string,
): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  )
}

function validNumber(
  value: number,
): boolean {
  return (
    Number.isFinite(value) &&
    value >= 0
  )
}

function formatAmount(value: number): string {
  return value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

async function cleanupUploadedFiles(
  fileNames: string[],
): Promise<void> {
  for (const fileName of fileNames) {
    try {
      await deleteDepositImage(fileName)
    } catch (cleanupError) {
      console.error(
        `FTP cleanup failed for ${fileName}:`,
        cleanupError,
      )
    }
  }
}

export async function createDeposit(
  input: CreateDepositInput,
): Promise<SaveDepositResult> {
  const uploadedFileNames: string[] = []

  try {
    const locationName =
      input.locationName.trim()
    const authorName =
      input.authorName?.trim() ||
      locationName
    const authorRole =
      input.authorRole?.trim() ||
      'Store'

    if (!locationName) {
      return {
        success: false,
        message:
          'Location is required.',
      }
    }

    if (
      !isValidDate(
        input.businessDate,
      )
    ) {
      return {
        success: false,
        message:
          'Invalid business date.',
      }
    }

    if (
      !isValidDate(
        input.depositDate,
      )
    ) {
      return {
        success: false,
        message:
          'Invalid deposit date.',
      }
    }

    if (
      !input.depositReference.trim()
    ) {
      return {
        success: false,
        message:
          'Deposit Ref# is required.',
      }
    }

    const numericValues = [
      input.pettyCash,
      input.bir2307,
      input.openSales,
      input.otherDepartmentExpense,
    ]

    if (
      numericValues.some(
        (value) =>
          !validNumber(
            value,
          ),
      )
    ) {
      return {
        success: false,
        message:
          'Deposit amounts cannot be negative or invalid.',
      }
    }

    if (
      !input.localFilePath.trim()
    ) {
      return {
        success: false,
        message:
          'Please select a deposit attachment.',
      }
    }

    // Validate main deposit image path
    const mainFileName =
      validateDepositImagePath(
        input.localFilePath,
      )

    // ---------------------------------------------------------
    // 1. Validate Petty Cash Requirements
    // ---------------------------------------------------------
    const pettyCashRemarks =
      input.pettyCashRemarks?.trim() ?? ''
    const pettyCashPaths =
      (input.pettyCashAttachmentPaths ?? [])
        .map((item) => item.trim())
        .filter(Boolean)

    if (input.pettyCash > 0) {
      if (!pettyCashRemarks) {
        return {
          success: false,
          message:
            'Petty Cash remarks are required when Petty Cash amount is greater than 0.',
        }
      }

      if (pettyCashPaths.length === 0) {
        return {
          success: false,
          message:
            'Please attach at least one supporting document (voucher/receipt) for Petty Cash.',
        }
      }
    }

    // ---------------------------------------------------------
    // 2. Validate Open Sales (Borrowed Funds) Requirements
    // ---------------------------------------------------------
    const openSalesSourceDate =
      input.openSalesSourceDate?.trim() ?? ''
    const openSalesRemarks =
      input.openSalesRemarks?.trim() ?? ''

    if (input.openSales > 0) {
      if (
        !openSalesSourceDate ||
        !isValidDate(openSalesSourceDate)
      ) {
        return {
          success: false,
          message:
            'Please select the Business Date where Open Sales funds were borrowed from.',
        }
      }

      if (openSalesSourceDate === input.businessDate) {
        return {
          success: false,
          message:
            'Open Sales borrowed date must be different from the current deposit Business Date.',
        }
      }

      const sourceDateDepositStatus =
        await getDepositStatus(
          openSalesSourceDate,
          locationName,
        )

      if (sourceDateDepositStatus.exists) {
        return {
          success: false,
          message:
            `Cannot borrow Open Sales from ${openSalesSourceDate} because its deposit slip has already been deposited.`,
        }
      }

      if (!openSalesRemarks) {
        return {
          success: false,
          message:
            'Open Sales remarks are required when Open Sales amount is greater than 0.',
        }
      }
    }

    // ---------------------------------------------------------
    // 3. Validate Other Department Expense Requirements
    // ---------------------------------------------------------
    const deptExpenseDepartment =
      input.deptExpenseDepartment?.trim() ?? ''
    const deptExpenseBorrower =
      input.deptExpenseBorrower?.trim() ?? ''
    const deptExpenseRemarks =
      input.deptExpenseRemarks?.trim() ?? ''
    const deptExpensePaths =
      (input.deptExpenseAttachmentPaths ?? [])
        .map((item) => item.trim())
        .filter(Boolean)

    if (input.otherDepartmentExpense > 0) {
      if (!deptExpenseDepartment) {
        return {
          success: false,
          message:
            'Department Name is required when Other Department Expense is greater than 0.',
        }
      }

      if (!deptExpenseBorrower) {
        return {
          success: false,
          message:
            'Borrower / Person Name is required when Other Department Expense is greater than 0.',
        }
      }

      if (!deptExpenseRemarks) {
        return {
          success: false,
          message:
            'Purpose / Remarks are required when Other Department Expense is greater than 0.',
        }
      }

      if (deptExpensePaths.length === 0) {
        return {
          success: false,
          message:
            'Please attach at least one supporting document for Other Department Expense.',
        }
      }
    }

    // Validate all supporting file paths and ensure no duplicate filenames in the same submission
    const seenBaseNames = new Set<string>([
      mainFileName.toLowerCase(),
    ])

    for (const filePath of [
      ...pettyCashPaths,
      ...deptExpensePaths,
    ]) {
      const baseName =
        validateDepositImagePath(filePath)
      const lower =
        baseName.toLowerCase()

      if (seenBaseNames.has(lower)) {
        return {
          success: false,
          message:
            `Duplicate attachment filename "${baseName}" selected. Please use distinct filenames for each attachment.`,
        }
      }

      seenBaseNames.add(lower)
    }

    // Get trusted ROF totals from LocalDB.
    const rofSource =
      await getDepositSource(
        input.businessDate,
      )

    if (!rofSource.exists) {
      return {
        success: false,
        message:
          rofSource.message,
      }
    }

    if (
      !validNumber(
        rofSource.posAmount,
      ) ||
      !validNumber(
        rofSource.actualAmount,
      )
    ) {
      return {
        success: false,
        message:
          'ROF contains invalid cash totals.',
      }
    }

    if (
      rofSource.posAmount <= 0
    ) {
      return {
        success: false,
        message:
          'ROF POS amount is required.',
      }
    }

    // Check duplicate before uploading.
    const status =
      await getDepositStatus(
        input.businessDate,
        locationName,
      )

    if (status.exists) {
      return {
        success: false,
        message:
          'This Business Date is already saved.',
      }
    }

    // Upload main deposit attachment first.
    const uploadedMainFileName =
      await uploadDepositImage(
        input.localFilePath,
      )
    uploadedFileNames.push(uploadedMainFileName)

    // Upload Petty Cash supporting documents
    const uploadedPettyCashFiles: string[] = []
    for (const filePath of pettyCashPaths) {
      const uploadedName =
        await uploadDepositImage(filePath)
      uploadedFileNames.push(uploadedName)
      uploadedPettyCashFiles.push(uploadedName)
    }

    // Upload Dept Expense supporting documents
    const uploadedDeptExpenseFiles: string[] = []
    for (const filePath of deptExpensePaths) {
      const uploadedName =
        await uploadDepositImage(filePath)
      uploadedFileNames.push(uploadedName)
      uploadedDeptExpenseFiles.push(uploadedName)
    }

    const requiresApproval =
      input.pettyCash > 0 ||
      input.openSales > 0 ||
      input.otherDepartmentExpense > 0

    const approvalStatus: DepositApprovalStatus =
      requiresApproval
        ? 'Pending'
        : 'Not Required'

    const pettyCashStatus: PettyCashStatus =
      input.pettyCash > 0
        ? 'Unreplenished'
        : 'N/A'

    const initialThreads: InitialDepositThreadInsert[] = []

    if (input.pettyCash > 0) {
      initialThreads.push({
        category: 'PETTY_CASH',
        authorName,
        authorRole,
        message: `Petty Cash Deduction (₱${formatAmount(input.pettyCash)}) — Status: Unreplenished.\nRemarks: ${pettyCashRemarks}`,
        filenames: uploadedPettyCashFiles,
      })
    }

    if (input.openSales > 0) {
      initialThreads.push({
        category: 'OPEN_SALES',
        authorName,
        authorRole,
        message: `Open Sales Borrowed (₱${formatAmount(input.openSales)}) — Borrowed from Business Date: ${openSalesSourceDate} (Deposit slip not yet deposited).\nRemarks: ${openSalesRemarks}`,
        filenames: [],
      })
    }

    if (input.otherDepartmentExpense > 0) {
      initialThreads.push({
        category: 'DEPT_EXPENSE',
        authorName,
        authorRole,
        message: `Other Dept. Expense (₱${formatAmount(input.otherDepartmentExpense)}) — Department: ${deptExpenseDepartment} | Borrowed By: ${deptExpenseBorrower}.\nPurpose/Remarks: ${deptExpenseRemarks}`,
        filenames: uploadedDeptExpenseFiles,
      })
    }

    const deposit: DepositInsert = {
      locationName,
      businessDate:
        input.businessDate,
      depositDate:
        input.depositDate,
      depositReference:
        input.depositReference.trim(),
      posAmount:
        rofSource.posAmount,
      depositAmount:
        rofSource.actualAmount,
      pettyCash:
        input.pettyCash,
      bir2307:
        input.bir2307,
      openSales:
        input.openSales,
      otherDepartmentExpense:
        input.otherDepartmentExpense,
      filename:
        uploadedMainFileName,
      approvalStatus,
      pettyCashStatus,
      openSalesSourceDate:
        input.openSales > 0
          ? openSalesSourceDate
          : null,
      deptExpenseDepartment:
        input.otherDepartmentExpense > 0
          ? deptExpenseDepartment
          : null,
      deptExpenseBorrower:
        input.otherDepartmentExpense > 0
          ? deptExpenseBorrower
          : null,
      initialThreads,
    }

    const depositId =
      await saveDeposit(
        deposit,
      )

    return {
      success: true,
      depositId,
      message: requiresApproval
        ? 'Deposit saved and marked as Pending Approval for Area Manager review.'
        : 'Deposit image uploaded and record saved successfully.',
    }
  } catch (error) {
    if (uploadedFileNames.length > 0) {
      await cleanupUploadedFiles(
        uploadedFileNames,
      )
    }

    console.error(
      'Create deposit failed:',
      error,
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to save deposit.',
    }
  }
}

export async function checkDepositStatus(
  businessDate: string,
  locationName: string,
) {
  return getDepositStatus(
    businessDate,
    locationName,
  )
}

export async function loadDeposits(
  input: DepositListInput,
): Promise<DepositListResult> {
  try {
    if (
      !input.locationName.trim()
    ) {
      return {
        success: false,
        rows: [],
        totalRecords: 0,
        totalPages: 0,
        message:
          'Location is required.',
      }
    }

    const page =
      Math.max(
        1,
        input.page,
      )

    const pageSize =
      Math.max(
        1,
        input.pageSize,
      )

    const result =
      await getDeposits({
        ...input,
        page,
        pageSize,
      })

    return {
      success: true,
      rows:
        result.rows,
      totalRecords:
        result.totalRecords,
      totalPages:
        Math.ceil(
          result.totalRecords /
            pageSize,
        ),
      message:
        'Deposits loaded successfully.',
    }
  } catch (error) {
    console.error(
      'Load deposits failed:',
      error,
    )

    return {
      success: false,
      rows: [],
      totalRecords: 0,
      totalPages: 0,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to load deposits.',
    }
  }
}

export async function loadDepositById(
  depositId: number,
  locationName: string,
): Promise<GetDepositResult> {
  try {
    if (
      !Number.isInteger(
        depositId,
      ) ||
      depositId <= 0
    ) {
      return {
        success: false,
        deposit: null,
        message:
          'Invalid deposit ID.',
      }
    }

    if (
      !locationName.trim()
    ) {
      return {
        success: false,
        deposit: null,
        message:
          'Location is required.',
      }
    }

    const deposit =
      await getDepositById(
        depositId,
        locationName,
      )

    if (!deposit) {
      return {
        success: false,
        deposit: null,
        message:
          'Deposit record was not found.',
      }
    }

    return {
      success: true,
      deposit,
      message:
        'Deposit loaded successfully.',
    }
  } catch (error) {
    console.error(
      'Load deposit failed:',
      error,
    )

    return {
      success: false,
      deposit: null,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to load deposit.',
    }
  }
}

export async function editDeposit(
  input: UpdateDepositInput,
): Promise<UpdateDepositResult> {
  const uploadedFileNames: string[] = []

  try {
    if (
      !Number.isInteger(
        input.depositId,
      ) ||
      input.depositId <= 0
    ) {
      return {
        success: false,
        message:
          'Invalid deposit ID.',
      }
    }

    const locationName =
      input.locationName.trim()
    const authorName =
      input.authorName?.trim() ||
      locationName
    const authorRole =
      input.authorRole?.trim() ||
      'Store'

    if (!locationName) {
      return {
        success: false,
        message:
          'Location is required.',
      }
    }

    if (
      !isValidDate(
        input.depositDate,
      )
    ) {
      return {
        success: false,
        message:
          'Invalid deposit date.',
      }
    }

    if (
      !input.depositReference.trim()
    ) {
      return {
        success: false,
        message:
          'Deposit Ref# is required.',
      }
    }

    const values = [
      input.pettyCash,
      input.bir2307,
      input.openSales,
      input.otherDepartmentExpense,
    ]

    if (
      values.some(
        (value) =>
          !validNumber(value),
      )
    ) {
      return {
        success: false,
        message:
          'Amounts cannot be negative or invalid.',
      }
    }

    const existing =
      await getDepositById(
        input.depositId,
        locationName,
      )

    if (!existing) {
      return {
        success: false,
        message:
          'Deposit record was not found.',
      }
    }

    const pettyCashRemarks =
      input.pettyCashRemarks?.trim() ?? ''
    const pettyCashPaths =
      (input.pettyCashAttachmentPaths ?? [])
        .map((item) => item.trim())
        .filter(Boolean)

    // If Petty Cash was previously 0 and is now > 0, require remarks and supporting doc
    if (
      input.pettyCash > 0 &&
      existing.pettyCash <= 0
    ) {
      if (!pettyCashRemarks) {
        return {
          success: false,
          message:
            'Petty Cash remarks are required when adding Petty Cash.',
        }
      }

      if (pettyCashPaths.length === 0) {
        return {
          success: false,
          message:
            'Please attach at least one supporting document for Petty Cash.',
        }
      }
    }

    const openSalesSourceDate =
      input.openSalesSourceDate?.trim() ||
      existing.openSalesSourceDate ||
      ''
    const openSalesRemarks =
      input.openSalesRemarks?.trim() ?? ''

    if (input.openSales > 0) {
      if (
        !openSalesSourceDate ||
        !isValidDate(openSalesSourceDate)
      ) {
        return {
          success: false,
          message:
            'Please select the Business Date where Open Sales funds were borrowed from.',
        }
      }

      if (openSalesSourceDate === existing.businessDate) {
        return {
          success: false,
          message:
            'Open Sales borrowed date must be different from the deposit Business Date.',
        }
      }

      if (openSalesSourceDate !== existing.openSalesSourceDate) {
        const sourceDateDepositStatus =
          await getDepositStatus(
            openSalesSourceDate,
            locationName,
          )

        if (sourceDateDepositStatus.exists) {
          return {
            success: false,
            message:
              `Cannot borrow Open Sales from ${openSalesSourceDate} because its deposit slip has already been deposited.`,
          }
        }
      }

      if (
        existing.openSales <= 0 &&
        !openSalesRemarks
      ) {
        return {
          success: false,
          message:
            'Open Sales remarks are required when adding Open Sales.',
        }
      }
    }

    const deptExpenseDepartment =
      input.deptExpenseDepartment?.trim() ||
      existing.deptExpenseDepartment ||
      ''
    const deptExpenseBorrower =
      input.deptExpenseBorrower?.trim() ||
      existing.deptExpenseBorrower ||
      ''
    const deptExpenseRemarks =
      input.deptExpenseRemarks?.trim() ?? ''
    const deptExpensePaths =
      (input.deptExpenseAttachmentPaths ?? [])
        .map((item) => item.trim())
        .filter(Boolean)

    if (input.otherDepartmentExpense > 0) {
      if (!deptExpenseDepartment) {
        return {
          success: false,
          message:
            'Department Name is required when Other Department Expense is greater than 0.',
        }
      }

      if (!deptExpenseBorrower) {
        return {
          success: false,
          message:
            'Borrower / Person Name is required when Other Department Expense is greater than 0.',
        }
      }

      if (existing.otherDepartmentExpense <= 0) {
        if (!deptExpenseRemarks) {
          return {
            success: false,
            message:
              'Purpose / Remarks are required when adding Other Department Expense.',
          }
        }

        if (deptExpensePaths.length === 0) {
          return {
            success: false,
            message:
              'Please attach at least one supporting document for Other Department Expense.',
          }
        }
      }
    }

    const seenBaseNames = new Set<string>()
    for (const filePath of [
      ...pettyCashPaths,
      ...deptExpensePaths,
    ]) {
      const baseName =
        validateDepositImagePath(filePath)
      const lower =
        baseName.toLowerCase()
      if (seenBaseNames.has(lower)) {
        return {
          success: false,
          message:
            `Duplicate attachment filename "${baseName}" selected.`,
        }
      }
      seenBaseNames.add(lower)
    }

    const uploadedPettyCashFiles: string[] = []
    for (const filePath of pettyCashPaths) {
      const uploadedName =
        await uploadDepositImage(filePath)
      uploadedFileNames.push(uploadedName)
      uploadedPettyCashFiles.push(uploadedName)
    }

    const uploadedDeptExpenseFiles: string[] = []
    for (const filePath of deptExpensePaths) {
      const uploadedName =
        await uploadDepositImage(filePath)
      uploadedFileNames.push(uploadedName)
      uploadedDeptExpenseFiles.push(uploadedName)
    }

    const requiresApproval =
      input.pettyCash > 0 ||
      input.openSales > 0 ||
      input.otherDepartmentExpense > 0

    const amountsChanged =
      input.pettyCash !== existing.pettyCash ||
      input.openSales !== existing.openSales ||
      input.otherDepartmentExpense !== existing.otherDepartmentExpense

    const approvalStatus: DepositApprovalStatus =
      !requiresApproval
        ? 'Not Required'
        : amountsChanged
          ? 'Pending'
          : existing.approvalStatus === 'Not Required'
            ? 'Pending'
            : existing.approvalStatus

    const pettyCashStatus: PettyCashStatus =
      input.pettyCash <= 0
        ? 'N/A'
        : existing.pettyCashStatus === 'Replenished' &&
            input.pettyCash === existing.pettyCash
          ? 'Replenished'
          : 'Unreplenished'

    const newThreads: InitialDepositThreadInsert[] = []

    if (
      input.pettyCash > 0 &&
      (pettyCashRemarks || uploadedPettyCashFiles.length > 0 || input.pettyCash !== existing.pettyCash)
    ) {
      newThreads.push({
        category: 'PETTY_CASH',
        authorName,
        authorRole,
        message: `Updated Petty Cash (₱${formatAmount(input.pettyCash)})${pettyCashRemarks ? `\nRemarks: ${pettyCashRemarks}` : ''}`,
        filenames: uploadedPettyCashFiles,
      })
    }

    if (
      input.openSales > 0 &&
      (openSalesRemarks ||
        openSalesSourceDate !== existing.openSalesSourceDate ||
        input.openSales !== existing.openSales)
    ) {
      newThreads.push({
        category: 'OPEN_SALES',
        authorName,
        authorRole,
        message: `Updated Open Sales (₱${formatAmount(input.openSales)}) — Borrowed from Business Date: ${openSalesSourceDate}${openSalesRemarks ? `\nRemarks: ${openSalesRemarks}` : ''}`,
        filenames: [],
      })
    }

    if (
      input.otherDepartmentExpense > 0 &&
      (deptExpenseRemarks ||
        uploadedDeptExpenseFiles.length > 0 ||
        input.otherDepartmentExpense !== existing.otherDepartmentExpense ||
        deptExpenseDepartment !== existing.deptExpenseDepartment ||
        deptExpenseBorrower !== existing.deptExpenseBorrower)
    ) {
      newThreads.push({
        category: 'DEPT_EXPENSE',
        authorName,
        authorRole,
        message: `Updated Other Dept. Expense (₱${formatAmount(input.otherDepartmentExpense)}) — Department: ${deptExpenseDepartment} | Borrowed By: ${deptExpenseBorrower}${deptExpenseRemarks ? `\nPurpose/Remarks: ${deptExpenseRemarks}` : ''}`,
        filenames: uploadedDeptExpenseFiles,
      })
    }

    const updated =
      await updateDeposit({
        depositId:
          input.depositId,
        locationName,
        depositDate:
          input.depositDate,
        depositReference:
          input.depositReference.trim(),
        pettyCash:
          input.pettyCash,
        bir2307:
          input.bir2307,
        openSales:
          input.openSales,
        otherDepartmentExpense:
          input.otherDepartmentExpense,
        approvalStatus,
        pettyCashStatus,
        openSalesSourceDate:
          input.openSales > 0
            ? openSalesSourceDate
            : null,
        deptExpenseDepartment:
          input.otherDepartmentExpense > 0
            ? deptExpenseDepartment
            : null,
        deptExpenseBorrower:
          input.otherDepartmentExpense > 0
            ? deptExpenseBorrower
            : null,
        newThreads,
      })

    if (!updated) {
      if (uploadedFileNames.length > 0) {
        await cleanupUploadedFiles(uploadedFileNames)
      }
      return {
        success: false,
        message:
          'No deposit record was updated.',
      }
    }

    return {
      success: true,
      message:
        'Deposit updated successfully.',
    }
  } catch (error) {
    if (uploadedFileNames.length > 0) {
      await cleanupUploadedFiles(uploadedFileNames)
    }

    console.error(
      'Update deposit failed:',
      error,
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to update deposit.',
    }
  }
}

export async function removeDeposit(
  depositId: number,
  locationName: string,
): Promise<DeleteDepositResult> {
  try {
    if (
      !Number.isInteger(
        depositId,
      ) ||
      depositId <= 0
    ) {
      return {
        success: false,
        message:
          'Invalid deposit ID.',
      }
    }

    if (
      !locationName.trim()
    ) {
      return {
        success: false,
        message:
          'Location is required.',
      }
    }

    const existing =
      await getDepositById(
        depositId,
        locationName,
      )

    if (!existing) {
      return {
        success: false,
        message:
          'Deposit record was not found.',
      }
    }

    const supportingFilenames =
      await getDepositSupportingFilenames(
        depositId,
      )

    const deleted =
      await deleteDeposit(
        depositId,
        locationName,
      )

    if (!deleted) {
      return {
        success: false,
        message:
          'Deposit record was not deleted.',
      }
    }

    let attachmentWarning = ''
    const allFilesToRemove = [
      ...(existing.filename?.trim()
        ? [existing.filename.trim()]
        : []),
      ...supportingFilenames,
    ]

    for (const fileToRemove of allFilesToRemove) {
      try {
        await deleteDepositImage(fileToRemove)
      } catch (error) {
        console.error(
          'Deposit deleted but FTP attachment cleanup failed:',
          error,
        )
        attachmentWarning =
          ' The database record was deleted, but one or more FTP attachments could not be removed.'
      }
    }

    return {
      success: true,
      message: `Deposit deleted successfully.${attachmentWarning}`,
    }
  } catch (error) {
    console.error(
      'Delete deposit failed:',
      error,
    )

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to delete deposit.',
    }
  }
}

export async function loadDepositThread(
  depositId: number,
  locationName: string,
): Promise<GetDepositThreadResult> {
  try {
    if (
      !Number.isInteger(depositId) ||
      depositId <= 0
    ) {
      return {
        success: false,
        deposit: null,
        threads: [],
        message: 'Invalid deposit ID.',
      }
    }

    if (!locationName.trim()) {
      return {
        success: false,
        deposit: null,
        threads: [],
        message: 'Location is required.',
      }
    }

    const deposit =
      await getDepositById(
        depositId,
        locationName,
      )

    if (!deposit) {
      return {
        success: false,
        deposit: null,
        threads: [],
        message: 'Deposit record was not found.',
      }
    }

    const threads =
      await getDepositThreadEntries(depositId)

    return {
      success: true,
      deposit,
      threads,
      message: 'Deposit thread loaded successfully.',
    }
  } catch (error) {
    console.error('Load deposit thread failed:', error)
    return {
      success: false,
      deposit: null,
      threads: [],
      message:
        error instanceof Error
          ? error.message
          : 'Unable to load deposit thread.',
    }
  }
}

export async function createDepositThreadReply(
  input: AddDepositThreadReplyInput,
): Promise<AddDepositThreadReplyResult> {
  const uploadedFileNames: string[] = []

  try {
    if (
      !Number.isInteger(input.depositId) ||
      input.depositId <= 0
    ) {
      return {
        success: false,
        message: 'Invalid deposit ID.',
      }
    }

    const locationName =
      input.locationName.trim()
    const message =
      input.message.trim()
    const attachmentPaths =
      (input.attachmentPaths ?? [])
        .map((item) => item.trim())
        .filter(Boolean)

    if (!locationName) {
      return {
        success: false,
        message: 'Location is required.',
      }
    }

    if (!message) {
      return {
        success: false,
        message: 'Please enter a remark message.',
      }
    }

    const existing =
      await getDepositById(
        input.depositId,
        locationName,
      )

    if (!existing) {
      return {
        success: false,
        message: 'Deposit record was not found.',
      }
    }

    const seenNames = new Set<string>()
    for (const filePath of attachmentPaths) {
      const baseName =
        validateDepositImagePath(filePath)
      const lower =
        baseName.toLowerCase()
      if (seenNames.has(lower)) {
        return {
          success: false,
          message: `Duplicate attachment "${baseName}" selected.`,
        }
      }
      seenNames.add(lower)
    }

    for (const filePath of attachmentPaths) {
      const uploadedName =
        await uploadDepositImage(filePath)
      uploadedFileNames.push(uploadedName)
    }

    await addDepositThreadEntry(
      input.depositId,
      {
        category: input.category || 'GENERAL',
        authorName:
          input.authorName.trim() || locationName,
        authorRole:
          input.authorRole.trim() || 'Store',
        message,
        filenames: uploadedFileNames,
      },
    )

    return {
      success: true,
      message: 'Remark added to thread successfully.',
    }
  } catch (error) {
    if (uploadedFileNames.length > 0) {
      await cleanupUploadedFiles(uploadedFileNames)
    }

    console.error('Add deposit thread reply failed:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to add remark to thread.',
    }
  }
}

export async function submitPettyCashReplenishment(
  input: ReplenishPettyCashInput,
): Promise<ReplenishPettyCashResult> {
  const uploadedFileNames: string[] = []

  try {
    if (
      !Number.isInteger(input.depositId) ||
      input.depositId <= 0
    ) {
      return {
        success: false,
        message: 'Invalid deposit ID.',
      }
    }

    const locationName =
      input.locationName.trim()
    const remarks =
      input.remarks.trim()
    const attachmentPaths =
      (input.attachmentPaths ?? [])
        .map((item) => item.trim())
        .filter(Boolean)

    if (!locationName) {
      return {
        success: false,
        message: 'Location is required.',
      }
    }

    if (!remarks) {
      return {
        success: false,
        message:
          'Replenishment remarks are required.',
      }
    }

    if (attachmentPaths.length === 0) {
      return {
        success: false,
        message:
          'Supporting document is required when replenishing Petty Cash.',
      }
    }

    const existing =
      await getDepositById(
        input.depositId,
        locationName,
      )

    if (!existing) {
      return {
        success: false,
        message: 'Deposit record was not found.',
      }
    }

    if (existing.pettyCash <= 0) {
      return {
        success: false,
        message:
          'This deposit has no Petty Cash amount to replenish.',
      }
    }

    if (existing.pettyCashStatus === 'Replenished') {
      return {
        success: false,
        message:
          'Petty Cash for this deposit is already marked as Replenished.',
      }
    }

    const seenNames = new Set<string>()
    for (const filePath of attachmentPaths) {
      const baseName =
        validateDepositImagePath(filePath)
      const lower =
        baseName.toLowerCase()
      if (seenNames.has(lower)) {
        return {
          success: false,
          message: `Duplicate attachment "${baseName}" selected.`,
        }
      }
      seenNames.add(lower)
    }

    for (const filePath of attachmentPaths) {
      const uploadedName =
        await uploadDepositImage(filePath)
      uploadedFileNames.push(uploadedName)
    }

    const updated =
      await replenishDepositPettyCash(
        input.depositId,
        locationName,
        {
          category: 'PETTY_CASH_REPLENISH',
          authorName:
            input.authorName.trim() || locationName,
          authorRole:
            input.authorRole.trim() || 'Store',
          message: `Petty Cash Replenished (₱${formatAmount(existing.pettyCash)}).\nRemarks: ${remarks}`,
          filenames: uploadedFileNames,
        },
      )

    if (!updated) {
      await cleanupUploadedFiles(uploadedFileNames)
      return {
        success: false,
        message:
          'Unable to mark Petty Cash as replenished.',
      }
    }

    return {
      success: true,
      message:
        'Petty Cash replenished and supporting document uploaded successfully.',
    }
  } catch (error) {
    if (uploadedFileNames.length > 0) {
      await cleanupUploadedFiles(uploadedFileNames)
    }

    console.error('Replenish petty cash failed:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to replenish Petty Cash.',
    }
  }
}
