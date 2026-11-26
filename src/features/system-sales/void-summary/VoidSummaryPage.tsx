import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  PackageX,
  Receipt,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'

import type {
  VoidSummaryResult,
  VoidTransactionItem,
} from '../../../types/void-summary'
import {
  formatSystemSalesReportPeriod,
  type SystemSalesSharedDatesProps,
} from '../system-sales.types'

interface VoidSummaryState {
  dateFrom: string
  dateTo: string
  report: VoidSummaryResult | null
  voidSearch: string
  cancelSearch: string
  expanded: Record<string, boolean>
  error: string
  status: string
}

let voidSummaryCache: VoidSummaryState | null = null

function getToday() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatMoney = (v: number) =>
  new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)
const formatInt = (v: number) =>
  new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(v || 0)

export default function VoidSummaryPage({
  dateFrom: sharedDateFrom,
  dateTo: sharedDateTo,
  onDateFromChange,
  onDateToChange,
}: SystemSalesSharedDatesProps = {}) {
  const saved = voidSummaryCache
  const today = getToday()

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
  const [report, setReport] = useState<VoidSummaryResult | null>(saved?.report ?? null)
  const [voidSearch, setVoidSearch] = useState(saved?.voidSearch ?? '')
  const [cancelSearch, setCancelSearch] = useState(saved?.cancelSearch ?? '')
  const [expanded, setExpanded] = useState<Record<string, boolean>>(saved?.expanded ?? {})
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [error, setError] = useState(saved?.error ?? '')
  const [status, setStatus] = useState(saved?.status ?? '')

  useEffect(() => {
    voidSummaryCache = { dateFrom, dateTo, report, voidSearch, cancelSearch, expanded, error, status }
  }, [dateFrom, dateTo, report, voidSearch, cancelSearch, expanded, error, status])

  const reportPeriod = useMemo(() => {
    if (!report) return 'Not generated'
    return formatSystemSalesReportPeriod(report.dateFrom, report.dateTo)
  }, [report])

  const filteredVoid = useMemo(() => {
    const items = report?.voidItems ?? []
    const term = voidSearch.trim().toLowerCase()
    if (!term) return items
    return items.filter(
      (i) =>
        i.fcrInvNum.toLowerCase().includes(term) ||
        i.checkNum.toLowerCase().includes(term) ||
        i.posName.toLowerCase().includes(term) ||
        i.businessDate.toLowerCase().includes(term),
    )
  }, [report, voidSearch])

  const filteredCancel = useMemo(() => {
    const items = report?.cancelItems ?? []
    const term = cancelSearch.trim().toLowerCase()
    if (!term) return items
    return items.filter(
      (i) =>
        i.fcrInvNum.toLowerCase().includes(term) ||
        i.checkNum.toLowerCase().includes(term) ||
        i.itemName.toLowerCase().includes(term) ||
        i.itemNumber.toLowerCase().includes(term) ||
        i.businessDate.toLowerCase().includes(term),
    )
  }, [report, cancelSearch])

  const cancelTotals = useMemo(
    () =>
      filteredCancel.reduce(
        (t, i) => ({ qty: t.qty + i.lineCount, amount: t.amount + i.lineTotal }),
        { qty: 0, amount: 0 },
      ),
    [filteredCancel],
  )

  async function handleGenerate() {
    if (!dateFrom || !dateTo) {
      setError('Please select a valid date range.')
      return
    }
    if (dateFrom > dateTo) {
      setError('From date cannot be later than To date.')
      return
    }
    setLoading(true)
    setError('')
    setStatus('')
    try {
      const result = await window.api.voidSummary.generate({ dateFrom, dateTo })
      setReport(result)
      setExpanded({})
    } catch (err) {
      console.error('Void Summary error:', err)
      setReport(null)
      setError(err instanceof Error ? err.message : 'Unable to generate Void Summary report.')
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(type: 'excel' | 'pdf') {
    if (!report) return
    setExporting(type)
    setError('')
    setStatus('')
    try {
      // Export what the user sees (search-filtered rows), consistent with the web app.
      const exportReport: VoidSummaryResult = {
        ...report,
        voidItems: filteredVoid,
        cancelItems: filteredCancel,
        cancelSummary: {
          ...report.cancelSummary,
          totalCancelledQty: cancelTotals.qty,
          totalCancelledAmount: cancelTotals.amount,
          rowCount: filteredCancel.length,
        },
      }
      const input = { dateFrom: report.dateFrom, dateTo: report.dateTo, report: exportReport }
      const result =
        type === 'excel'
          ? await window.api.voidSummary.exportExcel(input)
          : await window.api.voidSummary.exportPdf(input)
      if (!result.canceled) {
        if (result.success) setStatus(result.message)
        else setError(result.message)
      }
    } catch (err) {
      console.error(`Void Summary ${type} export error:`, err)
      setError(err instanceof Error ? err.message : `Unable to export ${type.toUpperCase()}.`)
    } finally {
      setExporting(null)
    }
  }

  const busy = loading || exporting !== null

  return (
    <div className="container-fluid px-0 system-sales-page">
      <div className="system-sales-toolbar">
        <div className="system-sales-toolbar-title">
          <CalendarDays size={16} />
          <span>Report Parameters</span>
        </div>

        <div className="system-sales-toolbar-export">
          <button
            type="button"
            className="btn btn-outline-success btn-sm system-sales-export-btn"
            disabled={!report || busy}
            onClick={() => handleExport('excel')}
          >
            {exporting === 'excel' ? <LoaderCircle size={15} className="spin" /> : <FileSpreadsheet size={15} />}
            Excel
          </button>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm system-sales-export-btn"
            disabled={!report || busy}
            onClick={() => handleExport('pdf')}
          >
            {exporting === 'pdf' ? <LoaderCircle size={15} className="spin" /> : <FileText size={15} />}
            PDF
          </button>
        </div>

        <form
          className="system-sales-toolbar-controls"
          onSubmit={(event) => {
            event.preventDefault()
            void handleGenerate()
          }}
        >
          <div className="system-sales-date-field">
            <label htmlFor="void-from">From</label>
            <input
              id="void-from"
              type="date"
              className="form-control form-control-sm"
              value={dateFrom}
              disabled={busy}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="system-sales-date-arrow">→</div>
          <div className="system-sales-date-field">
            <label htmlFor="void-to">To</label>
            <input
              id="void-to"
              type="date"
              className="form-control form-control-sm"
              value={dateTo}
              disabled={busy}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-sm system-sales-generate-btn"
            disabled={busy}
          >
            {loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}
            {loading ? 'Generating...' : 'Generate'}
          </button>
          <div className="system-sales-period">
            <div>Report Period</div>
            <strong>{reportPeriod}</strong>
          </div>
        </form>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
          <AlertTriangle size={16} />
          <span className="small">{error}</span>
        </div>
      )}
      {report?.warning && (
        <div className="alert alert-warning py-2 px-3 d-flex align-items-center gap-2 mb-3">
          <AlertTriangle size={16} />
          <span className="small">{report.warning}</span>
        </div>
      )}
      {status && <div className="alert alert-success py-2 px-3 mb-3 small">{status}</div>}

      {!report && !loading && (
        <div className="system-sales-empty-state">
          <XCircle size={38} strokeWidth={1.4} />
          <h6>No report generated</h6>
          <p>Select a business date range and click Generate to view voided transactions and cancelled items.</p>
        </div>
      )}

      {report && (
        <>
          <section className="system-sales-section">
            <div className="system-sales-section-heading">
              <div>
                <h6>Void Overview</h6>
                <span>Invoices voided in the selected period</span>
              </div>
            </div>
            <div className="system-sales-kpi-strip void-summary-kpi-strip">
              <div className="system-sales-kpi-item">
                <div className="system-sales-kpi-label">
                  <span>Total Void Count</span>
                  <span className="system-sales-kpi-icon"><XCircle size={17} /></span>
                </div>
                <div className="system-sales-kpi-value">{formatInt(report.voidSummary.totalVoidCount)}</div>
                <div className="system-sales-kpi-caption">Invoices voided in period</div>
              </div>
              <div className="system-sales-kpi-item">
                <div className="system-sales-kpi-label">
                  <span>Total Void Amount</span>
                  <span className="system-sales-kpi-icon"><Receipt size={17} /></span>
                </div>
                <div className="system-sales-kpi-value">₱{formatMoney(report.voidSummary.totalVoidAmount)}</div>
                <div className="system-sales-kpi-caption">Cumulative gross sales voided</div>
              </div>
              <div className="system-sales-kpi-item">
                <div className="system-sales-kpi-label">
                  <span>Avg Void Process Interval</span>
                  <span className="system-sales-kpi-icon"><Clock size={17} /></span>
                </div>
                <div className="system-sales-kpi-value">{report.voidSummary.avgIntervalFormatted || '0s'}</div>
                <div className="system-sales-kpi-caption">Time elapsed: wrong order to void</div>
              </div>
            </div>
          </section>

          <section className="system-sales-section">
            <div className="system-sales-section-heading system-sales-tender-heading">
              <div>
                <h6>Void Transactions ({filteredVoid.length})</h6>
                <span>Invoice processing intervals and transaction audit logs</span>
              </div>
              <div className="void-summary-search input-group input-group-sm">
                <span className="input-group-text"><Search size={14} /></span>
                <input
                  className="form-control"
                  placeholder="Filter invoice, check #, POS..."
                  value={voidSearch}
                  onChange={(e) => setVoidSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="system-sales-table-container">
              <table className="table system-sales-table mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 40 }} aria-label="Expand"></th>
                    <th>Business Date</th>
                    <th>Invoice Number</th>
                    <th>Check #</th>
                    <th>POS Station</th>
                    <th>Transaction Start</th>
                    <th>Void Processed</th>
                    <th>Void Interval</th>
                    <th className="text-end">Void Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVoid.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center text-secondary py-4">
                        No void transactions found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredVoid.map((item) => (
                      <VoidRow
                        key={item.fcrInvNum}
                        item={item}
                        isExpanded={!!expanded[item.fcrInvNum]}
                        onToggle={() =>
                          setExpanded((prev) => ({ ...prev, [item.fcrInvNum]: !prev[item.fcrInvNum] }))
                        }
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="system-sales-section system-sales-tender-section">
            <div className="system-sales-section-heading system-sales-tender-heading">
              <div>
                <h6><PackageX size={14} className="me-1" />Cancelled Items ({filteredCancel.length})</h6>
                <span>
                  Line-item cancellations with negative sales values ({formatInt(report.cancelSummary.totalCancelledQty)} items total)
                </span>
              </div>
              <div className="void-summary-search input-group input-group-sm">
                <span className="input-group-text"><Search size={14} /></span>
                <input
                  className="form-control"
                  placeholder="Filter item name, code, invoice..."
                  value={cancelSearch}
                  onChange={(e) => setCancelSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="system-sales-table-container">
              <table className="table system-sales-table mb-0">
                <thead>
                  <tr>
                    <th>Business Date</th>
                    <th>Time</th>
                    <th>Invoice Number</th>
                    <th>Check #</th>
                    <th>Item Code</th>
                    <th>Item Description</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCancel.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-secondary py-4">
                        No cancelled items found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCancel.map((item, idx) => (
                      <tr key={`${item.fcrInvNum}-${item.itemNumber}-${idx}`}>
                        <td className="text-nowrap">{item.businessDate}</td>
                        <td className="text-nowrap text-secondary">
                          {item.transDatetime.split(' ')[1] || item.transDatetime}
                        </td>
                        <td className="fw-semibold">{item.fcrInvNum}</td>
                        <td className="text-secondary">{item.checkNum}</td>
                        <td>{item.itemNumber}</td>
                        <td>{item.itemName}</td>
                        <td className="text-center system-sales-value-negative">-{formatInt(item.lineCount)}</td>
                        <td className="text-end system-sales-number system-sales-value-negative">
                          -₱{formatMoney(item.lineTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredCancel.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={6}>TOTAL CANCELLED ITEMS ({filteredCancel.length} lines)</td>
                      <td className="text-center system-sales-value-negative">-{formatInt(cancelTotals.qty)}</td>
                      <td className="text-end system-sales-value-negative">-₱{formatMoney(cancelTotals.amount)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        </>
      )}

      {busy && (
        <div className="system-sales-loading-overlay" role="status">
          <div className="system-sales-loading-card">
            <LoaderCircle size={30} className="spin" />
            <strong>
              {loading ? 'Generating report' : exporting === 'excel' ? 'Exporting Excel' : 'Exporting PDF'}
            </strong>
            <span>
              {loading ? 'Reading void transactions and cancelled items...' : 'Preparing your formatted report...'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function VoidRow({
  item,
  isExpanded,
  onToggle,
}: {
  item: VoidTransactionItem
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <Fragment>
      <tr onClick={onToggle} className={`void-row-clickable ${isExpanded ? 'void-row-expanded' : ''}`}>
        <td className="text-center text-secondary">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </td>
        <td className="text-nowrap">{item.businessDate}</td>
        <td className="fw-semibold">{item.fcrInvNum}</td>
        <td className="text-secondary">{item.checkNum}</td>
        <td>{item.posName}</td>
        <td className="text-nowrap text-secondary">{item.startTime}</td>
        <td className="text-nowrap text-secondary">{item.voidTime}</td>
        <td>
          <span className="void-interval-badge">
            <Clock size={12} /> {item.intervalFormatted}
          </span>
        </td>
        <td className="text-end fw-bold system-sales-value-negative system-sales-number">
          ₱{formatMoney(item.voidAmount)}
        </td>
      </tr>
      {isExpanded && (
        <tr className="void-subtable-row">
          <td colSpan={9} className="p-0">
            <div className="void-subtable-container">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <small className="fw-bold text-uppercase text-secondary">
                  Transaction Audit Trail for Invoice {item.fcrInvNum}
                </small>
                <small className="text-secondary">{item.transactionCount} entries recorded</small>
              </div>
              <table className="table table-sm mb-0 void-subtable">
                <thead>
                  <tr>
                    <th style={{ width: 45 }} className="text-center">Seq</th>
                    <th>Timestamp</th>
                    <th>POS Terminal</th>
                    <th>Check #</th>
                    <th className="text-end">Gross Sale</th>
                    <th>Event Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  {item.records.map((rec, idx) => {
                    const isFirst = idx === 0
                    const isLast = idx === item.records.length - 1
                    return (
                      <tr key={idx}>
                        <td className="text-center text-secondary">{idx + 1}</td>
                        <td className="text-nowrap fw-semibold">{rec.transdatetime}</td>
                        <td>{rec.posname}</td>
                        <td>{rec.checknum}</td>
                        <td className="text-end fw-bold">₱{formatMoney(rec.grossSale)}</td>
                        <td>
                          {isFirst ? (
                            <span className="void-event-badge void-event-original">Wrong / Original Transaction</span>
                          ) : isLast ? (
                            <span className="void-event-badge void-event-void">Void Completed</span>
                          ) : (
                            <span className="void-event-badge void-event-mid">Intermediary POS Event</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}
