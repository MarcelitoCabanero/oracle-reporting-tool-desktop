import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import type {
  ReactNode,
} from 'react'

import {
  AlertTriangle,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  ImageIcon,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  WalletCards,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import {
  useAuth,
} from '../auth/useAuth'

import ConfirmDialog from '../components/common/ConfirmDialog'

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

interface SelectedAttachmentItem {
  filePath: string
  fileName: string
  previewDataUrl: string
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

function todayString() {
  const now = new Date()

  const year =
    now.getFullYear()

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(
      2,
      '0',
    )

  const day =
    String(
      now.getDate(),
    ).padStart(
      2,
      '0',
    )

  return `${year}-${month}-${day}`
}

function formatMoney(
  value: number,
) {
  return value.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )
}

function formatDate(
  value: string,
) {
  if (!value) {
    return '—'
  }

  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString(
    'en-PH',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  )
}

function formatDateTime(
  value: string,
) {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString(
    'en-PH',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

function toNumber(
  value: string,
) {
  const parsed =
    Number(value)

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0
}

function mergeUniqueAttachments(
  existing: SelectedAttachmentItem[],
  incoming: SelectedAttachmentItem[],
): SelectedAttachmentItem[] {
  const map = new Map<string, SelectedAttachmentItem>()
  for (const item of existing) {
    map.set(item.filePath, item)
  }
  for (const item of incoming) {
    map.set(item.filePath, item)
  }
  return Array.from(map.values())
}

function DepositPage() {
  const {
    user,
  } = useAuth()

  // =========================================================
  // FORM MODAL
  // =========================================================

  const [
    showFormModal,
    setShowFormModal,
  ] =
    useState(false)

  const [
    businessDate,
    setBusinessDate,
  ] =
    useState(
      todayString(),
    )

  const [
    depositDate,
    setDepositDate,
  ] =
    useState(
      todayString(),
    )

  const [
    depositReference,
    setDepositReference,
  ] =
    useState('')

  const [
    posAmount,
    setPosAmount,
  ] =
    useState(0)

  const [
    depositAmount,
    setDepositAmount,
  ] =
    useState(0)

  const [
    pettyCash,
    setPettyCash,
  ] =
    useState(0)

  const [
    bir2307,
    setBir2307,
  ] =
    useState(0)

  const [
    openSales,
    setOpenSales,
  ] =
    useState(0)

  const [
    otherDepartmentExpense,
    setOtherDepartmentExpense,
  ] =
    useState(0)

  const [
    filename,
    setFilename,
  ] =
    useState('')

  const [
    localFilePath,
    setLocalFilePath,
  ] =
    useState('')

  const [
    previewDataUrl,
    setPreviewDataUrl,
  ] =
    useState('')

  // Category-specific form states
  const [
    pettyCashRemarks,
    setPettyCashRemarks,
  ] =
    useState('')

  const [
    pettyCashAttachments,
    setPettyCashAttachments,
  ] =
    useState<SelectedAttachmentItem[]>([])

  const [
    openSalesSourceDate,
    setOpenSalesSourceDate,
  ] =
    useState('')

  const [
    openSalesRemarks,
    setOpenSalesRemarks,
  ] =
    useState('')

  const [
    openSalesDateStatusMsg,
    setOpenSalesDateStatusMsg,
  ] =
    useState('')

  const [
    openSalesDateInvalid,
    setOpenSalesDateInvalid,
  ] =
    useState(false)

  const [
    deptExpenseDepartment,
    setDeptExpenseDepartment,
  ] =
    useState('')

  const [
    deptExpenseBorrower,
    setDeptExpenseBorrower,
  ] =
    useState('')

  const [
    deptExpenseRemarks,
    setDeptExpenseRemarks,
  ] =
    useState('')

  const [
    deptExpenseAttachments,
    setDeptExpenseAttachments,
  ] =
    useState<SelectedAttachmentItem[]>([])

  const [
    originalEditRecord,
    setOriginalEditRecord,
  ] =
    useState<DepositRecord | null>(null)

  const [
    rofLoaded,
    setRofLoaded,
  ] =
    useState(false)

  const [
    editingDepositId,
    setEditingDepositId,
  ] =
    useState<number | null>(
      null,
    )

  const [
    formMessage,
    setFormMessage,
  ] =
    useState(
      'Select a business date and load the ROF.',
    )

  // =========================================================
  // HISTORY
  // =========================================================

  const [
    rows,
    setRows,
  ] =
    useState<
      DepositRecord[]
    >([])

  const [
    page,
    setPage,
  ] =
    useState(1)

  const [
    pageSize,
    setPageSize,
  ] =
    useState(10)

  const [
    totalRecords,
    setTotalRecords,
  ] =
    useState(0)

  const [
    totalPages,
    setTotalPages,
  ] =
    useState(0)

  const [
    keyword,
    setKeyword,
  ] =
    useState('')

  const [
    month,
    setMonth,
  ] =
    useState('')

  const [
    year,
    setYear,
  ] =
    useState(
      String(
        new Date()
          .getFullYear(),
      ),
    )

  const [
    historyMessage,
    setHistoryMessage,
  ] =
    useState(
      'Loading deposit history...',
    )

  // =========================================================
  // ATTACHMENT VIEWER
  // =========================================================

  const [
    attachmentTarget,
    setAttachmentTarget,
  ] =
    useState<{
      depositId: number
      filename: string
      title: string
      allowReplace: boolean
    } | null>(null)

  const [
    attachmentPreview,
    setAttachmentPreview,
  ] =
    useState('')

  const [
    attachmentMessage,
    setAttachmentMessage,
  ] =
    useState('')

  const [
    loadingAttachment,
    setLoadingAttachment,
  ] =
    useState(false)

  const [
    downloadingAttachment,
    setDownloadingAttachment,
  ] =
    useState(false)

  const [
    replacingAttachment,
    setReplacingAttachment,
  ] =
    useState(false)

  const [
    attachmentZoom,
    setAttachmentZoom,
  ] =
    useState(1)

  const [
    attachmentRotation,
    setAttachmentRotation,
  ] =
    useState(0)

  // =========================================================
  // THREAD & REPLENISHMENT MODAL
  // =========================================================

  const [
    threadModalDeposit,
    setThreadModalDeposit,
  ] =
    useState<DepositRecord | null>(null)

  const [
    threadEntries,
    setThreadEntries,
  ] =
    useState<DepositThreadEntry[]>([])

  const [
    loadingThread,
    setLoadingThread,
  ] =
    useState(false)

  const [
    threadModalMessage,
    setThreadModalMessage,
  ] =
    useState('')

  const [
    replyCategory,
    setReplyCategory,
  ] =
    useState<DepositThreadCategory>('GENERAL')

  const [
    replyMessage,
    setReplyMessage,
  ] =
    useState('')

  const [
    replyAttachments,
    setReplyAttachments,
  ] =
    useState<SelectedAttachmentItem[]>([])

  const [
    submittingReply,
    setSubmittingReply,
  ] =
    useState(false)

  const [
    showReplenishBox,
    setShowReplenishBox,
  ] =
    useState(false)

  const [
    replenishRemarks,
    setReplenishRemarks,
  ] =
    useState('')

  const [
    replenishAttachments,
    setReplenishAttachments,
  ] =
    useState<SelectedAttachmentItem[]>([])

  const [
    submittingReplenish,
    setSubmittingReplenish,
  ] =
    useState(false)

  // =========================================================
  // BUSY / DIALOGS
  // =========================================================

  const [
    loadingRof,
    setLoadingRof,
  ] =
    useState(false)

  const [
    loadingHistory,
    setLoadingHistory,
  ] =
    useState(false)

  const [
    loadingRecord,
    setLoadingRecord,
  ] =
    useState(false)

  const [
    saving,
    setSaving,
  ] =
    useState(false)

  const [
    deleting,
    setDeleting,
  ] =
    useState(false)

  const [
    showSaveConfirm,
    setShowSaveConfirm,
  ] =
    useState(false)

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<
      DepositRecord | null
    >(null)

  const [
    requestDeleteTarget,
    setRequestDeleteTarget,
  ] =
    useState<DepositRecord | null>(null)

  const [
    deleteRequestReason,
    setDeleteRequestReason,
  ] =
    useState('')

  const [
    requestingDelete,
    setRequestingDelete,
  ] =
    useState(false)

  const [
    revertDeleteTarget,
    setRevertDeleteTarget,
  ] =
    useState<DepositRecord | null>(null)

  const [
    revertingDelete,
    setRevertingDelete,
  ] =
    useState(false)

  const isEditing =
    editingDepositId !==
    null

  const formBusy =
    loadingRof ||
    loadingRecord ||
    saving ||
    deleting ||
    requestingDelete ||
    revertingDelete

  const requiresApproval =
    pettyCash > 0 ||
    openSales > 0 ||
    otherDepartmentExpense > 0

  const formMessageClass =
    getNoticeClass(
      formMessage,
    )

  const historyMessageClass =
    getNoticeClass(
      historyMessage,
    )

  const busyOverlayMessage =
    saving
      ? isEditing
        ? 'Updating deposit & uploading attachments...'
        : 'Saving deposit & uploading attachments...'
      : deleting
        ? 'Deleting deposit & FTP attachments...'
        : requestingDelete
          ? 'Submitting delete request for approval...'
          : revertingDelete
            ? 'Reverting delete request...'
            : loadingRof
              ? 'Loading ROF...'
              : ''

  const variance =
    useMemo(
      () =>
        depositAmount +
        pettyCash +
        bir2307 +
        openSales +
        otherDepartmentExpense -
        posAmount,
      [
        depositAmount,
        pettyCash,
        bir2307,
        openSales,
        otherDepartmentExpense,
        posAmount,
      ],
    )

  function resetForm() {
    setBusinessDate(
      todayString(),
    )

    setDepositDate(
      todayString(),
    )

    setDepositReference(
      '',
    )

    setPosAmount(
      0,
    )

    setDepositAmount(
      0,
    )

    setPettyCash(
      0,
    )

    setBir2307(
      0,
    )

    setOpenSales(
      0,
    )

    setOtherDepartmentExpense(
      0,
    )

    setFilename(
      '',
    )

    setLocalFilePath(
      '',
    )

    setPreviewDataUrl(
      '',
    )

    setPettyCashRemarks('')
    setPettyCashAttachments([])

    setOpenSalesSourceDate('')
    setOpenSalesRemarks('')
    setOpenSalesDateStatusMsg('')
    setOpenSalesDateInvalid(false)

    setDeptExpenseDepartment('')
    setDeptExpenseBorrower('')
    setDeptExpenseRemarks('')
    setDeptExpenseAttachments([])

    setOriginalEditRecord(null)

    setRofLoaded(
      false,
    )

    setEditingDepositId(
      null,
    )

    setFormMessage(
      'Select a business date and load the ROF.',
    )
  }

  function openNewDeposit() {
    resetForm()

    setShowFormModal(
      true,
    )
  }

  function closeFormModal() {
    if (formBusy) {
      return
    }

    setShowSaveConfirm(
      false,
    )

    setShowFormModal(
      false,
    )
  }

  // Validate Open Sales Borrowed Date live when selected
  async function handleOpenSalesSourceDateChange(
    selectedDate: string,
  ) {
    setOpenSalesSourceDate(selectedDate)

    if (!selectedDate || !user) {
      setOpenSalesDateStatusMsg('')
      setOpenSalesDateInvalid(false)
      return
    }

    if (selectedDate === businessDate) {
      setOpenSalesDateStatusMsg(
        'Borrowed Business Date must be different from this deposit Business Date.',
      )
      setOpenSalesDateInvalid(true)
      return
    }

    try {
      const status =
        await window.api.deposit.checkStatus(
          selectedDate,
          user.locationName,
        )

      if (status.exists) {
        setOpenSalesDateStatusMsg(
          `Deposit slip for ${formatDate(selectedDate)} is already deposited (#${status.depositId}). Choose an undeposited date.`,
        )
        setOpenSalesDateInvalid(true)
      } else {
        setOpenSalesDateStatusMsg(
          `Verified: ${formatDate(selectedDate)} has no deposit saved yet.`,
        )
        setOpenSalesDateInvalid(false)
      }
    } catch {
      setOpenSalesDateStatusMsg('')
      setOpenSalesDateInvalid(false)
    }
  }

  // =========================================================
  // ROF SOURCE
  // =========================================================

  async function loadRof() {
    if (!user) {
      setFormMessage(
        'Unable to determine logged-in location.',
      )

      return
    }

    if (!businessDate) {
      setFormMessage(
        'Business Date is required.',
      )

      return
    }

    try {
      setLoadingRof(
        true,
      )

      setRofLoaded(
        false,
      )

      setFormMessage(
        'Loading ROF...',
      )

      const source =
        await window.api.rof
          .getDepositSource(
            businessDate,
          )

      if (!source.exists) {
        setPosAmount(
          0,
        )

        setDepositAmount(
          0,
        )

        setFormMessage(
          source.message,
        )

        return
      }

      const status =
        await window.api.deposit
          .checkStatus(
            businessDate,
            user.locationName,
          )

      if (
        status.exists &&
        status.depositId
      ) {
        setFormMessage(
          'A deposit already exists for this business date. Edit it from Deposit History.',
        )

        return
      }

      setPosAmount(
        source.posAmount,
      )

      setDepositAmount(
        source.actualAmount,
      )

      setRofLoaded(
        true,
      )

      setFormMessage(
        'ROF loaded successfully. Enter the deposit details.',
      )
    } catch (error) {
      console.error(
        'Unable to load ROF:',
        error,
      )

      setRofLoaded(
        false,
      )

      setFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load ROF.',
      )
    } finally {
      setLoadingRof(
        false,
      )
    }
  }

  // =========================================================
  // ATTACHMENT PICKERS
  // =========================================================

  async function browseAttachment() {
    try {
      const result =
        await window.api.deposit
          .selectAttachment()

      if (result.canceled) {
        return
      }

      setLocalFilePath(
        result.filePath,
      )

      setFilename(
        result.fileName,
      )

      setPreviewDataUrl(
        result.previewDataUrl,
      )

      setFormMessage(
        'Attachment selected successfully.',
      )
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to select attachment.',
      )
    }
  }

  async function browsePettyCashAttachments() {
    try {
      const result =
        await window.api.deposit
          .selectMultipleAttachments()

      if (result.canceled || result.files.length === 0) {
        return
      }

      setPettyCashAttachments((prev) =>
        mergeUniqueAttachments(prev, result.files),
      )
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to select Petty Cash supporting documents.',
      )
    }
  }

  async function browseDeptExpenseAttachments() {
    try {
      const result =
        await window.api.deposit
          .selectMultipleAttachments()

      if (result.canceled || result.files.length === 0) {
        return
      }

      setDeptExpenseAttachments((prev) =>
        mergeUniqueAttachments(prev, result.files),
      )
    } catch (error) {
      setFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to select Department Expense supporting documents.',
      )
    }
  }

  async function browseReplyAttachments() {
    try {
      const result =
        await window.api.deposit
          .selectMultipleAttachments()

      if (result.canceled || result.files.length === 0) {
        return
      }

      setReplyAttachments((prev) =>
        mergeUniqueAttachments(prev, result.files),
      )
    } catch (error) {
      setThreadModalMessage(
        error instanceof Error
          ? error.message
          : 'Unable to select attachments.',
      )
    }
  }

  async function browseReplenishAttachments() {
    try {
      const result =
        await window.api.deposit
          .selectMultipleAttachments()

      if (result.canceled || result.files.length === 0) {
        return
      }

      setReplenishAttachments((prev) =>
        mergeUniqueAttachments(prev, result.files),
      )
    } catch (error) {
      setThreadModalMessage(
        error instanceof Error
          ? error.message
          : 'Unable to select replenishment documents.',
      )
    }
  }

  // =========================================================
  // HISTORY
  // =========================================================

  async function loadHistory(
    targetPage = page,
    targetPageSize = pageSize,
  ) {
    if (!user) {
      return
    }

    try {
      setLoadingHistory(
        true,
      )

      setHistoryMessage(
        'Loading deposit history...',
      )

      const result =
        await window.api.deposit
          .list({
            locationName:
              user.locationName,

            page:
              targetPage,

            pageSize:
              targetPageSize,

            keyword:
              keyword.trim() ||
              undefined,

            month:
              month
                ? Number(month)
                : undefined,

            year:
              year
                ? Number(year)
                : undefined,
          })

      if (!result.success) {
        setRows([])

        setTotalRecords(
          0,
        )

        setTotalPages(
          0,
        )

        setHistoryMessage(
          result.message,
        )

        return
      }

      setRows(
        result.rows,
      )

      setTotalRecords(
        result.totalRecords,
      )

      setTotalPages(
        result.totalPages,
      )

      setHistoryMessage(
        result.totalRecords ===
          0
          ? 'No deposit records found.'
          : `${result.totalRecords} deposit record(s) found.`,
      )
    } catch (error) {
      console.error(
        'Unable to load deposit history:',
        error,
      )

      setRows([])

      setTotalRecords(
        0,
      )

      setTotalPages(
        0,
      )

      setHistoryMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load deposit history.',
      )
    } finally {
      setLoadingHistory(
        false,
      )
    }
  }

  useEffect(() => {
    if (!user) {
      return
    }

    let cancelled =
      false

    const locationName =
      user.locationName

    window.api.deposit
      .list({
        locationName,

        page: 1,

        pageSize: 10,

        year:
          new Date()
            .getFullYear(),
      })
      .then(
        (
          result,
        ) => {
          if (cancelled) {
            return
          }

          if (!result.success) {
            setRows([])

            setTotalRecords(
              0,
            )

            setTotalPages(
              0,
            )

            setHistoryMessage(
              result.message,
            )

            return
          }

          setRows(
            result.rows,
          )

          setTotalRecords(
            result.totalRecords,
          )

          setTotalPages(
            result.totalPages,
          )

          setHistoryMessage(
            result.totalRecords ===
              0
              ? 'No deposit records found.'
              : `${result.totalRecords} deposit record(s) found.`,
          )
        },
      )
      .catch(
        (
          error,
        ) => {
          if (cancelled) {
            return
          }

          console.error(
            'Unable to load deposit history:',
            error,
          )

          setRows([])

          setTotalRecords(
            0,
          )

          setTotalPages(
            0,
          )

          setHistoryMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load deposit history.',
          )
        },
      )
      .finally(
        () => {
          if (
            !cancelled
          ) {
            setLoadingHistory(
              false,
            )
          }
        },
      )

    return () => {
      cancelled =
        true
    }
  }, [user])

  async function applyFilters() {
    setPage(
      1,
    )

    await loadHistory(
      1,
      pageSize,
    )
  }

  async function changePage(
    nextPage: number,
  ) {
    if (
      nextPage < 1 ||
      nextPage >
        Math.max(
          totalPages,
          1,
        ) ||
      nextPage === page
    ) {
      return
    }

    setPage(
      nextPage,
    )

    await loadHistory(
      nextPage,
      pageSize,
    )
  }

  async function changePageSize(
    nextSize: number,
  ) {
    setPageSize(
      nextSize,
    )

    setPage(
      1,
    )

    await loadHistory(
      1,
      nextSize,
    )
  }

  // =========================================================
  // EDIT
  // =========================================================

  async function editFromHistory(
    row: DepositRecord,
  ) {
    if (!user) {
      return
    }

    try {
      setLoadingRecord(
        true,
      )

      const result =
        await window.api.deposit
          .getById(
            row.depositId,
            user.locationName,
          )

      if (
        !result.success ||
        !result.deposit
      ) {
        setHistoryMessage(
          result.message,
        )

        return
      }

      const deposit =
        result.deposit

      setOriginalEditRecord(deposit)

      setEditingDepositId(
        deposit.depositId,
      )

      setBusinessDate(
        deposit.businessDate,
      )

      setDepositDate(
        deposit.depositDate,
      )

      setDepositReference(
        deposit.depositReference,
      )

      setPosAmount(
        deposit.posAmount,
      )

      setDepositAmount(
        deposit.depositAmount,
      )

      setPettyCash(
        deposit.pettyCash,
      )

      setBir2307(
        deposit.bir2307,
      )

      setOpenSales(
        deposit.openSales,
      )

      setOtherDepartmentExpense(
        deposit.otherDepartmentExpense,
      )

      setFilename(
        deposit.filename,
      )

      setLocalFilePath(
        '',
      )

      setPreviewDataUrl(
        '',
      )

      setPettyCashRemarks('')
      setPettyCashAttachments([])

      setOpenSalesSourceDate(
        deposit.openSalesSourceDate || '',
      )
      setOpenSalesRemarks('')
      setOpenSalesDateStatusMsg('')
      setOpenSalesDateInvalid(false)

      setDeptExpenseDepartment(
        deposit.deptExpenseDepartment || '',
      )
      setDeptExpenseBorrower(
        deposit.deptExpenseBorrower || '',
      )
      setDeptExpenseRemarks('')
      setDeptExpenseAttachments([])

      setRofLoaded(
        true,
      )

      setFormMessage(
        `Editing Deposit #${deposit.depositId}.`,
      )

      setShowFormModal(
        true,
      )
    } catch (error) {
      console.error(
        'Unable to load deposit:',
        error,
      )

      setHistoryMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load deposit.',
      )
    } finally {
      setLoadingRecord(
        false,
      )
    }
  }

  // =========================================================
  // SAVE / UPDATE
  // =========================================================

  function validateForm() {
    if (!user) {
      setFormMessage(
        'Unable to determine logged-in location.',
      )

      return false
    }

    if (!rofLoaded) {
      setFormMessage(
        'Load the ROF before saving.',
      )

      return false
    }

    if (!depositDate) {
      setFormMessage(
        'Deposit Date is required.',
      )

      return false
    }

    if (
      !depositReference.trim()
    ) {
      setFormMessage(
        'Deposit Ref# is required.',
      )

      return false
    }

    const amounts = [
      pettyCash,
      bir2307,
      openSales,
      otherDepartmentExpense,
    ]

    if (
      amounts.some(
        (value) =>
          !Number.isFinite(
            value,
          ) ||
          value < 0,
      )
    ) {
      setFormMessage(
        'Amounts cannot be negative or invalid.',
      )

      return false
    }

    if (
      !isEditing &&
      !localFilePath.trim()
    ) {
      setFormMessage(
        'Please select a deposit attachment.',
      )

      return false
    }

    // 1. Validate Petty Cash
    const isNewPettyCash =
      pettyCash > 0 &&
      (!isEditing || (originalEditRecord?.pettyCash ?? 0) <= 0)

    if (isNewPettyCash) {
      if (!pettyCashRemarks.trim()) {
        setFormMessage(
          'Petty Cash remarks are required when Petty Cash is greater than 0.',
        )
        return false
      }

      if (pettyCashAttachments.length === 0) {
        setFormMessage(
          'Please select at least one supporting document (voucher/receipt) for Petty Cash.',
        )
        return false
      }
    }

    // 2. Validate Open Sales
    const isNewOpenSales =
      openSales > 0 &&
      (!isEditing || (originalEditRecord?.openSales ?? 0) <= 0)

    if (openSales > 0) {
      if (!openSalesSourceDate) {
        setFormMessage(
          'Please select the Business Date where Open Sales funds were borrowed from.',
        )
        return false
      }

      if (openSalesSourceDate === businessDate) {
        setFormMessage(
          'Open Sales borrowed date must be different from the deposit Business Date.',
        )
        return false
      }

      if (openSalesDateInvalid) {
        setFormMessage(
          openSalesDateStatusMsg ||
            'Invalid Open Sales borrowed Business Date.',
        )
        return false
      }

      if (isNewOpenSales && !openSalesRemarks.trim()) {
        setFormMessage(
          'Open Sales remarks are required when Open Sales is greater than 0.',
        )
        return false
      }
    }

    // 3. Validate Other Department Expense
    const isNewDeptExpense =
      otherDepartmentExpense > 0 &&
      (!isEditing ||
        (originalEditRecord?.otherDepartmentExpense ?? 0) <= 0)

    if (otherDepartmentExpense > 0) {
      if (!deptExpenseDepartment.trim()) {
        setFormMessage(
          'Department Name is required when Other Department Expense is greater than 0.',
        )
        return false
      }

      if (!deptExpenseBorrower.trim()) {
        setFormMessage(
          'Borrower / Person Name is required when Other Department Expense is greater than 0.',
        )
        return false
      }

      if (isNewDeptExpense) {
        if (!deptExpenseRemarks.trim()) {
          setFormMessage(
            'Purpose / Remarks are required when Other Department Expense is greater than 0.',
          )
          return false
        }

        if (deptExpenseAttachments.length === 0) {
          setFormMessage(
            'Please select at least one supporting document for Other Department Expense.',
          )
          return false
        }
      }
    }

    return true
  }

  function requestSave() {
    if (!validateForm()) {
      return
    }

    setShowSaveConfirm(
      true,
    )
  }

  async function saveDeposit() {
    if (!user) {
      return
    }

    setShowSaveConfirm(
      false,
    )

    try {
      setSaving(
        true,
      )

      if (isEditing) {
        const result =
          await window.api.deposit
            .update({
              depositId:
                editingDepositId!,

              locationName:
                user.locationName,

              authorName:
                user.displayName || user.username,

              authorRole:
                user.role || 'Store',

              depositDate,

              depositReference:
                depositReference.trim(),

              pettyCash,

              bir2307,

              openSales,

              otherDepartmentExpense,

              pettyCashRemarks:
                pettyCashRemarks.trim() || undefined,

              pettyCashAttachmentPaths:
                pettyCashAttachments.map(
                  (item) => item.filePath,
                ),

              openSalesSourceDate:
                openSales > 0
                  ? openSalesSourceDate
                  : undefined,

              openSalesRemarks:
                openSalesRemarks.trim() || undefined,

              deptExpenseDepartment:
                otherDepartmentExpense > 0
                  ? deptExpenseDepartment.trim()
                  : undefined,

              deptExpenseBorrower:
                otherDepartmentExpense > 0
                  ? deptExpenseBorrower.trim()
                  : undefined,

              deptExpenseRemarks:
                deptExpenseRemarks.trim() || undefined,

              deptExpenseAttachmentPaths:
                deptExpenseAttachments.map(
                  (item) => item.filePath,
                ),
            })

        setFormMessage(
          result.message,
        )

        if (result.success) {
          await loadHistory(
            page,
            pageSize,
          )

          setShowFormModal(
            false,
          )
        }

        return
      }

      const result =
        await window.api.deposit
          .create({
            locationName:
              user.locationName,

            authorName:
              user.displayName || user.username,

            authorRole:
              user.role || 'Store',

            businessDate,

            depositDate,

            depositReference:
              depositReference.trim(),

            pettyCash,

            bir2307,

            openSales,

            otherDepartmentExpense,

            localFilePath,

            pettyCashRemarks:
              pettyCashRemarks.trim() || undefined,

            pettyCashAttachmentPaths:
              pettyCashAttachments.map(
                (item) => item.filePath,
              ),

            openSalesSourceDate:
              openSales > 0
                ? openSalesSourceDate
                : undefined,

            openSalesRemarks:
              openSalesRemarks.trim() || undefined,

            deptExpenseDepartment:
              otherDepartmentExpense > 0
                ? deptExpenseDepartment.trim()
                : undefined,

            deptExpenseBorrower:
              otherDepartmentExpense > 0
                ? deptExpenseBorrower.trim()
                : undefined,

            deptExpenseRemarks:
              deptExpenseRemarks.trim() || undefined,

            deptExpenseAttachmentPaths:
              deptExpenseAttachments.map(
                (item) => item.filePath,
              ),
          })

      setFormMessage(
        result.message,
      )

      if (result.success) {
        setPage(
          1,
        )

        await loadHistory(
          1,
          pageSize,
        )

        setShowFormModal(
          false,
        )
      }
    } catch (error) {
      console.error(
        'Unable to save deposit:',
        error,
      )

      setFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save deposit.',
      )
    } finally {
      setSaving(
        false,
      )
    }
  }

  // =========================================================
  // THREAD & REPLENISHMENT MODAL
  // =========================================================

  async function openThreadModal(
    row: DepositRecord,
    openReplenish = false,
  ) {
    if (!user) {
      return
    }

    setThreadModalDeposit(row)
    setThreadEntries([])
    setThreadModalMessage('Loading monitoring thread...')
    setReplyCategory('GENERAL')
    setReplyMessage('')
    setReplyAttachments([])
    setShowReplenishBox(openReplenish)
    setReplenishRemarks('')
    setReplenishAttachments([])

    try {
      setLoadingThread(true)

      const result =
        await window.api.deposit.getThread(
          row.depositId,
          user.locationName,
        )

      if (!result.success) {
        setThreadModalMessage(result.message)
        return
      }

      if (result.deposit) {
        setThreadModalDeposit(result.deposit)
      }

      setThreadEntries(result.threads)
      setThreadModalMessage('')
    } catch (error) {
      setThreadModalMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load deposit thread.',
      )
    } finally {
      setLoadingThread(false)
    }
  }

  function closeThreadModal() {
    if (
      loadingThread ||
      submittingReply ||
      submittingReplenish
    ) {
      return
    }

    setThreadModalDeposit(null)
    setThreadEntries([])
    setThreadModalMessage('')
    setShowReplenishBox(false)
  }

  async function handleAddThreadReply() {
    if (!user || !threadModalDeposit) {
      return
    }

    if (!replyMessage.trim()) {
      setThreadModalMessage('Please enter a remark message.')
      return
    }

    try {
      setSubmittingReply(true)
      setThreadModalMessage('Posting remark to thread...')

      const result =
        await window.api.deposit.addThreadReply({
          depositId: threadModalDeposit.depositId,
          locationName: user.locationName,
          category: replyCategory,
          authorName:
            user.displayName || user.username,
          authorRole:
            user.role || 'Store',
          message: replyMessage.trim(),
          attachmentPaths: replyAttachments.map(
            (item) => item.filePath,
          ),
        })

      setThreadModalMessage(result.message)

      if (!result.success) {
        return
      }

      setReplyMessage('')
      setReplyAttachments([])

      const refreshed =
        await window.api.deposit.getThread(
          threadModalDeposit.depositId,
          user.locationName,
        )

      if (refreshed.success) {
        if (refreshed.deposit) {
          setThreadModalDeposit(refreshed.deposit)
        }
        setThreadEntries(refreshed.threads)
      }

      await loadHistory(page, pageSize)
    } catch (error) {
      setThreadModalMessage(
        error instanceof Error
          ? error.message
          : 'Unable to post remark.',
      )
    } finally {
      setSubmittingReply(false)
    }
  }

  async function handleReplenishPettyCash() {
    if (!user || !threadModalDeposit) {
      return
    }

    if (!replenishRemarks.trim()) {
      setThreadModalMessage(
        'Please enter replenishment remarks.',
      )
      return
    }

    if (replenishAttachments.length === 0) {
      setThreadModalMessage(
        'Please attach at least one supporting document for Petty Cash replenishment.',
      )
      return
    }

    try {
      setSubmittingReplenish(true)
      setThreadModalMessage(
        'Uploading replenishment document and updating Petty Cash status...',
      )

      const result =
        await window.api.deposit.replenishPettyCash({
          depositId: threadModalDeposit.depositId,
          locationName: user.locationName,
          authorName:
            user.displayName || user.username,
          authorRole:
            user.role || 'Store',
          remarks: replenishRemarks.trim(),
          attachmentPaths: replenishAttachments.map(
            (item) => item.filePath,
          ),
        })

      setThreadModalMessage(result.message)

      if (!result.success) {
        return
      }

      setShowReplenishBox(false)
      setReplenishRemarks('')
      setReplenishAttachments([])

      const refreshed =
        await window.api.deposit.getThread(
          threadModalDeposit.depositId,
          user.locationName,
        )

      if (refreshed.success) {
        if (refreshed.deposit) {
          setThreadModalDeposit(refreshed.deposit)
        }
        setThreadEntries(refreshed.threads)
      }

      await loadHistory(page, pageSize)
    } catch (error) {
      setThreadModalMessage(
        error instanceof Error
          ? error.message
          : 'Unable to replenish Petty Cash.',
      )
    } finally {
      setSubmittingReplenish(false)
    }
  }

  // =========================================================
  // ATTACHMENT VIEWER
  // =========================================================

  async function openAttachmentFile(
    target: {
      depositId: number
      filename: string
      title: string
      allowReplace: boolean
    },
  ) {
    if (!target.filename) {
      setHistoryMessage(
        'No attachment filename available.',
      )

      return
    }

    setAttachmentTarget(
      target,
    )

    setAttachmentPreview(
      '',
    )

    setAttachmentMessage(
      'Loading attachment...',
    )

    setAttachmentZoom(
      1,
    )

    setAttachmentRotation(
      0,
    )

    try {
      setLoadingAttachment(
        true,
      )

      const result =
        await window.api.deposit
          .getAttachment(
            target.filename,
          )

      setAttachmentMessage(
        result.message,
      )

      if (
        result.success
      ) {
        setAttachmentPreview(
          result.previewDataUrl,
        )
      }
    } catch (error) {
      setAttachmentMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load attachment.',
      )
    } finally {
      setLoadingAttachment(
        false,
      )
    }
  }

  async function openAttachment(
    row: DepositRecord,
  ) {
    await openAttachmentFile({
      depositId: row.depositId,
      filename: row.filename,
      title: 'Deposit Slip Attachment',
      allowReplace: true,
    })
  }

  function closeAttachmentViewer() {
    if (
      loadingAttachment ||
      downloadingAttachment ||
      replacingAttachment
    ) {
      return
    }

    setAttachmentTarget(
      null,
    )

    setAttachmentPreview(
      '',
    )

    setAttachmentMessage(
      '',
    )

    setAttachmentZoom(
      1,
    )

    setAttachmentRotation(
      0,
    )
  }

  function zoomAttachmentIn() {
    setAttachmentZoom(
      (current) =>
        Math.min(
          current + 0.25,
          3,
        ),
    )
  }

  function zoomAttachmentOut() {
    setAttachmentZoom(
      (current) =>
        Math.max(
          current - 0.25,
          0.5,
        ),
    )
  }

  function rotateAttachment() {
    setAttachmentRotation(
      (current) =>
        (current + 90) %
        360,
    )
  }

  function resetAttachmentView() {
    setAttachmentZoom(
      1,
    )

    setAttachmentRotation(
      0,
    )
  }

  async function downloadAttachment() {
    if (!attachmentTarget) {
      return
    }

    try {
      setDownloadingAttachment(
        true,
      )

      const result =
        await window.api.deposit
          .downloadAttachment(
            attachmentTarget.filename,
          )

      if (
        !result.canceled
      ) {
        setAttachmentMessage(
          result.message,
        )
      }
    } catch (error) {
      setAttachmentMessage(
        error instanceof Error
          ? error.message
          : 'Unable to download attachment.',
      )
    } finally {
      setDownloadingAttachment(
        false,
      )
    }
  }

  async function replaceAttachment() {
    if (!attachmentTarget) {
      return
    }

    try {
      setReplacingAttachment(
        true,
      )

      setAttachmentMessage(
        'Replacing attachment...',
      )

      const result =
        await window.api.deposit
          .replaceAttachment(
            attachmentTarget.filename,
          )

      if (
        result.canceled
      ) {
        setAttachmentMessage(
          'Replace canceled.',
        )

        return
      }

      setAttachmentMessage(
        result.message,
      )

      if (
        result.success
      ) {
        setAttachmentPreview(
          result.previewDataUrl,
        )
      }
    } catch (error) {
      setAttachmentMessage(
        error instanceof Error
          ? error.message
          : 'Unable to replace attachment.',
      )
    } finally {
      setReplacingAttachment(
        false,
      )
    }
  }

  // =========================================================
  // DELETE REQUEST, REVERT & FINAL DELETE
  // =========================================================

  function handleDeleteActionClick(
    row: DepositRecord,
  ) {
    if (row.deleteStatus === 'Delete Approved') {
      setDeleteTarget(row)
      return
    }

    setDeleteRequestReason('')
    setRequestDeleteTarget(row)
  }

  async function submitDeleteRequest() {
    if (!user || !requestDeleteTarget) {
      return
    }

    const reason =
      deleteRequestReason.trim()

    if (!reason) {
      setHistoryMessage(
        'Please enter a reason for requesting deposit deletion.',
      )
      return
    }

    const target =
      requestDeleteTarget
    setRequestDeleteTarget(null)
    setDeleteRequestReason('')

    try {
      setRequestingDelete(true)

      const result =
        await window.api.deposit.requestDelete({
          depositId: target.depositId,
          locationName: user.locationName,
          authorName:
            user.displayName || user.username,
          authorRole:
            user.role || 'Store',
          reason,
        })

      setHistoryMessage(result.message)

      if (!result.success) {
        return
      }

      if (editingDepositId === target.depositId) {
        setShowFormModal(false)
        resetForm()
      }

      await loadHistory(page, pageSize)
    } catch (error) {
      setHistoryMessage(
        error instanceof Error
          ? error.message
          : 'Unable to submit delete request.',
      )
    } finally {
      setRequestingDelete(false)
    }
  }

  async function submitRevertDeleteRequest() {
    if (!user || !revertDeleteTarget) {
      return
    }

    const target =
      revertDeleteTarget
    setRevertDeleteTarget(null)

    try {
      setRevertingDelete(true)

      const result =
        await window.api.deposit.revertDelete({
          depositId: target.depositId,
          locationName: user.locationName,
          authorName:
            user.displayName || user.username,
          authorRole:
            user.role || 'Store',
        })

      setHistoryMessage(result.message)

      if (!result.success) {
        return
      }

      await loadHistory(page, pageSize)
    } catch (error) {
      setHistoryMessage(
        error instanceof Error
          ? error.message
          : 'Unable to revert delete request.',
      )
    } finally {
      setRevertingDelete(false)
    }
  }

  async function deleteDeposit() {
    if (
      !user ||
      !deleteTarget
    ) {
      return
    }

    const targetId =
      deleteTarget.depositId

    setDeleteTarget(
      null,
    )

    try {
      setDeleting(
        true,
      )

      const result =
        await window.api.deposit
          .delete(
            targetId,
            user.locationName,
          )

      setHistoryMessage(
        result.message,
      )

      if (!result.success) {
        return
      }

      if (
        editingDepositId ===
        targetId
      ) {
        setShowFormModal(
          false,
        )

        resetForm()
      }

      if (
        attachmentTarget?.depositId ===
        targetId
      ) {
        setAttachmentTarget(
          null,
        )

        setAttachmentPreview(
          '',
        )

        setAttachmentMessage(
          '',
        )
      }

      if (
        threadModalDeposit?.depositId ===
        targetId
      ) {
        setThreadModalDeposit(null)
        setThreadEntries([])
      }

      const nextPage =
        rows.length === 1 &&
        page > 1
          ? page - 1
          : page

      setPage(
        nextPage,
      )

      await loadHistory(
        nextPage,
        pageSize,
      )
    } catch (error) {
      console.error(
        'Unable to delete deposit:',
        error,
      )

      setHistoryMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete deposit.',
      )
    } finally {
      setDeleting(
        false,
      )
    }
  }

  return (
    <div>

      {/* =====================================================
          DEPOSIT HISTORY
          ===================================================== */}

      <section
        className="
          card
          border
          rounded-4
          overflow-hidden
        "
      >
        <div
          className="
            card-header
            bg-white
            border-bottom
            py-3
          "
        >
          <div
            className="
              d-flex
              flex-column
              flex-xl-row
              justify-content-between
              align-items-xl-center
              gap-3
            "
          >
            <div>
              <h2 className="h6 fw-bold mb-1">
                Deposit History &amp; Monitoring
              </h2>

              <p className="small text-secondary mb-0">
                Track deposits, approval status, Petty Cash replenishment, Open Sales borrowings, Dept. Expenses, and backtracking threads.
              </p>
            </div>

            <button
              type="button"
              className="
                btn
                btn-primary
                d-flex
                align-items-center
                gap-2
              "
              disabled={
                formBusy
              }
              onClick={
                openNewDeposit
              }
            >
              <Plus
                size={18}
              />

              New Deposit
            </button>
          </div>

          <div className="row g-2 mt-2">
            <div className="col-12 col-lg-5">
              <div className="input-group">
                <span className="input-group-text">
                  <Search
                    size={16}
                  />
                </span>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Search ID, reference, status, department, borrower, amount..."
                  value={
                    keyword
                  }
                  onChange={(
                    event,
                  ) =>
                    setKeyword(
                      event.target
                        .value,
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      'Enter'
                    ) {
                      void applyFilters()
                    }
                  }}
                />
              </div>
            </div>

            <div className="col-6 col-md-3 col-lg-2">
              <select
                className="form-select"
                value={
                  month
                }
                onChange={(
                  event,
                ) =>
                  setMonth(
                    event.target
                      .value,
                  )
                }
              >
                <option value="">
                  All Months
                </option>

                {[
                  'January',
                  'February',
                  'March',
                  'April',
                  'May',
                  'June',
                  'July',
                  'August',
                  'September',
                  'October',
                  'November',
                  'December',
                ].map(
                  (
                    name,
                    index,
                  ) => (
                    <option
                      key={
                        name
                      }
                      value={
                        index + 1
                      }
                    >
                      {name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="col-6 col-md-3 col-lg-2">
              <input
                type="number"
                className="form-control"
                min="2000"
                max="2100"
                placeholder="Year"
                value={
                  year
                }
                onChange={(
                  event,
                ) =>
                  setYear(
                    event.target
                      .value,
                  )
                }
              />
            </div>

            <div className="col-12 col-md-auto">
              <button
                type="button"
                className="
                  btn
                  btn-outline-secondary
                  d-flex
                  align-items-center
                  justify-content-center
                  gap-2
                  w-100
                "
                disabled={
                  loadingHistory
                }
                onClick={() =>
                  void applyFilters()
                }
              >
                <RefreshCw
                  size={16}
                  className={
                    loadingHistory
                      ? 'spin'
                      : ''
                  }
                />

                Apply
              </button>
            </div>
          </div>
        </div>

        <div className="px-3 pt-3">
          <div
            className={`alert ${historyMessageClass} py-2 px-3 small mb-0`}
            role="status"
          >
            {historyMessage}
          </div>
        </div>

        <div className="table-responsive">
          <table
            className="
              table
              table-hover
              align-middle
              mb-0
              small
              deposit-history-table
            "
          >
            <thead className="table-light">
              <tr>
                <th className="text-center">Actions</th>
                <th>ID</th>
                <th>Approval</th>
                <th>Business Date</th>
                <th>Deposit Date</th>
                <th>Reference</th>
                <th className="text-end">POS</th>
                <th className="text-end">Deposit</th>
                <th className="text-end">Petty Cash</th>
                <th className="text-end">BIR 2307</th>
                <th className="text-end">Open Sales</th>
                <th className="text-end">Other Expense</th>
                <th className="text-end">Variance</th>
                <th>Filename</th>
              </tr>
            </thead>

            <tbody>
              {loadingHistory ? (
                <tr>
                  <td
                    colSpan={14}
                    className="text-center py-5"
                  >
                    <span
                      className="
                        spinner-border
                        spinner-border-sm
                        text-primary
                        me-2
                      "
                    />

                    Loading deposits...
                  </td>
                </tr>
              ) : rows.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={14}
                    className="
                      text-center
                      text-secondary
                      py-5
                    "
                  >
                    No deposit records found.
                  </td>
                </tr>
              ) : (
                rows.map(
                  (row) => (
                    <tr
                      key={
                        row.depositId
                      }
                    >
                      <td>
                        <div
                          className="
                            d-flex
                            justify-content-end
                            gap-1
                          "
                        >
                          <button
                            type="button"
                            className="
                              btn
                              btn-sm
                              btn-outline-secondary
                            "
                            title="View deposit slip attachment"
                            disabled={
                              !row.filename ||
                              loadingAttachment ||
                              deleting
                            }
                            onClick={() =>
                              void openAttachment(
                                row,
                              )
                            }
                          >
                            <Eye
                              size={15}
                            />
                          </button>

                          <button
                            type="button"
                            className={`
                              btn
                              btn-sm
                              ${
                                row.threadCount > 0 ||
                                row.approvalStatus === 'Pending'
                                  ? 'btn-outline-primary'
                                  : 'btn-outline-secondary'
                              }
                              d-inline-flex
                              align-items-center
                              gap-1
                            `}
                            title="View Monitoring Thread & Supporting Documents"
                            disabled={
                              loadingThread ||
                              deleting
                            }
                            onClick={() =>
                              void openThreadModal(
                                row,
                                false,
                              )
                            }
                          >
                            <MessageSquare
                              size={15}
                            />
                            {row.threadCount > 0 && (
                              <span
                                className="badge text-bg-primary rounded-pill"
                                style={{ fontSize: '0.68rem' }}
                              >
                                {row.threadCount}
                              </span>
                            )}
                          </button>

                          {row.pettyCash > 0 &&
                            row.pettyCashStatus === 'Unreplenished' && (
                              <button
                                type="button"
                                className="
                                  btn
                                  btn-sm
                                  btn-outline-success
                                "
                                title="Replenish Petty Cash (Upload supporting document)"
                                disabled={
                                  loadingThread ||
                                  deleting
                                }
                                onClick={() =>
                                  void openThreadModal(
                                    row,
                                    true,
                                  )
                                }
                              >
                                <CheckCircle2
                                  size={15}
                                />
                              </button>
                            )}

                          <button
                            type="button"
                            className="
                              btn
                              btn-sm
                              btn-outline-secondary
                            "
                            title="Edit deposit"
                            disabled={
                              loadingRecord ||
                              deleting
                            }
                            onClick={() =>
                              void editFromHistory(
                                row,
                              )
                            }
                          >
                            <Pencil
                              size={15}
                            />
                          </button>

                          {row.deleteStatus !== 'None' && (
                            <button
                              type="button"
                              className="
                                btn
                                btn-sm
                                btn-outline-warning
                              "
                              title={`Revert / Cancel Delete Request (${row.deleteStatus})`}
                              disabled={
                                loadingRecord ||
                                deleting ||
                                requestingDelete ||
                                revertingDelete
                              }
                              onClick={() =>
                                setRevertDeleteTarget(
                                  row,
                                )
                              }
                            >
                              <RotateCcw
                                size={15}
                              />
                            </button>
                          )}

                          <button
                            type="button"
                            className={`
                              btn
                              btn-sm
                              ${
                                row.deleteStatus === 'Delete Approved'
                                  ? 'btn-danger'
                                  : 'btn-outline-danger'
                              }
                            `}
                            title={
                              row.deleteStatus === 'Delete Approved'
                                ? 'Delete Approved — Click to Confirm Permanent Delete (DB + FTP)'
                                : row.deleteStatus === 'Pending Delete'
                                  ? 'Pending Area Manager Delete Approval'
                                  : 'Request Delete (Subject for Area Manager Approval)'
                            }
                            disabled={
                              loadingRecord ||
                              deleting ||
                              requestingDelete ||
                              revertingDelete ||
                              row.deleteStatus === 'Pending Delete'
                            }
                            onClick={() =>
                              handleDeleteActionClick(
                                row,
                              )
                            }
                          >
                            <Trash2
                              size={15}
                            />
                          </button>
                        </div>
                      </td>

                      <td className="fw-semibold">
                        #{row.depositId}
                      </td>

                      <td>
                        <div className="d-flex flex-column gap-1 align-items-start">
                          <ApprovalBadge
                            status={row.approvalStatus}
                            approvedBy={row.approvedBy}
                            approvedAt={row.approvedAt}
                          />
                          {row.deleteStatus !== 'None' && (
                            <DeleteStatusBadge
                              status={row.deleteStatus}
                              approvedBy={row.deleteApprovedBy}
                              reason={row.deleteReason}
                            />
                          )}
                        </div>
                      </td>

                      <td>
                        {formatDate(
                          row.businessDate,
                        )}
                      </td>

                      <td>
                        {formatDate(
                          row.depositDate,
                        )}
                      </td>

                      <td>
                        {row.depositReference ||
                          '—'}
                      </td>

                      <MoneyCell
                        value={
                          row.posAmount
                        }
                      />

                      <MoneyCell
                        value={
                          row.depositAmount
                        }
                      />

                      <td className="text-end">
                        <div>
                          ₱{formatMoney(row.pettyCash)}
                        </div>
                        {row.pettyCash > 0 && (
                          <span
                            className={`badge rounded-pill ${
                              row.pettyCashStatus === 'Replenished'
                                ? 'text-bg-success'
                                : 'text-bg-warning'
                            }`}
                            style={{ fontSize: '0.68rem' }}
                          >
                            {row.pettyCashStatus}
                          </span>
                        )}
                      </td>

                      <MoneyCell
                        value={
                          row.bir2307
                        }
                      />

                      <td className="text-end">
                        <div>
                          ₱{formatMoney(row.openSales)}
                        </div>
                        {row.openSales > 0 &&
                          row.openSalesSourceDate && (
                            <div
                              className="text-secondary"
                              style={{ fontSize: '0.72rem' }}
                              title={`Borrowed from Business Date ${row.openSalesSourceDate}`}
                            >
                              From: {formatDate(row.openSalesSourceDate)}
                            </div>
                          )}
                      </td>

                      <td className="text-end">
                        <div>
                          ₱{formatMoney(row.otherDepartmentExpense)}
                        </div>
                        {row.otherDepartmentExpense > 0 &&
                          row.deptExpenseDepartment && (
                            <div
                              className="text-secondary text-truncate ms-auto"
                              style={{
                                fontSize: '0.72rem',
                                maxWidth: 140,
                              }}
                              title={`${row.deptExpenseDepartment} — Borrowed by ${row.deptExpenseBorrower}`}
                            >
                              {row.deptExpenseDepartment}
                              {row.deptExpenseBorrower
                                ? ` (${row.deptExpenseBorrower})`
                                : ''}
                            </div>
                          )}
                      </td>

                      <td
                        className={`text-end fw-semibold ${
                          row.variance ===
                          0
                            ? ''
                            : row.variance >
                                0
                              ? 'text-warning'
                              : 'text-danger'
                        }`}
                      >
                        ₱
                        {formatMoney(
                          row.variance,
                        )}
                      </td>

                      <td
                        className="text-truncate"
                        style={{
                          maxWidth:
                            160,
                        }}
                        title={
                          row.filename
                        }
                      >
                        {row.filename ||
                          '—'}
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>

        <div
          className="
            card-footer
            bg-white
            border-top
            d-flex
            flex-column
            flex-sm-row
            align-items-sm-center
            justify-content-between
            gap-3
            py-3
          "
        >
          <div
            className="
              d-flex
              align-items-center
              gap-2
              small
              text-secondary
            "
          >
            <span>
              Rows per page
            </span>

            <select
              className="
                form-select
                form-select-sm
                deposit-page-size
              "
              value={
                pageSize
              }
              disabled={
                loadingHistory
              }
              onChange={(
                event,
              ) =>
                void changePageSize(
                  Number(
                    event.target
                      .value,
                  ),
                )
              }
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div
            className="
              d-flex
              align-items-center
              gap-2
            "
          >
            <span className="small text-secondary">
              Page{' '}
              {totalPages ===
              0
                ? 0
                : page}{' '}
              of{' '}
              {totalPages}
            </span>

            <button
              type="button"
              className="
                btn
                btn-sm
                btn-outline-secondary
              "
              disabled={
                page <= 1 ||
                loadingHistory
              }
              onClick={() =>
                void changePage(
                  page - 1,
                )
              }
            >
              <ChevronLeft
                size={16}
              />
            </button>

            <button
              type="button"
              className="
                btn
                btn-sm
                btn-outline-secondary
              "
              disabled={
                page >=
                  totalPages ||
                totalPages ===
                  0 ||
                loadingHistory
              }
              onClick={() =>
                void changePage(
                  page + 1,
                )
              }
            >
              <ChevronRight
                size={16}
              />
            </button>

            <span
              className="
                badge
                rounded-pill
                deposit-location-badge
                small
                align-self-center
              "
            >
              {totalRecords}{' '}
              record
              {totalRecords ===
              1
                ? ''
                : 's'}
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================
          NEW / EDIT MODAL
          ===================================================== */}

      {showFormModal && (
        <>
          <div
            className="
              modal
              fade
              show
              d-block
            "
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            style={{
              zIndex: 1055,
            }}
          >
            <div
              className="
                modal-dialog
                modal-xl
                modal-dialog-centered
                modal-dialog-scrollable
              "
            >
              <div className="modal-content border-0 shadow">

                <div
                  className="
                    modal-header
                    align-items-start
                  "
                >
                  <div>
                    <h2 className="modal-title h5 fw-bold mb-1">
                      {isEditing
                        ? `Edit Deposit #${editingDepositId}`
                        : 'New Deposit'}
                    </h2>

                    <p className="small text-secondary mb-0">
                      {isEditing
                        ? 'Update the editable deposit information and supporting details below.'
                        : 'Load a finalized ROF, then enter the deposit information and any deduction supporting documents.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="
                      btn
                      btn-sm
                      btn-light
                      border
                      rounded-circle
                      p-2
                      d-flex
                    "
                    aria-label="Close"
                    disabled={
                      formBusy
                    }
                    onClick={
                      closeFormModal
                    }
                  >
                    <X
                      size={18}
                    />
                  </button>
                </div>

                <div className="modal-body">

                  <div className="row g-3 align-items-end mb-4">
                    <div className="col-12 col-md-5 col-xl-4">
                      <label
                        htmlFor="deposit-business-date"
                        className="
                          form-label
                          fw-semibold
                          small
                          d-flex
                          align-items-center
                          gap-2
                        "
                      >
                        <CalendarDays
                          size={16}
                        />

                        Business Date
                      </label>

                      <input
                        id="deposit-business-date"
                        type="date"
                        className="form-control"
                        value={
                          businessDate
                        }
                        max={
                          todayString()
                        }
                        disabled={
                          formBusy ||
                          isEditing
                        }
                        onChange={(
                          event,
                        ) => {
                          setBusinessDate(
                            event.target
                              .value,
                          )

                          setPosAmount(
                            0,
                          )

                          setDepositAmount(
                            0,
                          )

                          setRofLoaded(
                            false,
                          )

                          setLocalFilePath(
                            '',
                          )

                          setFilename(
                            '',
                          )

                          setPreviewDataUrl(
                            '',
                          )

                          setFormMessage(
                            'Click Load ROF to continue.',
                          )
                        }}
                      />
                    </div>

                    {!isEditing && (
                      <div className="col-12 col-md-auto">
                        <button
                          type="button"
                          className="
                            btn
                            btn-primary
                            d-flex
                            align-items-center
                            justify-content-center
                            gap-2
                            w-100
                          "
                          disabled={
                            loadingRof ||
                            !businessDate
                          }
                          onClick={
                            loadRof
                          }
                        >
                          <RefreshCw
                            size={17}
                            className={
                              loadingRof
                                ? 'spin'
                                : ''
                            }
                          />

                          Load ROF
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-4">
                      <DepositMetric
                        icon={
                          <WalletCards
                            size={19}
                          />
                        }
                        label="ROF POS Amount"
                        value={
                          posAmount
                        }
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <DepositMetric
                        icon={
                          <Banknote
                            size={19}
                          />
                        }
                        label="ROF Actual Cash"
                        value={
                          depositAmount
                        }
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <DepositMetric
                        icon={
                          <WalletCards
                            size={19}
                          />
                        }
                        label="Current Variance"
                        value={
                          variance
                        }
                        variance
                      />
                    </div>
                  </div>

                  <div
                    className={`alert ${formMessageClass} py-2 px-3 small fw-medium`}
                    role="alert"
                  >
                    {formMessage}
                  </div>

                  {requiresApproval && (
                    <div
                      className="alert alert-warning d-flex align-items-start gap-2 py-2 px-3 small mb-3"
                      role="status"
                    >
                      <AlertTriangle
                        size={18}
                        className="flex-shrink-0 mt-1"
                      />
                      <div>
                        <strong>Subject for Approval:</strong> Because Petty Cash, Open Sales, or Other Department Expense is greater than ₱0.00, this deposit will be marked as{' '}
                        <span className="badge text-bg-warning">Pending Approval</span>{' '}
                        for the Area Manager in the Web Portal, and your remarks &amp; supporting documents will be recorded in the backtracking thread.
                      </div>
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-12 col-md-6 col-xl-4">
                      <label
                        htmlFor="deposit-date"
                        className="form-label fw-semibold small"
                      >
                        Deposit Date
                      </label>

                      <input
                        id="deposit-date"
                        type="date"
                        className="form-control"
                        value={
                          depositDate
                        }
                        disabled={
                          !rofLoaded ||
                          formBusy
                        }
                        onChange={(
                          event,
                        ) =>
                          setDepositDate(
                            event.target
                              .value,
                          )
                        }
                      />
                    </div>

                    <div className="col-12 col-md-6 col-xl-4">
                      <label
                        htmlFor="deposit-reference"
                        className="form-label fw-semibold small"
                      >
                        Deposit Ref#
                      </label>

                      <input
                        id="deposit-reference"
                        type="text"
                        className="form-control"
                        placeholder="Enter bank/reference number"
                        value={
                          depositReference
                        }
                        disabled={
                          !rofLoaded ||
                          formBusy
                        }
                        onChange={(
                          event,
                        ) =>
                          setDepositReference(
                            event.target
                              .value,
                          )
                        }
                      />
                    </div>

                    <div className="col-12 col-xl-4">
                      <label
                        className="form-label fw-semibold small"
                      >
                        Deposit Slip Attachment
                      </label>

                      <div className="input-group">
                        <span className="input-group-text">
                          <FileText
                            size={16}
                          />
                        </span>

                        <input
                          type="text"
                          className="form-control"
                          value={
                            filename
                          }
                          placeholder="No file selected"
                          readOnly
                          disabled={
                            isEditing
                          }
                        />

                        {!isEditing && (
                          <button
                            type="button"
                            className="
                              btn
                              btn-outline-secondary
                              d-flex
                              align-items-center
                              gap-2
                            "
                            disabled={
                              !rofLoaded ||
                              formBusy
                            }
                            onClick={() =>
                              void browseAttachment()
                            }
                          >
                            <Upload
                              size={16}
                            />

                            Browse
                          </button>
                        )}
                      </div>

                      {previewDataUrl &&
                        !isEditing && (
                          <div
                            className="
                              border
                              rounded-3
                              mt-2
                              p-2
                              bg-light
                            "
                          >
                            <img
                              src={
                                previewDataUrl
                              }
                              alt="Deposit attachment preview"
                              className="
                                img-fluid
                                rounded-2
                                d-block
                                mx-auto
                              "
                              style={{
                                maxHeight:
                                  180,
                                objectFit:
                                  'contain',
                              }}
                            />
                          </div>
                        )}

                      {isEditing &&
                        filename && (
                          <div className="form-text">
                            Existing attachment:{' '}
                            {filename}
                          </div>
                        )}
                    </div>

                    <AmountField
                      id="deposit-petty-cash"
                      label="Petty Cash"
                      value={
                        pettyCash
                      }
                      disabled={
                        !rofLoaded ||
                        formBusy
                      }
                      onChange={
                        setPettyCash
                      }
                    />

                    <AmountField
                      id="deposit-bir-2307"
                      label="BIR 2307"
                      value={
                        bir2307
                      }
                      disabled={
                        !rofLoaded ||
                        formBusy
                      }
                      onChange={
                        setBir2307
                      }
                    />

                    <AmountField
                      id="deposit-open-sales"
                      label="Open Sales"
                      value={
                        openSales
                      }
                      disabled={
                        !rofLoaded ||
                        formBusy
                      }
                      onChange={
                        setOpenSales
                      }
                    />

                    <AmountField
                      id="deposit-other-expense"
                      label="Other Department Expense"
                      value={
                        otherDepartmentExpense
                      }
                      disabled={
                        !rofLoaded ||
                        formBusy
                      }
                      onChange={
                        setOtherDepartmentExpense
                      }
                    />
                  </div>

                  {/* =================================================
                      CONDITIONAL SECTION 1: PETTY CASH DETAILS
                      ================================================= */}
                  {pettyCash > 0 && (
                    <div className="card border-warning-subtle bg-light rounded-4 p-3 mt-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h3 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                          <Banknote size={17} className="text-warning" />
                          Petty Cash Supporting Details (₱{formatMoney(pettyCash)})
                        </h3>
                        <span className="badge text-bg-warning">
                          Requires Supporting Document &amp; Replenishment Tracking
                        </span>
                      </div>

                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small">
                            Petty Cash Remarks / Breakdown{' '}
                            {(!isEditing || (originalEditRecord?.pettyCash ?? 0) <= 0) && (
                              <span className="text-danger">*</span>
                            )}
                          </label>
                          <textarea
                            className="form-control form-control-sm"
                            rows={2}
                            placeholder={
                              isEditing && (originalEditRecord?.pettyCash ?? 0) > 0
                                ? 'Optional follow-up remark for Petty Cash update...'
                                : 'Describe the Petty Cash vouchers/items used...'
                            }
                            value={pettyCashRemarks}
                            disabled={formBusy}
                            onChange={(e) => setPettyCashRemarks(e.target.value)}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small d-flex justify-content-between">
                            <span>
                              Supporting Document(s) (Voucher / Receipt){' '}
                              {(!isEditing || (originalEditRecord?.pettyCash ?? 0) <= 0) && (
                                <span className="text-danger">*</span>
                              )}
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary py-0 px-2 d-inline-flex align-items-center gap-1"
                              disabled={formBusy}
                              onClick={() => void browsePettyCashAttachments()}
                            >
                              <Upload size={14} />
                              Add File(s)
                            </button>
                          </label>

                          <AttachmentListPreview
                            files={pettyCashAttachments}
                            emptyText={
                              isEditing && (originalEditRecord?.pettyCash ?? 0) > 0
                                ? 'Existing supporting files are in the thread. Select files to attach more.'
                                : 'No supporting document selected yet.'
                            }
                            onRemove={(filePath) =>
                              setPettyCashAttachments((prev) =>
                                prev.filter((item) => item.filePath !== filePath),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =================================================
                      CONDITIONAL SECTION 2: OPEN SALES (BORROWED FUNDS)
                      ================================================= */}
                  {openSales > 0 && (
                    <div className="card border-info-subtle bg-light rounded-4 p-3 mt-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h3 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                          <CalendarDays size={17} className="text-primary" />
                          Open Sales — Borrowed Funds Details (₱{formatMoney(openSales)})
                        </h3>
                        <span className="badge text-bg-info">
                          Borrowed from Undeposited Day
                        </span>
                      </div>

                      <div className="row g-3">
                        <div className="col-12 col-md-5">
                          <label className="form-label fw-semibold small">
                            Borrowed From Business Date (Not Yet Deposited){' '}
                            <span className="text-danger">*</span>
                          </label>
                          <input
                            type="date"
                            className={`form-control form-control-sm ${
                              openSalesDateInvalid ? 'is-invalid' : ''
                            }`}
                            value={openSalesSourceDate}
                            max={todayString()}
                            disabled={formBusy}
                            onChange={(e) =>
                              void handleOpenSalesSourceDateChange(e.target.value)
                            }
                          />
                          {openSalesDateStatusMsg && (
                            <div
                              className={`small mt-1 ${
                                openSalesDateInvalid ? 'text-danger' : 'text-success'
                              }`}
                            >
                              {openSalesDateStatusMsg}
                            </div>
                          )}
                        </div>

                        <div className="col-12 col-md-7">
                          <label className="form-label fw-semibold small">
                            Open Sales Remarks / Reason{' '}
                            {(!isEditing || (originalEditRecord?.openSales ?? 0) <= 0) && (
                              <span className="text-danger">*</span>
                            )}
                          </label>
                          <textarea
                            className="form-control form-control-sm"
                            rows={2}
                            placeholder={
                              isEditing && (originalEditRecord?.openSales ?? 0) > 0
                                ? 'Optional follow-up remark for Open Sales...'
                                : 'Explain why funds were borrowed from the selected Business Date...'
                            }
                            value={openSalesRemarks}
                            disabled={formBusy}
                            onChange={(e) => setOpenSalesRemarks(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =================================================
                      CONDITIONAL SECTION 3: OTHER DEPARTMENT EXPENSE
                      ================================================= */}
                  {otherDepartmentExpense > 0 && (
                    <div className="card border-secondary-subtle bg-light rounded-4 p-3 mt-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h3 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
                          <Building2 size={17} className="text-secondary" />
                          Other Department Expense — Borrowed Funds Details (₱
                          {formatMoney(otherDepartmentExpense)})
                        </h3>
                        <span className="badge text-bg-secondary">
                          Department Borrowed Fund &amp; Supporting Doc
                        </span>
                      </div>

                      <div className="row g-3">
                        <div className="col-12 col-md-4">
                          <label className="form-label fw-semibold small">
                            Borrowing Department Name{' '}
                            <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="e.g., Marketing, Maintenance, Commissary..."
                            value={deptExpenseDepartment}
                            disabled={formBusy}
                            onChange={(e) => setDeptExpenseDepartment(e.target.value)}
                          />
                        </div>

                        <div className="col-12 col-md-4">
                          <label className="form-label fw-semibold small">
                            Borrowed By (Person Name){' '}
                            <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Enter name of borrower / requestor"
                            value={deptExpenseBorrower}
                            disabled={formBusy}
                            onChange={(e) => setDeptExpenseBorrower(e.target.value)}
                          />
                        </div>

                        <div className="col-12 col-md-4">
                          <label className="form-label fw-semibold small">
                            Purpose / Remarks{' '}
                            {(!isEditing ||
                              (originalEditRecord?.otherDepartmentExpense ?? 0) <=
                                0) && <span className="text-danger">*</span>}
                          </label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Enter expense purpose / details"
                            value={deptExpenseRemarks}
                            disabled={formBusy}
                            onChange={(e) => setDeptExpenseRemarks(e.target.value)}
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold small d-flex justify-content-between">
                            <span>
                              Supporting Document(s) (Receipt / Borrow Slip){' '}
                              {(!isEditing ||
                                (originalEditRecord?.otherDepartmentExpense ?? 0) <=
                                  0) && <span className="text-danger">*</span>}
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary py-0 px-2 d-inline-flex align-items-center gap-1"
                              disabled={formBusy}
                              onClick={() => void browseDeptExpenseAttachments()}
                            >
                              <Upload size={14} />
                              Add File(s)
                            </button>
                          </label>

                          <AttachmentListPreview
                            files={deptExpenseAttachments}
                            emptyText={
                              isEditing &&
                              (originalEditRecord?.otherDepartmentExpense ?? 0) > 0
                                ? 'Existing supporting files are in the thread. Select files to attach more.'
                                : 'No supporting document selected yet.'
                            }
                            onRemove={(filePath) =>
                              setDeptExpenseAttachments((prev) =>
                                prev.filter((item) => item.filePath !== filePath),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  {isEditing && (
                    <button
                      type="button"
                      className="
                        btn
                        btn-outline-danger
                        me-auto
                        d-flex
                        align-items-center
                        gap-2
                      "
                      disabled={
                        formBusy
                      }
                      onClick={() => {
                        const current =
                          rows.find(
                            (row) =>
                              row.depositId ===
                              editingDepositId,
                          )

                        if (current) {
                          handleDeleteActionClick(
                            current,
                          )
                        }
                      }}
                    >
                      <Trash2
                        size={17}
                      />

                      {originalEditRecord?.deleteStatus === 'Delete Approved'
                        ? 'Confirm Delete'
                        : 'Request Delete'}
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={
                      formBusy
                    }
                    onClick={
                      closeFormModal
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="
                      btn
                      btn-primary
                      d-flex
                      align-items-center
                      gap-2
                    "
                    disabled={
                      !rofLoaded ||
                      formBusy
                    }
                    onClick={
                      requestSave
                    }
                  >
                    <Save
                      size={17}
                    />

                    {saving
                      ? isEditing
                        ? 'Updating...'
                        : 'Saving...'
                      : isEditing
                        ? 'Update Deposit'
                        : 'Save Deposit'}
                  </button>
                </div>

              </div>
            </div>
          </div>

          <div
            className="
              modal-backdrop
              fade
              show
            "
            style={{
              zIndex: 1050,
            }}
          />
        </>
      )}

      {/* =====================================================
          MONITORING THREAD & PETTY CASH REPLENISHMENT MODAL
          ===================================================== */}

      {threadModalDeposit && (
        <>
          <div
            className="modal fade show d-block"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            style={{ zIndex: 1060 }}
          >
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow">
                <div className="modal-header align-items-start">
                  <div>
                    <h2 className="modal-title h5 fw-bold mb-1 d-flex align-items-center gap-2">
                      <MessageSquare size={20} className="text-primary" />
                      Deposit #{threadModalDeposit.depositId} — Monitoring Thread &amp; Backtracking
                    </h2>
                    <div className="small text-secondary d-flex flex-wrap align-items-center gap-2">
                      <span>
                        Business Date:{' '}
                        <strong>{formatDate(threadModalDeposit.businessDate)}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Ref#: <strong>{threadModalDeposit.depositReference}</strong>
                      </span>
                      <span>·</span>
                      <ApprovalBadge
                        status={threadModalDeposit.approvalStatus}
                        approvedBy={threadModalDeposit.approvedBy}
                        approvedAt={threadModalDeposit.approvedAt}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-light border rounded-circle p-2 d-flex"
                    aria-label="Close"
                    disabled={
                      loadingThread ||
                      submittingReply ||
                      submittingReplenish
                    }
                    onClick={closeThreadModal}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-body">
                  {/* Summary Cards for Deductions */}
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-4">
                      <div className="border rounded-3 p-3 bg-light h-100">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="small text-secondary fw-semibold">
                            Petty Cash
                          </span>
                          {threadModalDeposit.pettyCash > 0 && (
                            <span
                              className={`badge rounded-pill ${
                                threadModalDeposit.pettyCashStatus === 'Replenished'
                                  ? 'text-bg-success'
                                  : 'text-bg-warning'
                              }`}
                            >
                              {threadModalDeposit.pettyCashStatus}
                            </span>
                          )}
                        </div>
                        <div className="fw-bold fs-6">
                          ₱{formatMoney(threadModalDeposit.pettyCash)}
                        </div>
                        {threadModalDeposit.pettyCashReplenishedAt && (
                          <div className="small text-success mt-1">
                            Replenished: {formatDateTime(threadModalDeposit.pettyCashReplenishedAt)}
                          </div>
                        )}
                        {threadModalDeposit.pettyCash > 0 &&
                          threadModalDeposit.pettyCashStatus === 'Unreplenished' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-success mt-2 w-100 d-flex align-items-center justify-content-center gap-1"
                              onClick={() => setShowReplenishBox((prev) => !prev)}
                            >
                              <CheckCircle2 size={15} />
                              {showReplenishBox
                                ? 'Hide Replenishment Form'
                                : 'Replenish Petty Cash'}
                            </button>
                          )}
                      </div>
                    </div>

                    <div className="col-12 col-md-4">
                      <div className="border rounded-3 p-3 bg-light h-100">
                        <div className="small text-secondary fw-semibold mb-1">
                          Open Sales (Borrowed Funds)
                        </div>
                        <div className="fw-bold fs-6">
                          ₱{formatMoney(threadModalDeposit.openSales)}
                        </div>
                        {threadModalDeposit.openSales > 0 &&
                          threadModalDeposit.openSalesSourceDate && (
                            <div className="small text-primary mt-1">
                              Borrowed from Business Date:{' '}
                              <strong>
                                {formatDate(threadModalDeposit.openSalesSourceDate)}
                              </strong>
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="col-12 col-md-4">
                      <div className="border rounded-3 p-3 bg-light h-100">
                        <div className="small text-secondary fw-semibold mb-1">
                          Other Dept. Expense
                        </div>
                        <div className="fw-bold fs-6">
                          ₱{formatMoney(threadModalDeposit.otherDepartmentExpense)}
                        </div>
                        {threadModalDeposit.otherDepartmentExpense > 0 &&
                          threadModalDeposit.deptExpenseDepartment && (
                            <div className="small text-secondary mt-1">
                              Dept: <strong>{threadModalDeposit.deptExpenseDepartment}</strong>
                              {threadModalDeposit.deptExpenseBorrower && (
                                <>
                                  {' · '}Borrower:{' '}
                                  <strong>{threadModalDeposit.deptExpenseBorrower}</strong>
                                </>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {threadModalMessage && (
                    <div
                      className={`alert ${getNoticeClass(
                        threadModalMessage,
                      )} py-2 px-3 small mb-3`}
                      role="status"
                    >
                      {threadModalMessage}
                    </div>
                  )}

                  {/* Petty Cash Replenishment Form */}
                  {showReplenishBox &&
                    threadModalDeposit.pettyCash > 0 &&
                    threadModalDeposit.pettyCashStatus === 'Unreplenished' && (
                      <div className="card border-success bg-success-subtle rounded-4 p-3 mb-3">
                        <h3 className="h6 fw-bold text-success-emphasis mb-2 d-flex align-items-center gap-2">
                          <CheckCircle2 size={18} />
                          Replenish Petty Cash (₱{formatMoney(threadModalDeposit.pettyCash)})
                        </h3>
                        <p className="small text-secondary mb-3">
                          Upload the replenishment supporting document(s) and add remarks to mark this Petty Cash deduction as replenished.
                        </p>

                        <div className="row g-3">
                          <div className="col-12 col-md-6">
                            <label className="form-label fw-semibold small">
                              Replenishment Remarks <span className="text-danger">*</span>
                            </label>
                            <textarea
                              className="form-control form-control-sm"
                              rows={2}
                              placeholder="Enter replenishment reference number or remarks..."
                              value={replenishRemarks}
                              disabled={submittingReplenish}
                              onChange={(e) => setReplenishRemarks(e.target.value)}
                            />
                          </div>

                          <div className="col-12 col-md-6">
                            <label className="form-label fw-semibold small d-flex justify-content-between">
                              <span>
                                Supporting Document(s) <span className="text-danger">*</span>
                              </span>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success py-0 px-2 d-inline-flex align-items-center gap-1"
                                disabled={submittingReplenish}
                                onClick={() => void browseReplenishAttachments()}
                              >
                                <Upload size={14} />
                                Select File(s)
                              </button>
                            </label>

                            <AttachmentListPreview
                              files={replenishAttachments}
                              emptyText="No replenishment supporting document selected."
                              onRemove={(filePath) =>
                                setReplenishAttachments((prev) =>
                                  prev.filter((item) => item.filePath !== filePath),
                                )
                              }
                            />
                          </div>

                          <div className="col-12 d-flex justify-content-end gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              disabled={submittingReplenish}
                              onClick={() => setShowReplenishBox(false)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-success d-flex align-items-center gap-1"
                              disabled={submittingReplenish}
                              onClick={() => void handleReplenishPettyCash()}
                            >
                              <CheckCircle2 size={15} />
                              {submittingReplenish
                                ? 'Submitting Replenishment...'
                                : 'Confirm & Upload Replenishment'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Chronological Thread List */}
                  <div className="border rounded-4 p-3 bg-light mb-3" style={{ maxHeight: 360, overflowY: 'auto' }}>
                    <h3 className="h6 fw-bold mb-3">
                      Backtracking &amp; Remarks Timeline ({threadEntries.length})
                    </h3>

                    {loadingThread ? (
                      <div className="text-center py-4 text-secondary small">
                        <span className="spinner-border spinner-border-sm text-primary me-2" />
                        Loading thread entries...
                      </div>
                    ) : threadEntries.length === 0 ? (
                      <div className="text-center py-4 text-secondary small">
                        No remarks or thread entries recorded yet for this deposit.
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {threadEntries.map((entry) => (
                          <div
                            key={entry.threadId}
                            className="bg-white border rounded-3 p-3 shadow-sm"
                          >
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <ThreadCategoryBadge category={entry.category} />
                                <span className="fw-semibold small">
                                  {entry.authorName}
                                </span>
                                <span className="badge text-bg-light border text-secondary">
                                  {entry.authorRole}
                                </span>
                              </div>
                              <span className="small text-secondary">
                                {formatDateTime(entry.createdAt)}
                              </span>
                            </div>

                            <div
                              className="small mb-2"
                              style={{ whiteSpace: 'pre-wrap' }}
                            >
                              {entry.message}
                            </div>

                            {entry.attachments.length > 0 && (
                              <div className="d-flex flex-wrap gap-2 mt-2 pt-2 border-top">
                                {entry.attachments.map((att) => (
                                  <button
                                    key={att.attachmentId}
                                    type="button"
                                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 py-1 px-2"
                                    onClick={() =>
                                      void openAttachmentFile({
                                        depositId: threadModalDeposit.depositId,
                                        filename: att.filename,
                                        title: `${formatCategoryLabel(att.category)} — Supporting Document`,
                                        allowReplace: false,
                                      })
                                    }
                                  >
                                    <Paperclip size={13} />
                                    <span className="small">{att.filename}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Follow-up Remark / Supporting Attachment */}
                  <div className="border rounded-4 p-3 bg-white">
                    <h3 className="h6 fw-bold mb-2">
                      Add Follow-up Remark or Supporting Document
                    </h3>

                    <div className="row g-2">
                      <div className="col-12 col-md-3">
                        <label className="form-label small fw-semibold">
                          Category
                        </label>
                        <select
                          className="form-select form-select-sm"
                          value={replyCategory}
                          disabled={submittingReply}
                          onChange={(e) =>
                            setReplyCategory(
                              e.target.value as DepositThreadCategory,
                            )
                          }
                        >
                          <option value="GENERAL">General / Follow-up</option>
                          <option value="PETTY_CASH">Petty Cash</option>
                          <option value="OPEN_SALES">Open Sales</option>
                          <option value="DEPT_EXPENSE">Other Dept. Expense</option>
                        </select>
                      </div>

                      <div className="col-12 col-md-9">
                        <label className="form-label small fw-semibold d-flex justify-content-between">
                          <span>Remark / Explanation</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary py-0 px-2 d-inline-flex align-items-center gap-1"
                            disabled={submittingReply}
                            onClick={() => void browseReplyAttachments()}
                          >
                            <Paperclip size={13} />
                            Attach Supporting Image(s)
                          </button>
                        </label>
                        <textarea
                          className="form-control form-control-sm"
                          rows={2}
                          placeholder="Write a remark or explanation for backtracking/monitoring..."
                          value={replyMessage}
                          disabled={submittingReply}
                          onChange={(e) => setReplyMessage(e.target.value)}
                        />
                      </div>

                      {replyAttachments.length > 0 && (
                        <div className="col-12">
                          <AttachmentListPreview
                            files={replyAttachments}
                            emptyText=""
                            onRemove={(filePath) =>
                              setReplyAttachments((prev) =>
                                prev.filter((item) => item.filePath !== filePath),
                              )
                            }
                          />
                        </div>
                      )}

                      <div className="col-12 d-flex justify-content-end mt-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                          disabled={submittingReply || !replyMessage.trim()}
                          onClick={() => void handleAddThreadReply()}
                        >
                          <Send size={14} />
                          {submittingReply ? 'Posting...' : 'Post to Thread'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={
                      loadingThread ||
                      submittingReply ||
                      submittingReplenish
                    }
                    onClick={closeThreadModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1058 }}
          />
        </>
      )}

      {/* =====================================================
          ATTACHMENT VIEWER MODAL
          ===================================================== */}

      {attachmentTarget && (
        <>
          <div
            className="
              modal
              fade
              show
              d-block
            "
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            style={{
              zIndex: 1070,
            }}
          >
            <div
              className="
                modal-dialog
                modal-lg
                modal-dialog-centered
                modal-dialog-scrollable
              "
            >
              <div
                className="
                  modal-content
                  border-0
                  shadow
                "
              >
                <div className="modal-header">
                  <div>
                    <h2
                      className="
                        modal-title
                        h5
                        fw-bold
                        mb-1
                        d-flex
                        align-items-center
                        gap-2
                      "
                    >
                      <ImageIcon
                        size={20}
                      />

                      {attachmentTarget.title}
                    </h2>

                    <div className="small text-secondary">
                      Deposit #{attachmentTarget.depositId}
                      {' · '}
                      {attachmentTarget.filename}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="
                      btn
                      btn-sm
                      btn-light
                      border
                      rounded-circle
                      p-2
                      d-flex
                    "
                    aria-label="Close"
                    disabled={
                      loadingAttachment ||
                      downloadingAttachment ||
                      replacingAttachment
                    }
                    onClick={
                      closeAttachmentViewer
                    }
                  >
                    <X
                      size={18}
                    />
                  </button>
                </div>

                <div className="modal-body">
                  <div
                    className="
                      border
                      rounded-4
                      bg-light
                      d-flex
                      align-items-center
                      justify-content-center
                      overflow-auto
                      position-relative
                    "
                    style={{
                      minHeight:
                        380,
                      maxHeight:
                        '68vh',
                    }}
                  >
                    {loadingAttachment ? (
                      <div
                        className="
                          text-center
                          text-secondary
                          py-5
                        "
                      >
                        <span
                          className="
                            spinner-border
                            text-primary
                            mb-3
                          "
                        />

                        <div>
                          Loading image from FTP...
                        </div>
                      </div>
                    ) : attachmentPreview ? (
                      <img
                        src={
                          attachmentPreview
                        }
                        alt={
                          attachmentTarget.filename
                        }
                        className="
                          img-fluid
                          d-block
                          mx-auto
                        "
                        style={{
                          maxHeight:
                            '65vh',
                          maxWidth:
                            '100%',
                          objectFit:
                            'contain',
                          transform:
                            `scale(${attachmentZoom}) rotate(${attachmentRotation}deg)`,
                          transformOrigin:
                            'center center',
                          transition:
                            'transform 180ms ease',
                        }}
                      />
                    ) : (
                      <div
                        className="
                          text-center
                          text-secondary
                          p-5
                        "
                      >
                        <ImageIcon
                          size={42}
                          className="mb-3"
                        />

                        <div>
                          Unable to display the attachment.
                        </div>
                      </div>
                    )}
                  </div>

                  {attachmentPreview && !loadingAttachment && (
                    <div
                      className="
                        d-flex
                        flex-wrap
                        align-items-center
                        justify-content-center
                        gap-2
                        mt-3
                      "
                    >
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                        onClick={zoomAttachmentOut}
                        disabled={
                          attachmentZoom <= 0.5 ||
                          replacingAttachment ||
                          downloadingAttachment
                        }
                      >
                        <ZoomOut size={16} />
                        Zoom Out
                      </button>

                      <span
                        className="
                          badge
                          text-bg-light
                          border
                          px-3
                          py-2
                        "
                      >
                        {Math.round(
                          attachmentZoom * 100,
                        )}%
                      </span>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                        onClick={zoomAttachmentIn}
                        disabled={
                          attachmentZoom >= 3 ||
                          replacingAttachment ||
                          downloadingAttachment
                        }
                      >
                        <ZoomIn size={16} />
                        Zoom In
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                        onClick={rotateAttachment}
                        disabled={
                          replacingAttachment ||
                          downloadingAttachment
                        }
                      >
                        <RotateCw size={16} />
                        Rotate
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-light border"
                        onClick={resetAttachmentView}
                        disabled={
                          replacingAttachment ||
                          downloadingAttachment
                        }
                      >
                        Reset View
                      </button>
                    </div>
                  )}

                  {attachmentMessage && (
                    <div
                      className={`alert ${getNoticeClass(
                        attachmentMessage,
                      )} small mt-3 mb-0`}
                      role="status"
                    >
                      {attachmentMessage}
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="
                      btn
                      btn-outline-secondary
                    "
                    disabled={
                      loadingAttachment ||
                      downloadingAttachment ||
                      replacingAttachment
                    }
                    onClick={
                      closeAttachmentViewer
                    }
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    className="
                      btn
                      btn-outline-secondary
                      d-flex
                      align-items-center
                      gap-2
                    "
                    disabled={
                      loadingAttachment ||
                      downloadingAttachment ||
                      replacingAttachment ||
                      !attachmentPreview
                    }
                    onClick={() =>
                      void downloadAttachment()
                    }
                  >
                    {downloadingAttachment ? (
                      <span
                        className="
                          spinner-border
                          spinner-border-sm
                        "
                      />
                    ) : (
                      <Download
                        size={17}
                      />
                    )}

                    Download
                  </button>

                  {attachmentTarget.allowReplace && (
                    <button
                      type="button"
                      className="
                        btn
                        btn-primary
                        d-flex
                        align-items-center
                        gap-2
                      "
                      disabled={
                        loadingAttachment ||
                        downloadingAttachment ||
                        replacingAttachment
                      }
                      onClick={() =>
                        void replaceAttachment()
                      }
                    >
                      {replacingAttachment ? (
                        <span
                          className="
                            spinner-border
                            spinner-border-sm
                          "
                        />
                      ) : (
                        <Upload
                          size={17}
                        />
                      )}

                      Replace Image
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            className="
              modal-backdrop
              fade
              show
            "
            style={{
              zIndex: 1065,
            }}
          />
        </>
      )}

      {(saving || deleting || requestingDelete || revertingDelete || loadingRof) && (
        <BusyOverlay
          message={
            busyOverlayMessage
          }
        />
      )}

      {/* =====================================================
          REQUEST DELETE APPROVAL MODAL
          ===================================================== */}

      {requestDeleteTarget && (
        <>
          <div
            className="modal fade show d-block"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            style={{ zIndex: 1075 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title h6 fw-bold mb-1 d-flex align-items-center gap-2 text-danger">
                      <Trash2 size={18} />
                      Request Deposit Deletion (#{requestDeleteTarget.depositId})
                    </h2>
                    <div className="small text-secondary">
                      Business Date: {formatDate(requestDeleteTarget.businessDate)} · Ref#: {requestDeleteTarget.depositReference}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border rounded-circle p-2 d-flex"
                    aria-label="Close"
                    disabled={requestingDelete}
                    onClick={() => setRequestDeleteTarget(null)}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="alert alert-warning small py-2 px-3 mb-3">
                    <strong>Approval Restriction:</strong> Deleting a deposit requires Area Manager approval in the Web Portal. Once approved, you can confirm the final deletion (which will permanently remove the database record, threads/remarks, and FTP attachments), or you can revert the request at any time before confirming.
                  </div>

                  <label className="form-label fw-semibold small">
                    Reason / Remarks for Deletion <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Explain why this deposit needs to be deleted..."
                    value={deleteRequestReason}
                    disabled={requestingDelete}
                    onChange={(e) => setDeleteRequestReason(e.target.value)}
                  />
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={requestingDelete}
                    onClick={() => setRequestDeleteTarget(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger d-flex align-items-center gap-2"
                    disabled={requestingDelete || !deleteRequestReason.trim()}
                    onClick={() => void submitDeleteRequest()}
                  >
                    <Trash2 size={16} />
                    Submit Delete Request
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1072 }}
          />
        </>
      )}

      {/* =====================================================
          CONFIRM DIALOGS
          ===================================================== */}

      <ConfirmDialog
        open={
          showSaveConfirm
        }
        title={
          isEditing
            ? 'Update Deposit?'
            : 'Save Deposit?'
        }
        message={
          isEditing
            ? `Update Deposit #${editingDepositId} for ${formatDate(
                businessDate,
              )}?`
            : `Save the deposit for ${formatDate(
                businessDate,
              )}?${
                requiresApproval
                  ? ' This deposit will be marked as Pending Approval for the Area Manager.'
                  : ' The ROF cash totals will be revalidated before saving.'
              }`
        }
        confirmText={
          isEditing
            ? 'Update Deposit'
            : 'Save Deposit'
        }
        cancelText="Cancel"
        onConfirm={() => {
          void saveDeposit()
        }}
        onCancel={() =>
          setShowSaveConfirm(
            false,
          )
        }
      />

      <ConfirmDialog
        open={
          revertDeleteTarget !==
          null
        }
        title="Revert / Cancel Delete Request?"
        message={
          revertDeleteTarget
            ? `Cancel the delete request (${revertDeleteTarget.deleteStatus}) for Deposit #${revertDeleteTarget.depositId} (${formatDate(
                revertDeleteTarget.businessDate,
              )})? The deposit record, threads, and FTP attachments will be kept.`
            : ''
        }
        confirmText="Revert Delete Request"
        cancelText="Keep Request"
        onConfirm={() => {
          void submitRevertDeleteRequest()
        }}
        onCancel={() =>
          setRevertDeleteTarget(
            null,
          )
        }
      />

      <ConfirmDialog
        open={
          deleteTarget !==
          null
        }
        title="Confirm Permanent Delete (DB + FTP)?"
        message={
          deleteTarget
            ? `Area Manager has approved deleting Deposit #${deleteTarget.depositId} for ${formatDate(
                deleteTarget.businessDate,
              )}. Confirming will permanently delete the database record, all monitoring threads/remarks, AND delete all attachment files from the FTP server. This action cannot be undone.`
            : ''
        }
        confirmText="Confirm Delete (DB + FTP)"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          void deleteDeposit()
        }}
        onCancel={() =>
          setDeleteTarget(
            null,
          )
        }
      />
    </div>
  )
}

function ApprovalBadge({
  status,
  approvedBy,
  approvedAt,
}: {
  status: DepositApprovalStatus
  approvedBy?: string
  approvedAt?: string
}) {
  if (status === 'Approved') {
    return (
      <div
        title={
          approvedBy
            ? `Approved by ${approvedBy}${
                approvedAt ? ` on ${formatDateTime(approvedAt)}` : ''
              }`
            : 'Approved'
        }
      >
        <span className="badge text-bg-success d-inline-flex align-items-center gap-1">
          <ShieldCheck size={12} />
          Approved
        </span>
        {approvedBy && (
          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>
            by {approvedBy}
          </div>
        )}
      </div>
    )
  }

  if (status === 'Rejected') {
    return (
      <div
        title={
          approvedBy
            ? `Rejected by ${approvedBy}${
                approvedAt ? ` on ${formatDateTime(approvedAt)}` : ''
              }`
            : 'Rejected'
        }
      >
        <span className="badge text-bg-danger d-inline-flex align-items-center gap-1">
          <AlertTriangle size={12} />
          Rejected
        </span>
        {approvedBy && (
          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>
            by {approvedBy}
          </div>
        )}
      </div>
    )
  }

  if (status === 'Pending') {
    return (
      <span
        className="badge text-bg-warning d-inline-flex align-items-center gap-1"
        title="Waiting for Area Manager approval in Web Portal"
      >
        <Clock size={12} />
        Pending Approval
      </span>
    )
  }

  return (
    <span className="badge text-bg-light border text-secondary">
      Not Required
    </span>
  )
}

function DeleteStatusBadge({
  status,
  approvedBy,
  reason,
}: {
  status: DepositDeleteStatus
  approvedBy?: string
  reason?: string
}) {
  if (status === 'Delete Approved') {
    return (
      <span
        className="badge text-bg-danger d-inline-flex align-items-center gap-1"
        title={`Delete approved${approvedBy ? ` by ${approvedBy}` : ''}. Click the red Trash button to confirm permanent deletion.`}
      >
        <Trash2 size={11} />
        Delete Approved (Confirm)
      </span>
    )
  }

  if (status === 'Pending Delete') {
    return (
      <span
        className="badge text-bg-warning border border-danger-subtle text-danger-emphasis d-inline-flex align-items-center gap-1"
        title={reason ? `Delete Reason: ${reason}` : 'Waiting for Area Manager delete approval'}
      >
        <Clock size={11} />
        Pending Delete Approval
      </span>
    )
  }

  if (status === 'Delete Rejected') {
    return (
      <span
        className="badge text-bg-secondary d-inline-flex align-items-center gap-1"
        title={`Delete request rejected${approvedBy ? ` by ${approvedBy}` : ''}`}
      >
        Delete Rejected
      </span>
    )
  }

  return null
}

function formatCategoryLabel(category: DepositThreadCategory): string {
  switch (category) {
    case 'PETTY_CASH':
      return 'Petty Cash'
    case 'PETTY_CASH_REPLENISH':
      return 'Petty Cash Replenished'
    case 'OPEN_SALES':
      return 'Open Sales'
    case 'DEPT_EXPENSE':
      return 'Dept. Expense'
    case 'APPROVAL':
      return 'Area Manager Approval'
    case 'DELETE_REQUEST':
      return 'Delete Request'
    default:
      return 'General'
  }
}

function ThreadCategoryBadge({
  category,
}: {
  category: DepositThreadCategory
}) {
  switch (category) {
    case 'PETTY_CASH':
      return (
        <span className="badge text-bg-warning">
          Petty Cash
        </span>
      )
    case 'PETTY_CASH_REPLENISH':
      return (
        <span className="badge text-bg-success">
          Petty Cash Replenished
        </span>
      )
    case 'OPEN_SALES':
      return (
        <span className="badge text-bg-info">
          Open Sales
        </span>
      )
    case 'DEPT_EXPENSE':
      return (
        <span className="badge text-bg-secondary">
          Dept. Expense
        </span>
      )
    case 'APPROVAL':
      return (
        <span className="badge text-bg-primary">
          Area Manager Review
        </span>
      )
    case 'DELETE_REQUEST':
      return (
        <span className="badge text-bg-danger">
          Delete Request
        </span>
      )
    default:
      return (
        <span className="badge text-bg-dark">
          General
        </span>
      )
  }
}

function AttachmentListPreview({
  files,
  emptyText,
  onRemove,
}: {
  files: SelectedAttachmentItem[]
  emptyText: string
  onRemove: (filePath: string) => void
}) {
  if (files.length === 0) {
    return emptyText ? (
      <div className="small text-secondary fst-italic py-1">
        {emptyText}
      </div>
    ) : null
  }

  return (
    <div className="d-flex flex-wrap gap-2 mt-1">
      {files.map((file) => (
        <div
          key={file.filePath}
          className="border rounded-3 bg-white p-1 pe-2 d-inline-flex align-items-center gap-2 shadow-sm"
        >
          {file.previewDataUrl ? (
            <img
              src={file.previewDataUrl}
              alt={file.fileName}
              className="rounded-2"
              style={{
                width: 34,
                height: 34,
                objectFit: 'cover',
              }}
            />
          ) : (
            <ImageIcon size={20} className="text-secondary ms-1" />
          )}

          <span
            className="small text-truncate"
            style={{ maxWidth: 150 }}
            title={file.fileName}
          >
            {file.fileName}
          </span>

          <button
            type="button"
            className="btn btn-sm btn-link text-danger p-0 ms-1 d-inline-flex"
            title="Remove file"
            onClick={() => onRemove(file.filePath)}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function getNoticeClass(
  message: string,
) {
  const normalized =
    message.toLowerCase()

  if (
    normalized.includes(
      'success',
    ) ||
    normalized.includes(
      'loaded successfully',
    ) ||
    normalized.includes(
      'selected successfully',
    ) ||
    normalized.includes(
      'saved successfully',
    ) ||
    normalized.includes(
      'saved and marked',
    ) ||
    normalized.includes(
      'updated successfully',
    ) ||
    normalized.includes(
      'downloaded successfully',
    ) ||
    normalized.includes(
      'replaced successfully',
    ) ||
    normalized.includes(
      'replenished',
    ) ||
    normalized.includes(
      'added to thread',
    )
  ) {
    return 'alert-success'
  }

  if (
    normalized.includes(
      'already',
    ) ||
    normalized.includes(
      'cancel',
    ) ||
    normalized.includes(
      'warning',
    ) ||
    normalized.includes(
      'editing',
    ) ||
    normalized.includes(
      'select a business date',
    ) ||
    normalized.includes(
      'click load rof',
    )
  ) {
    return 'alert-warning'
  }

  if (
    normalized.includes(
      'required',
    ) ||
    normalized.includes(
      'invalid',
    ) ||
    normalized.includes(
      'unable',
    ) ||
    normalized.includes(
      'failed',
    ) ||
    normalized.includes(
      'cannot',
    ) ||
    normalized.includes(
      'no rof',
    ) ||
    normalized.includes(
      'not found',
    ) ||
    normalized.includes(
      'must',
    ) ||
    normalized.includes(
      'please attach',
    ) ||
    normalized.includes(
      'please select',
    ) ||
    normalized.includes(
      'please enter',
    ) ||
    normalized.includes(
      'duplicate',
    )
  ) {
    return 'alert-danger'
  }

  return 'alert-info'
}

function BusyOverlay({
  message,
}: {
  message: string
}) {
  return (
    <ConfirmDialog
      open
      loading
      title="Please wait"
      message={message}
      onConfirm={() => undefined}
      onCancel={() => undefined}
    />
  )
}

interface DepositMetricProps {
  icon: ReactNode
  label: string
  value: number
  variance?: boolean
}

function DepositMetric({
  icon,
  label,
  value,
  variance = false,
}: DepositMetricProps) {
  const valueClass =
    !variance ||
    value === 0
      ? ''
      : value > 0
        ? 'text-warning'
        : 'text-danger'

  return (
    <div
      className="
        border
        rounded-4
        p-3
        h-100
        bg-light
      "
    >
      <div
        className="
          d-flex
          align-items-center
          gap-2
          text-secondary
          small
          mb-2
        "
      >
        <span className="deposit-metric-icon">
          {icon}
        </span>

        {label}
      </div>

      <div
        className={`fs-5 fw-bold ${valueClass}`}
      >
        ₱
        {formatMoney(
          value,
        )}
      </div>
    </div>
  )
}

interface AmountFieldProps {
  id: string
  label: string
  value: number
  disabled: boolean
  onChange: (
    value: number,
  ) => void
}

function AmountField({
  id,
  label,
  value,
  disabled,
  onChange,
}: AmountFieldProps) {
  return (
    <div className="col-12 col-md-6 col-xl-3">
      <label
        htmlFor={id}
        className="form-label fw-semibold small"
      >
        {label}
      </label>

      <div className="input-group">
        <span className="input-group-text">
          ₱
        </span>

        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          className="form-control text-end"
          placeholder="0.00"
          value={
            value === 0
              ? ''
              : value
          }
          disabled={
            disabled
          }
          onChange={(
            event,
          ) =>
            onChange(
              toNumber(
                event.target
                  .value,
              ),
            )
          }
        />
      </div>
    </div>
  )
}

function MoneyCell({
  value,
}: {
  value: number
}) {
  return (
    <td className="text-end">
      ₱
      {formatMoney(
        value,
      )}
    </td>
  )
}

export default DepositPage
