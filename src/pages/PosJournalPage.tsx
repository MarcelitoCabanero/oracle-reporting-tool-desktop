import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  CalendarDays,
  Download,
  Search,
} from 'lucide-react'

interface PosJournalRecord {
  posJournalLogId: number
  journalId: number
  checkNum: number
  transDateTime: string
  chkOpenDateTime: string
  journalText: string
}

function todayString() {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countMatches(text: string, search: string) {
  if (!search.trim()) return 0

  return text.match(new RegExp(escapeRegExp(search.trim()), 'gi'))?.length ?? 0
}

function HighlightedJournalText({
  text,
  search,
  activeMatch,
  matchOffset,
  onActiveMatch,
}: {
  text: string
  search: string
  activeMatch: number
  matchOffset: number
  onActiveMatch: (element: HTMLElement | null) => void
}) {
  const trimmedSearch = search.trim()

  if (!trimmedSearch) return text

  const matcher = new RegExp(`(${escapeRegExp(trimmedSearch)})`, 'gi')
  const parts = text.split(matcher)
  let matchIndex = matchOffset

  return parts.map((part, index) => {
    if (index % 2 === 0) return part

    const currentIndex = matchIndex
    matchIndex += 1

    return (
      <mark
        key={`${currentIndex}-${part}`}
        className={currentIndex === activeMatch ? 'pos-journal-match active' : 'pos-journal-match'}
        ref={(element) => {
          if (currentIndex === activeMatch) onActiveMatch(element)
        }}
      >
        {part}
      </mark>
    )
  })
}

function PosJournalPage() {
  const [businessDate, setBusinessDate] = useState(todayString())
  const [checkNumber, setCheckNumber] = useState('')
  const [searchText, setSearchText] = useState('')
  const [rows, setRows] = useState<PosJournalRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportReceiptId, setExportReceiptId] = useState<number | null>(null)
  const [activeMatch, setActiveMatch] = useState(-1)
  const [message, setMessage] = useState('Select a date or check number to load a receipt.')
  const activeMatchRef = useRef<HTMLElement | null>(null)

  const totalMatches = rows.reduce(
    (total, row) => total + countMatches(row.journalText, searchText),
    0,
  )

  useEffect(() => {
    activeMatchRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [activeMatch])

  function setLoadedRows(result: PosJournalRecord[], successMessage: string) {
    setRows(result)
    setSearchText('')
    setActiveMatch(-1)
    setMessage(result.length === 0 ? 'No matching receipt found.' : successMessage)
  }

  async function loadByCheckNumber() {
    try {
      setLoading(true)
      setMessage('Loading receipt by check number...')

      const result = await window.api.posJournal.loadByCheckNumber(checkNumber)
      setLoadedRows(result, 'Receipt loaded by check number.')
    } catch (error) {
      console.error('Unable to load receipt by check number:', error)
      setRows([])
      setMessage(error instanceof Error ? error.message : 'Unable to load receipt.')
    } finally {
      setLoading(false)
    }
  }

  async function loadByDate() {
    if (!businessDate) {
      setMessage('Select a receipt date first.')
      return
    }

    try {
      setLoading(true)
      setMessage('Loading receipts for the selected date...')

      const result = await window.api.posJournal.load(businessDate)
      setLoadedRows(result, `${result.length} receipt${result.length === 1 ? '' : 's'} loaded.`)
    } catch (error) {
      console.error('Unable to load POS journal:', error)
      setRows([])
      setMessage(error instanceof Error ? error.message : 'Unable to load POS journal.')
    } finally {
      setLoading(false)
    }
  }

  async function exportPdf() {
    if (rows.length === 0) {
      setMessage('Load a receipt before exporting.')
      return
    }

    try {
      setExporting(true)
      const exportRow = checkNumber.trim()
        ? rows.find((row) => String(row.checkNum) === checkNumber.trim()) ?? rows[0]
        : rows[0]
      const exportCheckNumber = String(exportRow.checkNum)

      setExportReceiptId(exportRow.posJournalLogId)
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })

      const result = await window.api.posJournal.exportPdf(exportCheckNumber)
      setMessage(result.message)
    } catch (error) {
      console.error('Unable to export POS journal:', error)
      setMessage(error instanceof Error ? error.message : 'Unable to export POS journal.')
    } finally {
      setExportReceiptId(null)
      setExporting(false)
    }
  }

  function findNext() {
    if (totalMatches === 0) {
      setMessage('No matches found in the displayed receipt.')
      return
    }

    setActiveMatch((activeMatch + 1) % totalMatches)
  }

  let matchOffset = 0

  return (
    <section className="pos-journal-page">
      <div className="pos-journal-workspace">
        <aside className="pos-journal-filter-rail">
          <div className="pos-journal-filter-group">
            <span className="pos-journal-filter-label">Check number</span>
            <div className="pos-journal-filter-row">
              <input
                id="pos-journal-check-number"
                className="form-control"
                type="text"
                inputMode="numeric"
                placeholder="202046"
                value={checkNumber}
                onChange={(event) => setCheckNumber(event.target.value)}
              />
              <button className="pos-journal-icon-btn" type="button" onClick={loadByCheckNumber} disabled={loading} title="Load reprint">
                <Search size={14} />
              </button>
            </div>
          </div>

          <div className="pos-journal-filter-divider" />

          <div className="pos-journal-filter-group">
            <span className="pos-journal-filter-label">Date</span>
            <div className="pos-journal-filter-row">
              <div className="pos-journal-date-wrap">
                <CalendarDays size={13} />
                <input
                  id="pos-journal-date"
                  className="form-control"
                  type="date"
                  value={businessDate}
                  onChange={(event) => setBusinessDate(event.target.value)}
                />
              </div>
              <button className="pos-journal-icon-btn" type="button" onClick={loadByDate} disabled={loading} title="Load receipts">
                <Search size={14} />
              </button>
            </div>
          </div>

          <div className="pos-journal-filter-divider" />

          <div className="pos-journal-filter-group">
            <span className="pos-journal-filter-label">Find in receipt</span>
            <div className="pos-journal-filter-row">
              <input
                id="pos-journal-search"
                className="form-control"
                type="search"
                placeholder="Search text..."
                value={searchText}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    findNext()
                  }
                }}
                onChange={(event) => {
                  setSearchText(event.target.value)
                  setActiveMatch(-1)
                }}
              />
            </div>
            {totalMatches > 0 && (
              <span className="pos-journal-match-count">{totalMatches} match{totalMatches === 1 ? '' : 'es'}</span>
            )}
          </div>

          <div className="pos-journal-action-row">
            
            <button className="pos-journal-export-btn" type="button" onClick={exportPdf} disabled={exporting || loading || rows.length === 0}>
              <Download size={14} />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
            <button className="pos-journal-find-next-btn" type="button" onClick={findNext} disabled={rows.length === 0}>
              <Search size={14} />
              <span>Find Next</span>
            </button>
          </div>

          <p className="pos-journal-status-text">{message}</p>
        </aside>

        <main className="pos-journal-viewer">
          <div className="pos-journal-viewer-toolbar">
            <h2>Receipt</h2>
            {rows.length > 0 && <span className="pos-journal-count-badge">{rows.length} receipt{rows.length === 1 ? '' : 's'}</span>}
          </div>

          <div id="pos-journal-print-area" className="pos-journal-list">
            {rows.map((row) => {
              const rowOffset = matchOffset
              matchOffset += countMatches(row.journalText, searchText)

              return (
                <article
                  className={row.posJournalLogId === exportReceiptId
                    ? 'pos-journal-receipt pos-journal-export-target'
                    : 'pos-journal-receipt'}
                  key={row.posJournalLogId}
                >
                  <pre>
                    <HighlightedJournalText
                      text={row.journalText}
                      search={searchText}
                      activeMatch={activeMatch}
                      matchOffset={rowOffset}
                      onActiveMatch={(element) => {
                        activeMatchRef.current = element
                      }}
                    />
                  </pre>
                </article>
              )
            })}
          </div>
        </main>
      </div>
    </section>
  )
}

export default PosJournalPage