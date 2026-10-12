import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import './TenderListingPage.css'

interface TenderListingRow { checkNumber: string; tenderType: string; amount: number; reference: string; businessDate: string }

function localDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const today = localDateString(new Date())
const monthStart = `${today.slice(0, 7)}-01`

function formatAmount(value: number) {
  return value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TenderListingPage() {
  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTo, setDateTo] = useState(today)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<TenderListingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('Choose a date range, then select Generate.')

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase()
    if (!keyword) return rows
    return rows.filter((row) =>
      [row.checkNumber, row.reference, row.tenderType].some((value) => value.toLocaleLowerCase().includes(keyword)),
    )
  }, [rows, search])

  async function generate() {
    if (!dateFrom || !dateTo) {
      setMessage('Select both dates before generating the listing.')
      return
    }
    if (dateFrom > dateTo) {
      setMessage('From date cannot be later than To date.')
      return
    }
    setLoading(true)
    setMessage('Loading tender details...')
    try {
      const result = await window.api.tenderListing.generate({ dateFrom, dateTo })
      setRows(result)
      setMessage(result.length ? `${result.length} tender record${result.length === 1 ? '' : 's'} loaded.` : 'No tender records found for this date range.')
    } catch (error) {
      console.error('Unable to generate Tender Listing:', error)
      setRows([])
      setMessage(error instanceof Error ? error.message : 'Unable to generate Tender Listing.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="tender-listing-page">
      <header className="tender-listing-heading">
        <h1>Tender Listing</h1>
        <p>Non-cash tender details by date range</p>
      </header>

      <div className="tender-listing-toolbar">
        <label className="tender-date-field">
          <span>From:</span>
          <input type="date" value={dateFrom} disabled={loading} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label className="tender-date-field">
          <span>To:</span>
          <input type="date" value={dateTo} disabled={loading} onChange={(event) => setDateTo(event.target.value)} />
        </label>
        <button className="tender-generate-button" type="button" onClick={generate} disabled={loading}>
          {loading ? 'Loading…' : 'Generate'}
        </button>
        <label className="tender-search-field">
          <span>Search:</span>
          <span className="tender-search-input-wrap">
            <Search size={15} aria-hidden="true" />
            <input type="search" placeholder="Check #, reference, tender..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </span>
        </label>
        <span className="tender-listing-status" role="status">{message}</span>
      </div>

      <div className="tender-table-wrap">
        <table className="tender-listing-table">
          <thead>
            <tr>
              <th scope="col">Check Number</th>
              <th scope="col">Business Date</th>
              <th scope="col">Tender Type</th>
              <th scope="col">Amount</th>
              <th scope="col">Reference</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, index) => (
              <tr key={`${row.checkNumber}-${row.businessDate}-${index}`}>
                <td>{row.checkNumber}</td>
                <td>{row.businessDate}</td>
                <td>{row.tenderType}</td>
                <td className="tender-amount">{formatAmount(row.amount)}</td>
                <td>{row.reference}</td>
              </tr>
            ))}
            {filteredRows.length === 0 && rows.length > 0 && (
              <tr><td className="tender-empty-row" colSpan={5}>No tenders match your search.</td></tr>
            )}
            {rows.length === 0 && (
              <tr><td className="tender-empty-row" colSpan={5}>Generate a listing to see tender records.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
