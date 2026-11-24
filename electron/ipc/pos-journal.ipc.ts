import {
  loadPosJournalByCheckNumber,
  loadPosJournals,
} from '../posjournal/pos-journal.service.js'
import { handleIpc } from './ipc-handler.js'

export function registerPosJournalIpc() {
  handleIpc(
    'pos-journal:load',
    async (
      _event,
      businessDate: string,
    ) => loadPosJournals(businessDate),
  )

  handleIpc(
    'pos-journal:load-by-check-number',
    async (
      _event,
      checkNumber: string,
    ) => loadPosJournalByCheckNumber(checkNumber),
  )
}
