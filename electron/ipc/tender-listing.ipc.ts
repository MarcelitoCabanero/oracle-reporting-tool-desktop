import { ipcMain } from 'electron'
import { generateTenderListing } from '../tender-listing/tender-listing.service.js'
import type { TenderListingInput } from '../tender-listing/tender-listing.repository.js'

export function registerTenderListingIpc() {
  ipcMain.handle('tender-listing:generate', (_event, input: TenderListingInput) =>
    generateTenderListing(input),
  )
}
