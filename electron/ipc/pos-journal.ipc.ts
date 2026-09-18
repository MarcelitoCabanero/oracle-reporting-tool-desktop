import {
  ipcMain,
} from 'electron'

import {
  loadPosJournalByCheckNumber,
  loadPosJournals,
} from '../posjournal/pos-journal.service.js'

export function registerPosJournalIpc() {
  ipcMain.handle(
    'pos-journal:load',
    async (
      _event,
      businessDate: string,
    ) => loadPosJournals(businessDate),
  )

  ipcMain.handle(
    'pos-journal:load-by-check-number',
    async (
      _event,
      checkNumber: string,
    ) => loadPosJournalByCheckNumber(checkNumber),
  )
}
