import {
  useState,
} from 'react'

import {
  Database,
  LoaderCircle,
  RefreshCw,
  UploadCloud,
} from 'lucide-react'

import ConfirmDialog from '../components/common/ConfirmDialog'

interface MissingMenuItem {
  itemnumber: string
  itemname: string
  transtype: string
  majorgroup: string
  familygroup: string
}

function MaintenancePage() {
  const [missingItems, setMissingItems] = useState<MissingMenuItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [syncingItems, setSyncingItems] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [syncMessage, setSyncMessage] = useState(
    'Ready - load missing items to compare HQ with the local POS database.',
  )

  async function loadMissingItems() {
    setLoadingItems(true)
    setSyncMessage('Comparing HQ menu items against the local POS database...')

    try {
      const rows = await window.api.maintenance.loadMissingItems()
      setMissingItems(rows)
      setSyncMessage(
        rows.length === 0
          ? 'All data is already in sync. No missing items found.'
          : `${rows.length} missing item(s) found - review the list, then sync to POS.`,
      )
    } catch (error) {
      setMissingItems([])
      setSyncMessage(error instanceof Error ? error.message : 'Unable to compare menu items.')
    } finally {
      setLoadingItems(false)
    }
  }

  async function syncItems() {
    if (missingItems.length === 0) {
      setSyncMessage('No missing data to sync. Load items first.')
      return
    }

    setShowConfirmDialog(true)
  }

  async function handleSyncConfirm() {
    setSyncingItems(true)
    setSyncMessage('Syncing items to the local POS database...')

    try {
      const result = await window.api.maintenance.syncItems(missingItems)
      setSyncMessage(result.message)
      if (result.success) await loadMissingItems()
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Unable to sync menu items.')
    } finally {
      setSyncingItems(false)
      setShowConfirmDialog(false)
    }
  }

  // =========================================================
  // BUSY OVERLAY
  // =========================================================

  const isBusy = loadingItems || syncingItems

  const busyMessage = syncingItems
    ? 'Syncing items...'
    : loadingItems
      ? 'Loading missing items...'
      : ''

  return (
    <div className="position-relative">
      {isBusy && (
        <div
          className="
            position-absolute
            top-0
            start-0
            w-100
            h-100
            d-flex
            align-items-center
            justify-content-center
            bg-white
            bg-opacity-75
            rounded-4
          "
          style={{
            zIndex: 100,
            minHeight: '100%',
          }}
        >
          <div
            className="
              bg-white
              border
              rounded-4
              shadow-sm
              text-center
              px-5
              py-4
            "
          >
            <div
              className="
                spinner-border
                text-primary
                mb-3
              "
              role="status"
            />

            <div className="fw-semibold mb-1">
              {busyMessage}
            </div>

            <small className="text-secondary">
              Please wait while the transaction
              is being processed.
            </small>
          </div>
        </div>
      )}

      <section className="maintenance-page">
        <div className="maintenance-grid">
          <article className="maintenance-panel maintenance-sync-panel">
            <div className="maintenance-panel-heading">
              <div className="maintenance-icon"><Database size={19} /></div>
              <div className="maintenance-heading-text">
                <h2>Synchronize menu items</h2>
                <p>Find HQ items missing from the local POS database.</p>
              </div>
              <div className="maintenance-actions">
                <button className="btn btn-primary" type="button" onClick={() => void loadMissingItems()} disabled={loadingItems || syncingItems}>
                  {loadingItems ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}
                  Load missing items
                </button>
                <button className="btn btn-outline-primary" type="button" onClick={() => void syncItems()} disabled={loadingItems || syncingItems || missingItems.length === 0}>
                  {syncingItems ? <LoaderCircle className="spin" size={16} /> : <UploadCloud size={16} />}
                  Sync to POS
                </button>
              </div>
            </div>

            <div className="maintenance-status">{syncMessage}</div>

            <div className="maintenance-table-wrap">
              <table className="table maintenance-table align-middle mb-0">
                <thead><tr><th>Item number</th><th>Item name</th><th>Trans type</th><th>Major group</th><th>Family group</th></tr></thead>
                <tbody>
                  {missingItems.length === 0 ? (
                    <tr><td className="maintenance-empty" colSpan={5}>No missing items loaded.</td></tr>
                  ) : missingItems.map((item) => (
                    <tr key={item.itemnumber}><td>{item.itemnumber}</td><td>{item.itemname}</td><td>{item.transtype}</td><td>{item.majorgroup}</td><td>{item.familygroup}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="maintenance-count">{missingItems.length} missing item{missingItems.length === 1 ? '' : 's'}</div>
          </article>
        </div>
      </section>

      <ConfirmDialog
        open={showConfirmDialog}
        title="Sync to POS"
        message={`Insert ${missingItems.length} missing item(s) into the POS database?`}
        confirmText="Sync"
        cancelText="Cancel"
        loading={syncingItems}
        onConfirm={handleSyncConfirm}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  )
}

export default MaintenancePage