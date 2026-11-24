import { generateTenderListing } from '../tender-listing/tender-listing.service.js'
import type { TenderListingInput } from '../tender-listing/tender-listing.repository.js'
import { handleIpc } from './ipc-handler.js'

export function registerTenderListingIpc() {
  handleIpc('tender-listing:generate', (_event, input: TenderListingInput) =>
    generateTenderListing(input),
  )
}
