import { useEffect, useState } from 'react'
import { FileSpreadsheet, FileText, LoaderCircle, RefreshCw } from 'lucide-react'

const today = () => new Date().toISOString().slice(0, 10)
const n = (v: unknown) => Number(v ?? 0)
const money = (v: unknown) =>
  n(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
  type: string
  rows: Array<Record<string, unknown>>
  error: string
}

let scPwdPageCache: ScPwdPageState | null = null

export default function ScPwdPage() {
  const savedState = scPwdPageCache
  const [from, setFrom] = useState(savedState?.from ?? today)
  const [to, setTo] = useState(savedState?.to ?? today)
  const [type, setType] = useState(savedState?.type ?? 'ALL')
  const [rows, setRows] = useState<Array<Record<string, unknown>>>(savedState?.rows ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(savedState?.error ?? '')
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await window.api.scPwd.generate({ dateFrom: from, dateTo: to, type }))
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
    scPwdPageCache = { from, to, type, rows, error }
  }, [from, to, type, rows, error])
  const exportReport = async (format: 'excel' | 'pdf') => { setExporting(format); try { const input = { dateFrom: from, dateTo: to, type, rows }; const response = format === 'excel' ? await window.api.scPwd.exportExcel(input) : await window.api.scPwd.exportPdf(input); if (!response.canceled && !response.success) setError(response.message) } catch (e) { setError(e instanceof Error ? e.message : 'Export failed.') } finally { setExporting(null) } }

  return (
    <div className="system-sales-page">
      <div className="system-sales-page-header">
        <div>
          <h4 className="system-sales-page-title">SC / PWD Listing</h4>
          <div className="system-sales-page-subtitle">
            Senior Citizen and PWD discount transaction details grouped by type
          </div>
        </div>
      </div>
      <div className="system-sales-toolbar">
        <div className="system-sales-toolbar-export"><button className="btn btn-outline-success btn-sm system-sales-export-btn" disabled={!rows.length || loading || exporting !== null} onClick={() => exportReport('excel')}>{exporting === 'excel' ? <LoaderCircle className="spin" size={15} /> : <FileSpreadsheet size={15} />}Excel</button><button className="btn btn-outline-danger btn-sm system-sales-export-btn" disabled={!rows.length || loading || exporting !== null} onClick={() => exportReport('pdf')}>{exporting === 'pdf' ? <LoaderCircle className="spin" size={15} /> : <FileText size={15} />}PDF</button></div>
        <div className="system-sales-toolbar-controls">
          <div className="system-sales-date-field">
            <label>From</label>
            <input
              type="date"
              value={from}
              disabled={loading}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="system-sales-date-field">
            <label>To</label>
            <input
              type="date"
              value={to}
              disabled={loading}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="system-sales-date-field">
            <label>Type</label>
            <select
              value={type}
              disabled={loading}
              onChange={(e) => setType(e.target.value)}
            >
              <option>ALL</option>
              <option>OSCA</option>
              <option>PWD</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            {loading ? <RefreshCw className="spin" size={16} /> : null} Generate
          </button>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="system-sales-table-container">
        <table className="table system-sales-table">
          <thead>
            <tr>
              <th>Check Number</th>
              <th>Business Date</th>
              <th>Discount Type</th>
              <th>SC/PWD ID</th>
              <th>SC/PWD Name</th>
              <th>Gross Sale</th>
              <th>Less VAT</th>
              <th>Less Disc.</th>
              <th>Net Sales</th>
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
                <td>{money(r.grossSale)}</td>
                <td>{money(r.lessVat)}</td>
                <td>{money(r.lessDisc)}</td>
                <td>{money(r.netSales)}</td>
                <td>{String(r.workstation ?? '')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {groups
              .filter(([, items]) => items.length)
              .map(([kind, items]) => (
                <tr key={kind}>
                  <td colSpan={2}></td>
                  <td>TOTAL {kind}</td>
                  <td>{items.length} Qty(s)</td>
                  <td></td>
                  <td>{money(total(items, 'grossSale'))}</td>
                  <td>{money(total(items, 'lessVat'))}</td>
                  <td>{money(total(items, 'lessDisc'))}</td>
                  <td>{money(total(items, 'netSales'))}</td>
                  <td></td>
                </tr>
              ))}
            <tr>
              <td colSpan={2}></td>
              <td>GRAND TOTAL</td>
              <td>{rows.length} Transaction(s)</td>
              <td></td>
              <td>{money(total(rows, 'grossSale'))}</td>
              <td>{money(total(rows, 'lessVat'))}</td>
              <td>{money(total(rows, 'lessDisc'))}</td>
              <td>{money(total(rows, 'netSales'))}</td>
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
