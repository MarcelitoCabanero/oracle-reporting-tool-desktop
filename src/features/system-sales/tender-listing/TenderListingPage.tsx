import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, LoaderCircle, RefreshCw, Search } from 'lucide-react'
import {
  formatSystemSalesReportPeriod,
  type SystemSalesSharedDatesProps,
} from '../system-sales.types'

interface TenderListingRow { checkNumber: string; tenderType: string; amount: number; reference: string; businessDate: string }

let tenderListingCache: {
  dateFrom: string
  dateTo: string
  generatedDateFrom: string
  generatedDateTo: string
  hasGenerated: boolean
  search: string
  rows: TenderListingRow[]
  message: string
} | null = null
const today = () => new Date().toISOString().slice(0, 10)
const money = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)
const date = (value: string) => { const [year, month, day] = value.slice(0, 10).split('-'); return year && month && day ? `${month}/${day}/${year}` : value }

export default function TenderListingPage({
  dateFrom: sharedDateFrom,
  dateTo: sharedDateTo,
  onDateFromChange,
  onDateToChange,
}: SystemSalesSharedDatesProps = {}) {
  const saved = tenderListingCache
  const [localDateFrom, setLocalDateFrom] = useState(saved?.dateFrom ?? today)
  const [localDateTo, setLocalDateTo] = useState(saved?.dateTo ?? today)
  const dateFrom = sharedDateFrom ?? localDateFrom
  const dateTo = sharedDateTo ?? localDateTo
  const setDateFrom = (value: string) => {
    setLocalDateFrom(value)
    onDateFromChange?.(value)
  }
  const setDateTo = (value: string) => {
    setLocalDateTo(value)
    onDateToChange?.(value)
  }
  const [generatedDateFrom, setGeneratedDateFrom] = useState(saved?.generatedDateFrom ?? '')
  const [generatedDateTo, setGeneratedDateTo] = useState(saved?.generatedDateTo ?? '')
  const [hasGenerated, setHasGenerated] = useState(saved?.hasGenerated ?? false)
  const [search, setSearch] = useState(saved?.search ?? '')
  const [rows, setRows] = useState<TenderListingRow[]>(saved?.rows ?? [])
  const [message, setMessage] = useState(saved?.message ?? '')
  const [loading, setLoading] = useState(false)
  const filtered = useMemo(() => { const key = search.trim().toLowerCase(); return key ? rows.filter(row => [row.checkNumber, row.tenderType, row.reference].some(value => value.toLowerCase().includes(key))) : rows }, [rows, search])
  useEffect(() => {
    tenderListingCache = {
      dateFrom,
      dateTo,
      generatedDateFrom,
      generatedDateTo,
      hasGenerated,
      search,
      rows,
      message,
    }
  }, [dateFrom, dateTo, generatedDateFrom, generatedDateTo, hasGenerated, search, rows, message])
  async function generate() {
    if (!dateFrom || !dateTo || dateFrom > dateTo) {
      setMessage('Please select a valid date range.')
      return
    }
    const requestDateFrom = dateFrom
    const requestDateTo = dateTo
    setLoading(true)
    setMessage('')
    try {
      const result = await window.api.tenderListing.generate({
        dateFrom: requestDateFrom,
        dateTo: requestDateTo,
      })
      setRows(result)
      setGeneratedDateFrom(requestDateFrom)
      setGeneratedDateTo(requestDateTo)
      setHasGenerated(true)
      setMessage(result.length ? `${result.length} tender record${result.length === 1 ? '' : 's'} found.` : 'No tender records found.')
    } catch (error) {
      setRows([])
      setMessage(error instanceof Error ? error.message : 'Unable to generate Tender Listing.')
    } finally {
      setLoading(false)
    }
  }
  const reportPeriod = hasGenerated
    ? formatSystemSalesReportPeriod(generatedDateFrom, generatedDateTo)
    : 'Not generated'
  return <div className="system-sales-page">
    <div className="system-sales-toolbar"><div className="system-sales-toolbar-title"><CalendarDays size={16} /> Report Parameters</div><form className="system-sales-toolbar-controls" onSubmit={(event) => { event.preventDefault(); void generate() }}><div className="system-sales-date-field"><label htmlFor="tender-from">From</label><input id="tender-from" type="date" className="form-control form-control-sm" value={dateFrom} disabled={loading} onChange={event => setDateFrom(event.target.value)} /></div><div className="system-sales-date-arrow">→</div><div className="system-sales-date-field"><label htmlFor="tender-to">To</label><input id="tender-to" type="date" className="form-control form-control-sm" value={dateTo} disabled={loading} onChange={event => setDateTo(event.target.value)} /></div><button type="submit" className="btn btn-primary btn-sm system-sales-generate-btn" disabled={loading}>{loading ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />}{loading ? 'Generating...' : 'Generate'}</button><div className="system-sales-date-field"><label htmlFor="tender-search">Search</label><div className="input-group input-group-sm"><span className="input-group-text"><Search size={14} /></span><input id="tender-search" className="form-control" value={search} placeholder="Check, tender, reference" onChange={event => setSearch(event.target.value)} /></div></div><div className="system-sales-period"><div>Report Period</div><strong>{reportPeriod}</strong></div></form></div>{message && <div className="alert alert-secondary py-2 px-3 small">{message}</div>}<section className="system-sales-section system-sales-tender-section"><div className="system-sales-section-heading system-sales-tender-heading"><div><h6>Tender Details</h6><span>Payment references for the selected period</span></div><span className="system-sales-count-badge">{filtered.length} record{filtered.length === 1 ? '' : 's'}</span></div><div className="system-sales-table-container"><table className="table system-sales-table mb-0"><thead><tr><th>Check Number</th><th>Business Date</th><th>Tender Type</th><th className="text-end">Amount</th><th>Reference</th></tr></thead><tbody>{filtered.length ? filtered.map((row, index) => <tr key={`${row.checkNumber}-${row.businessDate}-${index}`}><td>{row.checkNumber}</td><td>{date(row.businessDate)}</td><td>{row.tenderType}</td><td className="text-end system-sales-number">{money(row.amount)}</td><td>{row.reference}</td></tr>) : <tr><td colSpan={5} className="text-center text-secondary py-4">{rows.length ? 'No tenders match your search.' : 'Generate a listing to view tender records.'}</td></tr>}</tbody></table></div></section>{loading && <div className="system-sales-loading-overlay" role="status"><div className="system-sales-loading-card"><LoaderCircle size={30} className="spin" /><strong>Generating report</strong><span>Reading tender reference details...</span></div></div>}</div>
}
