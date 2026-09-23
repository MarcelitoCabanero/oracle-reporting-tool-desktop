
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  Gift,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'


interface SystemSalesSummary {
  netSales: number
  taxCollected: number
  vatableSales: number
  vatExemptSales: number
  vatZeroRatedSales: number
  lessVat: number
  lessSC: number
  lessPWD: number
  lessEmployee: number
  lessNationalAthlete: number
  lessSoloParent: number
  gcSales: number
  gcExcess: number
  otherDiscount: number
  voidAmount: number
  voidCount: number
  outstanding: number
}

interface SystemSalesTender {
  tenderName: string
  qty: number
  amount: number
}

interface SystemSalesResult {
  success: boolean
  message: string
  summary: SystemSalesSummary
  tenders: SystemSalesTender[]
  tenderTotal: {
    qty: number
    amount: number
  }
}

function getToday() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(
    now.getDate(),
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(
    'en-PH',
    {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value || 0)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(
    'en-PH',
    {
      maximumFractionDigits: 2,
    },
  ).format(value || 0)
}

function formatDate(value: string) {
  if (!value) return ''

  const [year, month, day] =
    value.split('-').map(Number)

  return new Intl.DateTimeFormat(
    'en-PH',
    {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    },
  ).format(
    new Date(
      year,
      month - 1,
      day,
    ),
  )
}

export default function SystemSalesPage() {
  const today = getToday()

  const [dateFrom, setDateFrom] =
    useState(today)

  const [dateTo, setDateTo] =
    useState(today)

  const [report, setReport] =
    useState<SystemSalesResult | null>(
      null,
    )

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const reportPeriod =
    useMemo(() => {
      if (!report) {
        return 'Not generated'
      }

      if (dateFrom === dateTo) {
        return formatDate(dateFrom)
      }

      return `${formatDate(
        dateFrom,
      )} – ${formatDate(dateTo)}`
    }, [
      report,
      dateFrom,
      dateTo,
    ])

  async function handleGenerate() {
    if (!dateFrom || !dateTo) {
      setError(
        'Please select a valid date range.',
      )
      return
    }

    if (dateFrom > dateTo) {
      setError(
        'From date cannot be later than To date.',
      )
      return
    }

    setLoading(true)
    setError('')

    try {
      const result =
        await window.api.systemSales.generate(
          {
            dateFrom,
            dateTo,
          },
        )

      setReport(result)
    } catch (err) {
      console.error(
        'System Sales error:',
        err,
      )

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

  const summary = report?.summary

  return (
    <div className="container-fluid px-0 system-sales-page">

      {/* =========================
          PAGE HEADER
         ========================= */}
      <div className="system-sales-page-header">
        <div className="d-flex align-items-center gap-3">
          <div className="system-sales-page-icon">
            <ReceiptText size={20} />
          </div>

          <div>
            <h4 className="system-sales-page-title">
              System Sales Report
            </h4>

            <div className="system-sales-page-subtitle">
              Consolidated sales summary
              with tender breakdown
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-success btn-sm system-sales-export-btn"
            disabled={!report || loading}
          >
            <FileSpreadsheet size={15} />
            Excel
          </button>

          <button
            type="button"
            className="btn btn-outline-danger btn-sm system-sales-export-btn"
            disabled={!report || loading}
          >
            <FileText size={15} />
            PDF
          </button>
        </div>
      </div>

      {/* =========================
          PARAMETER TOOLBAR
         ========================= */}
      <div className="system-sales-toolbar">
        <div className="system-sales-toolbar-title">
          <CalendarDays size={16} />

          <span>
            Report Parameters
          </span>
        </div>

        <div className="system-sales-toolbar-controls">

          <div className="system-sales-date-field">
            <label htmlFor="sales-from">
              From
            </label>

            <input
              id="sales-from"
              type="date"
              className="form-control form-control-sm"
              value={dateFrom}
              disabled={loading}
              onChange={(event) =>
                setDateFrom(
                  event.target.value,
                )
              }
            />
          </div>

          <div className="system-sales-date-arrow">
            →
          </div>

          <div className="system-sales-date-field">
            <label htmlFor="sales-to">
              To
            </label>

            <input
              id="sales-to"
              type="date"
              className="form-control form-control-sm"
              value={dateTo}
              disabled={loading}
              onChange={(event) =>
                setDateTo(
                  event.target.value,
                )
              }
            />
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm system-sales-generate-btn"
            disabled={loading}
            onClick={handleGenerate}
          >
            {loading ? (
              <LoaderCircle
                size={15}
                className="spin"
              />
            ) : (
              <RefreshCw size={15} />
            )}

            {loading
              ? 'Generating...'
              : 'Generate'}
          </button>

          <div className="system-sales-period">
            <div>
              Report Period
            </div>

            <strong>
              {reportPeriod}
            </strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
          <AlertTriangle size={16} />

          <span className="small">
            {error}
          </span>
        </div>
      )}

      {!report && !loading && (
        <div className="system-sales-empty-state">
          <ReceiptText
            size={38}
            strokeWidth={1.4}
          />

          <h6>
            No report generated
          </h6>

          <p>
            Select a business date range
            and click Generate.
          </p>
        </div>
      )}

      {report && summary && (
        <>
          {/* =========================
              SALES OVERVIEW
             ========================= */}
          <section className="system-sales-section">
            <div className="system-sales-section-heading">
              <div>
                <h6>
                  Sales Overview
                </h6>

                <span>
                  Key figures for the
                  selected period
                </span>
              </div>
            </div>

            <div className="system-sales-kpi-strip">

              <KpiItem
                label="Net Sales"
                value={
                  formatMoney(
                    summary.netSales,
                  )
                }
                caption="Total net sales"
                icon={
                  <TrendingUp
                    size={17}
                  />
                }
                emphasis
              />

              <KpiItem
                label="Vatable Sales"
                value={
                  formatMoney(
                    summary.vatableSales,
                  )
                }
                caption="VAT applicable sales"
              />

              <KpiItem
                label="Tax Collected"
                value={
                  formatMoney(
                    summary.taxCollected,
                  )
                }
                caption="Collected VAT"
              />

              <KpiItem
                label="Outstanding"
                value={
                  formatMoney(
                    summary.outstanding,
                  )
                }
                caption="Open check balance"
                icon={
                  <AlertTriangle
                    size={17}
                  />
                }
                warning={
                  summary.outstanding !== 0
                }
              />
            </div>
          </section>

          {/* =========================
              REPORT BREAKDOWN
             ========================= */}
          <section className="system-sales-section">
            <div className="system-sales-section-heading">
              <div>
                <h6>
                  Report Breakdown
                </h6>

                <span>
                  Sales classification,
                  discounts and adjustments
                </span>
              </div>
            </div>

            <div className="system-sales-breakdown">

              {/* VAT */}
              <BreakdownColumn
                title="VAT Breakdown"
                accent="info"
              >
                <BreakdownRow
                  label="Vatable Sales"
                  value={formatMoney(
                    summary.vatableSales,
                  )}
                />

                <BreakdownRow
                  label="VAT Exempt Sales"
                  value={formatMoney(
                    summary.vatExemptSales,
                  )}
                />

                <BreakdownRow
                  label="Zero Rated Sales"
                  value={formatMoney(
                    summary.vatZeroRatedSales,
                  )}
                />

                <BreakdownRow
                  label="Tax Collected"
                  value={formatMoney(
                    summary.taxCollected,
                  )}
                />

                <BreakdownRow
                  label="Less VAT"
                  value={formatMoney(
                    summary.lessVat,
                  )}
                  tone="negative"
                />
              </BreakdownColumn>

              {/* DISCOUNT */}
              <BreakdownColumn
                title="Discounts"
                accent="danger"
              >
                <BreakdownRow
                  label="Senior Citizen"
                  value={formatMoney(
                    summary.lessSC,
                  )}
                  tone={
                    summary.lessSC !== 0
                      ? 'negative'
                      : 'default'
                  }
                />

                <BreakdownRow
                  label="PWD"
                  value={formatMoney(
                    summary.lessPWD,
                  )}
                  tone={
                    summary.lessPWD !== 0
                      ? 'negative'
                      : 'default'
                  }
                />

                <BreakdownRow
                  label="Employee"
                  value={formatMoney(
                    summary.lessEmployee,
                  )}
                  tone={
                    summary.lessEmployee !== 0
                      ? 'negative'
                      : 'default'
                  }
                />

                <BreakdownRow
                  label="National Athlete"
                  value={formatMoney(
                    summary.lessNationalAthlete,
                  )}
                  tone={
                    summary
                      .lessNationalAthlete !==
                    0
                      ? 'negative'
                      : 'default'
                  }
                />

                <BreakdownRow
                  label="Solo Parent"
                  value={formatMoney(
                    summary.lessSoloParent,
                  )}
                  tone={
                    summary.lessSoloParent !==
                    0
                      ? 'negative'
                      : 'default'
                  }
                />

                <BreakdownRow
                  label="Other Discount"
                  value={formatMoney(
                    summary.otherDiscount,
                  )}
                  tone={
                    summary.otherDiscount !==
                    0
                      ? 'negative'
                      : 'default'
                  }
                />
              </BreakdownColumn>

              {/* OTHER */}
              <BreakdownColumn
                title="Other Sales & Adjustments"
                accent="warning"
              >
                <BreakdownRow
                  label="GC Sales"
                  value={formatMoney(
                    summary.gcSales,
                  )}
                  tone="positive"
                  icon={
                    <Gift size={13} />
                  }
                />

                <BreakdownRow
                  label="GC Excess"
                  value={formatMoney(
                    summary.gcExcess,
                  )}
                  tone={
                    summary.gcExcess !== 0
                      ? 'positive'
                      : 'default'
                  }
                />

                <BreakdownRow
                  label="Void Amount"
                  value={formatMoney(
                    summary.voidAmount,
                  )}
                  tone={
                    summary.voidAmount !== 0
                      ? 'negative'
                      : 'default'
                  }
                />

                <BreakdownRow
                  label="Void Count"
                  value={formatNumber(
                    summary.voidCount,
                  )}
                  tone={
                    summary.voidCount !== 0
                      ? 'negative'
                      : 'default'
                  }
                />

                <BreakdownRow
                  label="Outstanding"
                  value={formatMoney(
                    summary.outstanding,
                  )}
                  tone={
                    summary.outstanding !== 0
                      ? 'warning'
                      : 'default'
                  }
                  icon={
                    summary.outstanding !==
                    0 ? (
                      <AlertTriangle
                        size={13}
                      />
                    ) : undefined
                  }
                />
              </BreakdownColumn>
            </div>
          </section>

          {/* =========================
              TENDER BREAKDOWN
             ========================= */}
          <section className="system-sales-section system-sales-tender-section">
            <div className="system-sales-section-heading system-sales-tender-heading">
              <div>
                <h6>
                  Tender Breakdown
                </h6>

                <span>
                  Payment methods recorded
                  for the selected period
                </span>
              </div>

              <span className="system-sales-count-badge">
                {report.tenders.length}{' '}
                tender
                {report.tenders.length ===
                1
                  ? ''
                  : 's'}
              </span>
            </div>

            <div className="system-sales-table-container">
              <table className="table system-sales-table mb-0">
                <thead>
                  <tr>
                    <th>
                      Tender Name
                    </th>

                    <th className="text-end system-sales-qty-column">
                      Qty
                    </th>

                    <th className="text-end system-sales-amount-column">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {report.tenders.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center text-secondary py-4"
                      >
                        No tender records
                        found.
                      </td>
                    </tr>
                  ) : (
                    report.tenders.map(
                      (
                        tender,
                        index,
                      ) => (
                        <tr
                          key={`${tender.tenderName}-${index}`}
                        >
                          <td>
                            <span className="system-sales-tender-name">
                              {
                                tender.tenderName
                              }
                            </span>
                          </td>

                          <td className="text-end system-sales-number">
                            {formatNumber(
                              tender.qty,
                            )}
                          </td>

                          <td className="text-end system-sales-number">
                            {formatMoney(
                              tender.amount,
                            )}
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td>
                      TOTAL
                    </td>

                    <td className="text-end">
                      {formatNumber(
                        report
                          .tenderTotal
                          .qty,
                      )}
                    </td>

                    <td className="text-end">
                      {formatMoney(
                        report
                          .tenderTotal
                          .amount,
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}

      {/* =========================
          BUSY OVERLAY
         ========================= */}
      {loading && (
        <div className="system-sales-loading-overlay">
          <div className="system-sales-loading-card">
            <LoaderCircle
              size={30}
              className="spin"
            />

            <strong>
              Generating report
            </strong>

            <span>
              Reading sales and tender
              information...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* =========================
   KPI
   ========================= */

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
        emphasis
          ? 'system-sales-kpi-primary'
          : '',
        warning
          ? 'system-sales-kpi-warning'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="system-sales-kpi-label">
        <span>
          {label}
        </span>

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

/* =========================
   BREAKDOWN
   ========================= */

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

      <div>
        {children}
      </div>
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
  icon?: React.ReactNode
}

function BreakdownRow({
  label,
  value,
  tone = 'default',
  icon,
}: BreakdownRowProps) {
  return (
    <div className="system-sales-breakdown-row">
      <div className="system-sales-breakdown-label">
        {icon && (
          <span>
            {icon}
          </span>
        )}

        <span>
          {label}
        </span>
      </div>

      <span
        className={`system-sales-breakdown-value system-sales-value-${tone}`}
      >
        {value}
      </span>
    </div>
  )
}