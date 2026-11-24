import { handleIpc } from './ipc-handler.js'

import {
  createRof,
  deleteRof,
  loadRofDetails,
  loadRofSource,
  loadRofSummary,
  getDepositSource,
} from '../rof/rof.service.js'

import type {
  SaveRofInput,
} from '../rof/rof.types.js'

export function registerRofIpc() {
  console.log('Registering ROF IPC...')

  handleIpc(
    'rof:load-source',
    async (
      _event,
      businessDate: string,
    ) => {
      return loadRofSource(
        businessDate,
      )
    },
  )

  handleIpc(
    'rof:load-details',
    async (
      _event,
      businessDate: string,
    ) => {
      return loadRofDetails(
        businessDate,
      )
    },
  )

  handleIpc(
    'rof:create',
    async (
      _event,
      input: SaveRofInput,
    ) => {
      return createRof(input)
    },
  )

  handleIpc(
    'rof:delete',
    async (
      _event,
      businessDate: string,
    ) => {
      return deleteRof(
        businessDate,
      )
    },
  )

  handleIpc(
    'rof:load-summary',
    async (
      _event,
      dateFrom: string,
      dateTo: string,
      locationName: string,
    ) => {
      return loadRofSummary(
        dateFrom,
        dateTo,
        locationName,
      )
    },
  )
  handleIpc(
  'rof:get-deposit-source',
  async (
    _event,
    businessDate: string,
  ) => {
    return getDepositSource(
      businessDate,
    )
  },
)
}