import {
  ipcMain,
} from 'electron'

import {
  checkDepositStatus,
  createDeposit,
  createDepositThreadReply,
  editDeposit,
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
  ipcMain.handle(
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

  ipcMain.handle(
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

  ipcMain.handle(
    'deposit:list',
    async (
      _event,
      input: DepositListInput,
    ) => {
      return loadDeposits(input)
    },
  )

  ipcMain.handle(
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

  ipcMain.handle(
    'deposit:update',
    async (
      _event,
      input: UpdateDepositInput,
    ) => {
      return editDeposit(input)
    },
  )

  ipcMain.handle(
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

  ipcMain.handle(
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

  ipcMain.handle(
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

  ipcMain.handle(
    'deposit:select-attachment',
    async () => {
      return selectDepositAttachment()
    },
  )

  ipcMain.handle(
    'deposit:select-multiple-attachments',
    async () => {
      return selectMultipleDepositAttachments()
    },
  )

  ipcMain.handle(
    'deposit:get-attachment',
    async (_event, fileName: string) => {
      return getDepositAttachmentPreview(fileName)
    },
  )

  ipcMain.handle(
    'deposit:download-attachment',
    async (_event, fileName: string) => {
      return downloadDepositAttachment(fileName)
    },
  )

  ipcMain.handle(
    'deposit:replace-attachment',
    async (_event, fileName: string) => {
      return replaceDepositAttachment(fileName)
    },
  )

  ipcMain.handle(
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

  ipcMain.handle(
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

  ipcMain.handle(
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

  console.log(
    'Deposit IPC registered.',
  )
}
