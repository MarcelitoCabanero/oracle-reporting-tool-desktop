import {
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'

import type {
  SystemSalesResult,
} from '../../../types/system-sales'

function getToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function formatDate(value: string) {
  if (!value) return ''

  const [year, month, day] =
    value.split('-').map(Number)

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export default function SystemSalesPage() {
  const today = getToday()

  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [report, setReport] =
    useState<SystemSalesResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] =
    useState<'excel' | 'pdf' | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const reportPeriod = useMemo(() => {
    if (!report) return 'Not generated'

    if (dateFrom === dateTo) {
      return formatDate(dateFrom)
    }

    return `${formatDate(dateFrom)} – ${formatDate(dateTo)}`
  }, [report, dateFrom, dateTo])

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
      const result =
        await window.api.systemSales.generate({
          dateFrom,
          dateTo,
        })

      setReport(result)
    } catch (err) {
      console.error('System Sales error:', err)
      setReport(null)
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to generate System Sales report.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(
    type: 'excel' | 'pdf',
  ) {
    if (!report) return

    setExporting(type)
    setError('')
    setStatus('')

    try {
      const input = {
        dateFrom,
        dateTo,
        report,
      }

      const result =
        type === 'excel'
          ? await window.api.systemSales.exportExcel(input)
          : await window.api.systemSales.exportPdf(input)

      if (!result.canceled) {
        if (result.success) {
          setStatus(result.message)
        } else {
          setError(result.message)
        }
      }
    } catch (err) {
      console.error(`System Sales ${type} export error:`, err)
      setError(
        err instanceof Error
          ? err.message
          : `Unable to export ${type.toUpperCase()}.`,
      )
    } finally {
      setExporting(null)
    }
  }

  const summary = report?.summary
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
            {exporting === 'excel'
              ? <LoaderCircle size={15} className="spin" />
              : <FileSpreadsheet size={15} />}
            Excel
          </button>

          <button
            type="button"
            className="btn btn-outline-danger btn-sm system-sales-export-btn"
            disabled={!report || busy}
            onClick={() => handleExport('pdf')}
          >
            {exporting === 'pdf'
              ? <LoaderCircle size={15} className="spin" />
              : <FileText size={15} />}
            PDF
          </button>
        </div>

        <div className="system-sales-toolbar-controls">
          <div className="system-sales-date-field">
            <label htmlFor="sales-from">From</label>
            <input
              id="sales-from"
              type="date"
              className="form-control form-control-sm"
              value={dateFrom}
              disabled={busy}
              onChange={(event) =>
                setDateFrom(event.target.value)
              }
            />
          </div>

          <div className="system-sales-date-arrow">→</div>

          <div className="system-sales-date-field">
            <label htmlFor="sales-to">To</label>
            <input
              id="sales-to"
              type="date"
              className="form-control form-control-sm"
              value={dateTo}
              disabled={busy}
              onChange={(event) =>
                setDateTo(event.target.value)
              }
            />
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm system-sales-generate-btn"
            disabled={busy}
            onClick={handleGenerate}
          >
            {loading
              ? <LoaderCircle size={15} className="spin" />
              : <RefreshCw size={15} />}
            {loading ? 'Generating...' : 'Generate'}
          </button>

          <div className="system-sales-period">
            <div>Report Period</div>
            <strong>{reportPeriod}</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
          <AlertTriangle size={16} />
          <span className="small">{error}</span>
        </div>
      )}

      {status && (
        <div className="alert alert-success py-2 px-3 mb-3 small">
          {status}
        </div>
      )}

      {!report && !loading && (
        <div className="system-sales-empty-state">
          <ReceiptText size={38} strokeWidth={1.4} />
          <h6>No report generated</h6>
          <p>
            Select a business date range and click Generate.
          </p>
        </div>
      )}

      {report && summary && (
        <>
          <section className="system-sales-section">
            <div className="system-sales-section-heading">
              <div>
                <h6>Sales Overview</h6>
                <span>
                  Key figures for the selected period
                </span>
              </div>
            </div>

            <div className="system-sales-kpi-strip">
              <KpiItem
                label="Net Sales"
                value={formatMoney(summary.netSales)}
                caption="Total net sales"
                icon={<TrendingUp size={17} />}
                emphasis
              />

              <KpiItem
                label="Vatable Sales"
                value={formatMoney(summary.vatableSales)}
                caption="VAT applicable sales"
              />

              <KpiItem
                label="Tax Collected"
                value={formatMoney(summary.taxCollected)}
                caption="Collected VAT"
              />

              <KpiItem
                label="Outstanding"
                value={formatMoney(summary.outstanding)}
                caption="Open check balance"
                icon={<AlertTriangle size={17} />}
                warning={summary.outstanding !== 0}
              />
            </div>
          </section>

          <section className="system-sales-section">
            <div className="system-sales-section-heading">
              <div>
                <h6>Report Breakdown</h6>
                <span>
                  Sales classification, discounts and adjustments
                </span>
              </div>
            </div>

            <div className="system-sales-breakdown">
              <BreakdownColumn
                title="VAT Breakdown"
                accent="info"
              >
                <BreakdownRow
                  label="Vatable Sales"
                  value={formatMoney(summary.vatableSales)}
                />
                <BreakdownRow
                  label="VAT Exempt Sales"
                  value={formatMoney(summary.vatExemptSales)}
                />
                <BreakdownRow
                  label="Zero Rated Sales"
                  value={formatMoney(summary.vatZeroRatedSales)}
                />
                <BreakdownRow
                  label="Tax Collected"
                  value={formatMoney(summary.taxCollected)}
                />
                <BreakdownRow
                  label="Less VAT"
                  value={formatMoney(summary.lessVat)}
                  tone="negative"
                />
              </BreakdownColumn>

              <BreakdownColumn
                title="Discounts"
                accent="danger"
              >
                <BreakdownRow
                  label="Senior Citizen"
                  value={formatMoney(summary.lessSC)}
                  tone={summary.lessSC ? 'negative' : 'default'}
                />
                <BreakdownRow
                  label="PWD"
                  value={formatMoney(summary.lessPWD)}
                  tone={summary.lessPWD ? 'negative' : 'default'}
                />
                <BreakdownRow
                  label="Employee"
                  value={formatMoney(summary.lessEmployee)}
                  tone={summary.lessEmployee ? 'negative' : 'default'}
                />
                <BreakdownRow
                  label="National Athlete"
                  value={formatMoney(summary.lessNationalAthlete)}
                  tone={
                    summary.lessNationalAthlete
                      ? 'negative'
                      : 'default'
                  }
                />
                <BreakdownRow
                  label="Solo Parent"
                  value={formatMoney(summary.lessSoloParent)}
                  tone={
                    summary.lessSoloParent
                      ? 'negative'
                      : 'default'
                  }
                />
                <BreakdownRow
                  label="Other Discount"
                  value={formatMoney(summary.otherDiscount)}
                  tone={
                    summary.otherDiscount
                      ? 'negative'
                      : 'default'
                  }
                />
              </BreakdownColumn>

              <BreakdownColumn
                title="Other Sales & Adjustments"
                accent="warning"
              >
                <BreakdownRow
                  label="GC Sales"
                  value={formatMoney(summary.gcSales)}
                  tone="positive"
                />
                <BreakdownRow
                  label="GC Excess"
                  value={formatMoney(summary.gcExcess)}
                  tone={summary.gcExcess ? 'positive' : 'default'}
                />
                <BreakdownRow
                  label="Void Amount"
                  value={formatMoney(summary.voidAmount)}
                  tone={summary.voidAmount ? 'negative' : 'default'}
                />
                <BreakdownRow
                  label="Void Count"
                  value={formatNumber(summary.voidCount)}
                  tone={summary.voidCount ? 'negative' : 'default'}
                />
                <BreakdownRow
                  label="Outstanding"
                  value={formatMoney(summary.outstanding)}
                  tone={summary.outstanding ? 'warning' : 'default'}
                />
              <BreakdownRow
                 label="Variance Amount"
                value={formatMoney(summary.varianceAmount)}
                 tone={summary.varianceAmount ? 'warning' : 'default'}
                />
       </BreakdownColumn>
            </div>
          </section>

          <section className="system-sales-section system-sales-tender-section">
            <div className="system-sales-section-heading system-sales-tender-heading">
              <div>
                <h6>Tender Breakdown</h6>
                <span>
                  Payment methods recorded for the selected period
                </span>
              </div>

              <span className="system-sales-count-badge">
                {report.tenders.length}{' '}
                tender{report.tenders.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="system-sales-table-container">
              <table className="table system-sales-table mb-0">
                <thead>
                  <tr>
                    <th>Tender Name</th>
                    <th className="text-end system-sales-qty-column">
                      Qty
                    </th>
                    <th className="text-end system-sales-amount-column">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {report.tenders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center text-secondary py-4"
                      >
                        No tender records found.
                      </td>
                    </tr>
                  ) : (
                    report.tenders.map((tender, index) => (
                      <tr
                        key={`${tender.tenderName}-${index}`}
                      >
                        <td>
                          <span className="system-sales-tender-name">
                            {tender.tenderName}
                          </span>
                        </td>
                        <td className="text-end system-sales-number">
                          {formatNumber(tender.qty)}
                        </td>
                        <td className="text-end system-sales-number">
                          {formatMoney(tender.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td>TOTAL</td>
                    <td className="text-end">
                      {formatNumber(report.tenderTotal.qty)}
                    </td>
                    <td className="text-end">
                      {formatMoney(report.tenderTotal.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}

      {busy && (
        <div className="system-sales-loading-overlay">
          <div className="system-sales-loading-card">
            <LoaderCircle
              size={30}
              className="spin"
            />
            <strong>
              {loading
                ? 'Generating report'
                : exporting === 'excel'
                  ? 'Exporting Excel'
                  : 'Exporting PDF'}
            </strong>
            <span>
              {loading
                ? 'Reading sales and tender information...'
                : 'Preparing your formatted report...'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

interface KpiItemProps {
  label: string
  value: string
  caption: string
  icon?: React.ReactNode
  emphasis?: boolean
  warning?: boolean
}

function KpiItem({
  label,
  value,
  caption,
  icon,
  emphasis = false,
  warning = false,
}: KpiItemProps) {
  return (
    <div
      className={[
        'system-sales-kpi-item',
        emphasis ? 'system-sales-kpi-primary' : '',
        warning ? 'system-sales-kpi-warning' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="system-sales-kpi-label">
        <span>{label}</span>
        {icon && (
          <span className="system-sales-kpi-icon">
            {icon}
          </span>
        )}
      </div>
      <div className="system-sales-kpi-value">
        {value}
      </div>
      <div className="system-sales-kpi-caption">
        {caption}
      </div>
    </div>
  )
}

type BreakdownAccent =
  | 'info'
  | 'danger'
  | 'warning'

interface BreakdownColumnProps {
  title: string
  accent: BreakdownAccent
  children: React.ReactNode
}

function BreakdownColumn({
  title,
  accent,
  children,
}: BreakdownColumnProps) {
  return (
    <div className="system-sales-breakdown-column">
      <div
        className={`system-sales-breakdown-title system-sales-accent-${accent}`}
      >
        {title}
      </div>
      <div>{children}</div>
    </div>
  )
}

type BreakdownTone =
  | 'default'
  | 'positive'
  | 'negative'
  | 'warning'

interface BreakdownRowProps {
  label: string
  value: string
  tone?: BreakdownTone
}

function BreakdownRow({
  label,
  value,
  tone = 'default',
}: BreakdownRowProps) {
  return (
    <div className="system-sales-breakdown-row">
      <div className="system-sales-breakdown-label">
        <span>{label}</span>
      </div>
      <span
        className={`system-sales-breakdown-value system-sales-value-${tone}`}
      >
        {value}
      </span>
    </div>
  )
}
