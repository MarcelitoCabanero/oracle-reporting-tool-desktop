import { handleIpc } from './ipc-handler.js'

import {
  checkDepositStatus,
  createDeposit,
  createDepositThreadReply,
  editDeposit,
  loadDepositApprovalNotifications,
  loadDepositById,
  loadDeposits,
  loadDepositThread,
  removeDeposit,
  requestDeleteDeposit,
  revertDeleteDepositRequest,
  submitPettyCashReplenishment,
} from '../deposit/deposit.service.js'

import type {
  AddDepositThreadReplyInput,
  CreateDepositInput,
  DepositListInput,
  ReplenishPettyCashInput,
  RequestDeleteDepositInput,
  RevertDeleteDepositInput,
  UpdateDepositInput,
} from '../deposit/deposit.types.js'

import {
  selectDepositAttachment,
  selectMultipleDepositAttachments,
} from '../deposit/deposit-attachment.service.js'

import {
  downloadDepositAttachment,
  getDepositAttachmentPreview,
  replaceDepositAttachment,
} from '../deposit/deposit-attachment-viewer.service.js'


export function registerDepositIpc() {
  handleIpc(
    'deposit:check-status',
    async (
      _event,
      businessDate: string,
      locationName: string,
    ) => {
      return checkDepositStatus(
        businessDate,
        locationName,
      )
    },
  )

  handleIpc(
    'deposit:create',
    async (
      _event,
      input: CreateDepositInput,
    ) => {
      return createDeposit(
        input,
      )
    },
  )

  handleIpc(
    'deposit:list',
    async (
      _event,
      input: DepositListInput,
    ) => {
      return loadDeposits(input)
    },
  )

  handleIpc(
    'deposit:get-by-id',
    async (
      _event,
      depositId: number,
      locationName: string,
    ) => {
      return loadDepositById(
        depositId,
        locationName,
      )
    },
  )

  handleIpc(
    'deposit:update',
    async (
      _event,
      input: UpdateDepositInput,
    ) => {
      return editDeposit(input)
    },
  )

  handleIpc(
    'deposit:delete',
    async (
      _event,
      depositId: number,
      locationName: string,
    ) => {
      return removeDeposit(
        depositId,
        locationName,
      )
    },
  )

  handleIpc(
    'deposit:request-delete',
    async (
      _event,
      input: RequestDeleteDepositInput,
    ) => {
      return requestDeleteDeposit(
        input,
      )
    },
  )

  handleIpc(
    'deposit:revert-delete',
    async (
      _event,
      input: RevertDeleteDepositInput,
    ) => {
      return revertDeleteDepositRequest(
        input,
      )
    },
  )

  handleIpc(
    'deposit:select-attachment',
    async () => {
      return selectDepositAttachment()
    },
  )

  handleIpc(
    'deposit:select-multiple-attachments',
    async () => {
      return selectMultipleDepositAttachments()
    },
  )

  handleIpc(
    'deposit:get-attachment',
    async (_event, fileName: string) => {
      return getDepositAttachmentPreview(fileName)
    },
  )

  handleIpc(
    'deposit:download-attachment',
    async (_event, fileName: string) => {
      return downloadDepositAttachment(fileName)
    },
  )

  handleIpc(
    'deposit:replace-attachment',
    async (_event, fileName: string) => {
      return replaceDepositAttachment(fileName)
    },
  )

  handleIpc(
    'deposit:get-thread',
    async (
      _event,
      depositId: number,
      locationName: string,
    ) => {
      return loadDepositThread(
        depositId,
        locationName,
      )
    },
  )

  handleIpc(
    'deposit:add-thread-reply',
    async (
      _event,
      input: AddDepositThreadReplyInput,
    ) => {
      return createDepositThreadReply(
        input,
      )
    },
  )

  handleIpc(
    'deposit:replenish-petty-cash',
    async (
      _event,
      input: ReplenishPettyCashInput,
    ) => {
      return submitPettyCashReplenishment(
        input,
      )
    },
  )

  handleIpc(
    'deposit:get-notifications',
    async (
      _event,
      locationName: string,
    ) => {
      return loadDepositApprovalNotifications(
        locationName,
      )
    },
  )

  console.log(
    'Deposit IPC registered.',
  )
}
