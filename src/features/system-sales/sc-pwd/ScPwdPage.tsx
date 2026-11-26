import { useEffect, useState } from 'react'
import { CalendarDays, FileSpreadsheet, FileText, LoaderCircle, RefreshCw } from 'lucide-react'
import {
  formatSystemSalesReportPeriod,
  type SystemSalesSharedDatesProps,
} from '../system-sales.types'

const today = () => new Date().toISOString().slice(0, 10)
const n = (v: unknown) => Number(v ?? 0)
const money = (v: unknown) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n(v))
const scPwdColumnWidths = ['11%', '11%', '11%', '12%', '12%', '10%', '8%', '8%', '9%', '8%']

const formatDate = (v: unknown) => {
  if (!v) return ''
  if (typeof v === 'string') {
    const s = v.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-')
      return `${m}/${d}/${y}`
    }
  }
  const d = v instanceof Date ? v : new Date(v as string)
  if (isNaN(d.getTime())) return String(v)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}/${d.getFullYear()}`
}

interface ScPwdPageState {
  from: string
  to: string
  generatedDateFrom: string
  generatedDateTo: string
  generatedType: string
  type: string
  rows: Array<Record<string, unknown>>
  error: string
}

let scPwdPageCache: ScPwdPageState | null = null

export default function ScPwdPage({
  dateFrom: sharedDateFrom,
  dateTo: sharedDateTo,
  onDateFromChange,
  onDateToChange,
}: SystemSalesSharedDatesProps = {}) {
  const savedState = scPwdPageCache
  const [localFrom, setLocalFrom] = useState(savedState?.from ?? today)
  const [localTo, setLocalTo] = useState(savedState?.to ?? today)
  const from = sharedDateFrom ?? localFrom
  const to = sharedDateTo ?? localTo
  const setFrom = (value: string) => {
    setLocalFrom(value)
    onDateFromChange?.(value)
  }
  const setTo = (value: string) => {
    setLocalTo(value)
    onDateToChange?.(value)
  }
  const [generatedDateFrom, setGeneratedDateFrom] = useState(
    savedState?.generatedDateFrom ?? savedState?.from ?? '',
  )
  const [generatedDateTo, setGeneratedDateTo] = useState(
    savedState?.generatedDateTo ?? savedState?.to ?? '',
  )
  const [generatedType, setGeneratedType] = useState(
    savedState?.generatedType ?? savedState?.type ?? 'ALL',
  )
  const [type, setType] = useState(savedState?.type ?? 'ALL')
  const [rows, setRows] = useState<Array<Record<string, unknown>>>(savedState?.rows ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(savedState?.error ?? '')
  const report = rows.length
    ? { dateFrom: generatedDateFrom || from, dateTo: generatedDateTo || to, type: generatedType }
    : null
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)

  const generate = async () => {
    const requestDateFrom = from
    const requestDateTo = to
    const requestType = type
    setLoading(true)
    setError('')
    try {
      const result = await window.api.scPwd.generate({
        dateFrom: requestDateFrom,
        dateTo: requestDateTo,
        type: requestType,
      })
      setRows(result)
      setGeneratedDateFrom(requestDateFrom)
      setGeneratedDateTo(requestDateTo)
      setGeneratedType(requestType)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to generate SC / PWD Listing.')
    } finally {
      setLoading(false)
    }
  }

  const groups = ['OSCA', 'PWD'].map(
    (k) => [k, rows.filter((r) => r.discountType === k)] as const
  )
  const total = (items: Array<Record<string, unknown>>, field: string) =>
    items.reduce((s, r) => s + n(r[field]), 0)
  useEffect(() => {
    scPwdPageCache = {
      from,
      to,
      generatedDateFrom,
      generatedDateTo,
      generatedType,
      type,
      rows,
      error,
    }
  }, [from, to, generatedDateFrom, generatedDateTo, generatedType, type, rows, error])
  const exportReport = async (format: 'excel' | 'pdf') => {
    setExporting(format)
    try {
      const input = {
        dateFrom: generatedDateFrom || from,
        dateTo: generatedDateTo || to,
        type: generatedType,
        rows,
      }
      const response =
        format === 'excel'
          ? await window.api.scPwd.exportExcel(input)
          : await window.api.scPwd.exportPdf(input)
      if (!response.canceled && !response.success) setError(response.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="system-sales-page">
      <div className="system-sales-toolbar">
        <div className="system-sales-toolbar-title"><CalendarDays size={16} /> Report Parameters</div>
        <div className="system-sales-toolbar-export"><button className="btn btn-outline-success btn-sm system-sales-export-btn" disabled={!rows.length || loading || exporting !== null} onClick={() => exportReport('excel')}>{exporting === 'excel' ? <LoaderCircle className="spin" size={15} /> : <FileSpreadsheet size={15} />}Excel</button><button className="btn btn-outline-danger btn-sm system-sales-export-btn" disabled={!rows.length || loading || exporting !== null} onClick={() => exportReport('pdf')}>{exporting === 'pdf' ? <LoaderCircle className="spin" size={15} /> : <FileText size={15} />}PDF</button></div>
        <form
          className="system-sales-toolbar-controls"
          onSubmit={(event) => {
            event.preventDefault()
            void generate()
          }}
        >
          <div className="system-sales-date-field"><label htmlFor="emp-from">From</label>
          <input id="emp-from" type="date" className="form-control form-control-sm" value={from} disabled={loading} onChange={e => setFrom(e.target.value)} /></div>

          <div className="system-sales-date-arrow">→</div>

          <div className="system-sales-date-field"><label htmlFor="emp-to">To</label>
          <input id="emp-to" type="date" className="form-control form-control-sm" value={to} disabled={loading} onChange={e => setTo(e.target.value)} /></div>
          <div className="system-sales-date-field">
            <label htmlFor="emp-type">Type</label>
            <select
              id="emp-type"
              className="form-control form-control-sm"
              value={type}
              disabled={loading}
              onChange={(e) => setType(e.target.value)}
            >
              <option>ALL</option>
              <option>OSCA</option>
              <option>PWD</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-sm system-sales-generate-btn" disabled={loading}>
            {loading ? <RefreshCw className="spin" size={16} /> : null} Generate
          </button>
          <div className="system-sales-period"><div>Report Period</div><strong>{report ? formatSystemSalesReportPeriod(report.dateFrom, report.dateTo) : 'Not generated'}</strong></div>
        </form>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
     <div className="system-sales-sc-pwd-table-frame">
        <div className="system-sales-table-container system-sales-sc-pwd-table-container">
          <table className="table system-sales-table system-sales-sc-pwd-table mb-0">
            <colgroup>
              {scPwdColumnWidths.map((width, i) => (
                <col key={i} style={{ width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th>Check Number</th>
                <th>Business Date</th>
                <th>Discount Type</th>
                <th>SC/PWD ID</th>
                <th>SC/PWD Name</th>
                <th className="text-end">Gross Sale</th>
                <th className="text-end">Less VAT</th>
                <th className="text-end">Less Disc.</th>
                <th className="text-end">Net Sales</th>
                <th>Workstation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{String(r.checkNumber ?? '')}</td>
                  <td>{formatDate(r.businessDate)}</td>
                  <td>{String(r.discountType ?? '')}</td>
                  <td>{String(r.discountId ?? '')}</td>
                  <td>{String(r.discountName ?? '')}</td>
                  <td className="text-end system-sales-number">{money(r.grossSale)}</td>
                  <td className="text-end system-sales-number">{money(r.lessVat)}</td>
                  <td className="text-end system-sales-number">{money(r.lessDisc)}</td>
                  <td className="text-end system-sales-number">{money(r.netSales)}</td>
                  <td>{String(r.workstation ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <table className="table system-sales-table system-sales-sc-pwd-table system-sales-summary-table mb-0">
          <caption className="visually-hidden">SC/PWD summary totals</caption>
          <colgroup>
            {scPwdColumnWidths.map((width, i) => (
              <col key={i} style={{ width }} />
            ))}
          </colgroup>
          <tfoot>
            {groups
              .filter(([, items]) => items.length)
              .map(([kind, items]) => (
                <tr key={kind}>
                  <td colSpan={2}></td>
                  <td>TOTAL {kind}</td>
                  <td>{items.length} Qty(s)</td>
                  <td></td>
                  <td className="text-end system-sales-number">{money(total(items, 'grossSale'))}</td>
                  <td className="text-end system-sales-number">{money(total(items, 'lessVat'))}</td>
                  <td className="text-end system-sales-number">{money(total(items, 'lessDisc'))}</td>
                  <td className="text-end system-sales-number">{money(total(items, 'netSales'))}</td>
                  <td></td>
                </tr>
              ))}
            <tr>
              <td colSpan={2}></td>
              <td>GRAND TOTAL</td>
              <td>{rows.length} Transaction(s)</td>
              <td></td>
              <td className="text-end system-sales-number">{money(total(rows, 'grossSale'))}</td>
              <td className="text-end system-sales-number">{money(total(rows, 'lessVat'))}</td>
              <td className="text-end system-sales-number">{money(total(rows, 'lessDisc'))}</td>
              <td className="text-end system-sales-number">{money(total(rows, 'netSales'))}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      {loading && (
        <div className="system-sales-loading-overlay" role="status">
          <div className="system-sales-loading-card">
            <LoaderCircle size={30} className="spin" />
            <strong>Generating report</strong>
            <span>Reading SC / PWD discount transactions...</span>
          </div>
        </div>
      )}
    </div>
  )
}
