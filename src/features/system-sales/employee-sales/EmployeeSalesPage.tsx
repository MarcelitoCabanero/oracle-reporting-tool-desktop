import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, FileSpreadsheet, FileText, LoaderCircle, ReceiptText, RefreshCw, UsersRound } from 'lucide-react'
import type { EmployeeOption, EmployeeSalesResult } from '../../../types/employee-sales'
import VarianceCheckingModal from '../variance-checking/VarianceCheckingModal'
import './EmployeeSalesPage.css'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const money = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)
const qty = (n: number) => new Intl.NumberFormat('en-PH').format(n)
const ALL_EMPLOYEES = '__all_employees__'
const PAGE_SIZE = 10

interface EmployeeSalesPageState {
  dateFrom: string
  dateTo: string
  employeeName: string
  report: EmployeeSalesResult | null
  allReports: EmployeeSalesResult[]
  page: number
  error: string
}

let employeeSalesCache: EmployeeSalesPageState | null = null

export default function EmployeeSalesPage() {
  const savedState = employeeSalesCache
  const [dateFrom, setDateFrom] = useState(savedState?.dateFrom ?? today)
  const [dateTo, setDateTo] = useState(savedState?.dateTo ?? today)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [employeeName, setEmployeeName] = useState(savedState?.employeeName ?? '')
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const [error, setError] = useState(savedState?.error ?? '')
  const [report, setReport] = useState<EmployeeSalesResult | null>(savedState?.report ?? null)
  const [allReports, setAllReports] = useState<EmployeeSalesResult[]>(savedState?.allReports ?? [])
  const [page, setPage] = useState(savedState?.page ?? 1)
  const [showVariance, setShowVariance] = useState(false)
  const [varianceEmployee, setVarianceEmployee] = useState('')

  useEffect(() => {
    let active = true
    async function fetchEmployees() {
      try {
        if (!window.api?.employeeSales?.employees) throw new Error('Employee Sales desktop API is unavailable. Check preload wiring and restart Electron.')
        const rows = await window.api.employeeSales.employees()
        if (!active) return
        setEmployees(rows)
        setEmployeeName(current => current || rows[0]?.checkName || '')
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load employees.')
      } finally {
        if (active) setLoadingEmployees(false)
      }
    }
    void fetchEmployees()
    return () => { active = false }
  }, [])

  useEffect(() => {
    employeeSalesCache = { dateFrom, dateTo, employeeName, report, allReports, page, error }
  }, [dateFrom, dateTo, employeeName, report, allReports, page, error])

  async function generate() {
    if (!employeeName) { setError('Please select an employee.'); return }
    if (!dateFrom || !dateTo || dateFrom > dateTo) { setError('Please select a valid date range.'); return }
    setError('')
    setReport(null)
    setAllReports([])
    setPage(1)
    setLoading(true)
    try {
      if (employeeName === ALL_EMPLOYEES) {
        if (!window.api?.employeeSales?.generateAll) throw new Error('Employee Sales desktop API is unavailable. Check preload wiring and restart Electron.')
        const results = await window.api.employeeSales.generateAll({ dateFrom, dateTo })
        setAllReports(results)
        setReport(results[0] ?? null)
      } else {
        if (!window.api?.employeeSales?.generate) throw new Error('Employee Sales desktop API is unavailable. Check preload wiring and restart Electron.')
        setReport(await window.api.employeeSales.generate({ employeeName, dateFrom, dateTo }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate Employee Sales.')
    } finally {
      setLoading(false)
    }
  }

  async function exportReport(type: 'excel' | 'pdf') {
    if (!report) return
    setExporting(type)
    setError('')
    try {
      const result = type === 'excel'
        ? await window.api.employeeSales.exportExcel({ report })
        : await window.api.employeeSales.exportPdf({ report })
      if (!result.canceled && !result.success) setError(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Unable to export ${type.toUpperCase()} report.`)
    } finally { setExporting(null) }
  }

  const totalPages = Math.max(1, Math.ceil(allReports.length / PAGE_SIZE))
  const pageReports = allReports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const m = report?.metrics
  return <div className="employee-sales-page">
    <div className="system-sales-page-header">
      <div className="d-flex align-items-center gap-3">
        <div className="system-sales-page-icon"><UsersRound size={20} /></div>
        <div><h4 className="system-sales-page-title">Employee Sales Report</h4>
          <div className="system-sales-page-subtitle">Sales metrics and tender breakdown filtered by employee</div></div>
      </div>
    </div>

    <div className="system-sales-toolbar">
      <div className="system-sales-toolbar-title"><CalendarDays size={16} /> Report Parameters</div>
      <div className="system-sales-toolbar-export">
        <button type="button" className="btn btn-outline-success btn-sm system-sales-export-btn" disabled={!report || loading || exporting !== null} onClick={() => exportReport('excel')}>
          {exporting === 'excel' ? <LoaderCircle size={15} className="spin" /> : <FileSpreadsheet size={15} />}Excel
        </button>

        <button type="button" className="btn btn-outline-danger btn-sm system-sales-export-btn" disabled={!report || loading || exporting !== null} onClick={() => exportReport('pdf')}>
          {exporting === 'pdf' ? <LoaderCircle size={15} className="spin" /> : <FileText size={15} />}PDF
        </button>
      </div>
      <div className="system-sales-toolbar-controls employee-sales-controls">
        <div className="system-sales-date-field"><label htmlFor="emp-from">From</label>
          <input id="emp-from" type="date" className="form-control form-control-sm" value={dateFrom} disabled={loading} onChange={e => setDateFrom(e.target.value)} /></div>
        <div className="system-sales-date-arrow">→</div>
        <div className="system-sales-date-field"><label htmlFor="emp-to">To</label>
          <input id="emp-to" type="date" className="form-control form-control-sm" value={dateTo} disabled={loading} onChange={e => setDateTo(e.target.value)} /></div>
        <div className="employee-sales-employee-field"><label htmlFor="emp-name">Employee</label>
          <select id="emp-name" className="form-select form-select-sm" value={employeeName} disabled={loading || loadingEmployees} onChange={e => setEmployeeName(e.target.value)}>
            {employees.length === 0 && <option value="">No employees available</option>}
            {employees.length > 0 && <option value={ALL_EMPLOYEES}>ALL</option>}
            {employees.map((e, index) => <option key={`${e.employeeId}-${index}`} value={e.checkName}>{e.checkName}</option>)}
          </select></div>
        <button type="button" className="btn btn-primary btn-sm system-sales-generate-btn" onClick={generate} disabled={loading || loadingEmployees || !employeeName}>
          {loading ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}{loading ? 'Generating...' : 'Generate'}
        </button>
        <div className="system-sales-period"><div>Report Period</div><strong>{report ? `${report.dateFrom} – ${report.dateTo}` : 'Not generated'}</strong></div>
      </div>
    </div>

    {error && <div role="alert" className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3"><AlertTriangle size={16} />{error}</div>}
    {loading && <div role="status" className="employee-sales-message">Reading employee sales and tender information...</div>}
    {!report && !loading && !error && <div className="system-sales-empty-state"><ReceiptText size={38} strokeWidth={1.4} /><h6>No report generated</h6><p>Select a date range and employee, then click Generate.</p></div>}
    {report && !report.hasSales && <div className="system-sales-empty-state"><ReceiptText size={38} strokeWidth={1.4} /><h6>No sales found</h6><p>No records for {report.employeeName} in the selected period.</p></div>}
    {employeeName === ALL_EMPLOYEES && !loading && allReports.length === 0 && <div className="system-sales-empty-state"><ReceiptText size={38} strokeWidth={1.4} /><h6>No sales found</h6><p>No employees have item sales in the selected period.</p></div>}

    {allReports.length > 0 && <div className="employee-sales-pagination"><span>{allReports.length} employee report{allReports.length === 1 ? '' : 's'} found · Page {page} of {totalPages}</span><div><button type="button" className="btn btn-sm btn-outline-secondary" disabled={page === 1} onClick={() => { const next = page - 1; setPage(next); setReport(allReports[(next - 1) * PAGE_SIZE]) }}>Previous</button><button type="button" className="btn btn-sm btn-outline-secondary ms-2" disabled={page === totalPages} onClick={() => { const next = page + 1; setPage(next); setReport(allReports[(next - 1) * PAGE_SIZE]) }}>Next</button></div></div>}
    {pageReports.length > 1 && <div className="employee-sales-page-list">{pageReports.map((item, index) => <button key={item.employeeName} type="button" className={`btn btn-sm ${report?.employeeName === item.employeeName ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setReport(item)}>{(page - 1) * PAGE_SIZE + index + 1}. {item.employeeName}</button>)}</div>}

    {report?.hasSales && m && <>
      <section className="system-sales-section">
        <div className="system-sales-section-heading"><div><h6>Sales Overview</h6><span>Key figures for {report.employeeName}</span></div></div>
        <div className="system-sales-kpi-strip">
          <Kpi label="Net Sales" value={money(m.netSales)} caption="Total net sales" primary />
          <Kpi label="Revenue" value={money(m.netSales + m.taxCollected)} caption="Total revenue sales" />
          <Kpi label="Tax Collected" value={money(m.taxCollected)} caption="Collected VAT" />
          <Kpi label="Variance" value={money(m.varianceAmount)} caption="Variance Total" warning={m.outstanding !== 0} onClick={() => { setVarianceEmployee(report.employeeName); setShowVariance(true) }} />
        </div>
      </section>
      <section className="system-sales-section">
        <div className="system-sales-section-heading"><div><h6>Report Breakdown</h6><span>Discounts and adjustments for the selected employee</span></div></div>
        <div className="employee-sales-breakdown">
          <div className="system-sales-breakdown-column"><div className="system-sales-breakdown-title system-sales-accent-info">VAT Breakdown</div>
            <BreakdownRow label="Vatable Sales" value={m.vatableSales} />
            <BreakdownRow label="VAT Exempt Sales" value={m.vatExemptSales} />
            <BreakdownRow label="Zero Rated Sales" value={m.vatZeroRatedSales} />
            <BreakdownRow label="Tax Collected" value={m.taxCollected} />
            <BreakdownRow label="Less VAT" value={m.lessVat} tone="negative" /></div>
          <div className="system-sales-breakdown-column"><div className="system-sales-breakdown-title system-sales-accent-danger">Discounts</div>
            <BreakdownRow label="Senior Citizen" value={m.lessSC} tone={m.lessSC !== 0 ? 'negative' : 'default'} />
            <BreakdownRow label="PWD" value={m.lessPWD} tone={m.lessPWD !== 0 ? 'negative' : 'default'} />
            <BreakdownRow label="Employee" value={m.lessEmp} tone={m.lessEmp !== 0 ? 'negative' : 'default'} />
            <BreakdownRow label="National Athlete" value={m.lessNationalAth} tone={m.lessNationalAth !== 0 ? 'negative' : 'default'} />
            <BreakdownRow label="Solo Parent" value={m.lessSoloParent} tone={m.lessSoloParent !== 0 ? 'negative' : 'default'} />
            <BreakdownRow label="Other Discount" value={m.otherDiscount} tone={m.otherDiscount !== 0 ? 'negative' : 'default'} /></div>
          <div className="system-sales-breakdown-column"><div className="system-sales-breakdown-title system-sales-accent-warning">Other Sales &amp; Adjustments</div>
            <BreakdownRow label="GC Sales" value={m.gcSales} tone={m.gcSales !== 0 ? 'positive' : 'default'} />
            <BreakdownRow label="GC Excess" value={m.gcExcess} tone={m.gcExcess !== 0 ? 'positive' : 'default'} />
            <BreakdownRow label="Void Amount" value={m.voidAmount} tone={m.voidAmount !== 0 ? 'negative' : 'default'} />
            <BreakdownRow label="Void Count" value={m.voidCount} format="count" tone={m.voidCount !== 0 ? 'negative' : 'default'} />
            <BreakdownRow label="Outstanding" value={m.outstanding} tone={m.outstanding !== 0 ? 'warning' : 'default'} />
            <BreakdownRow label="Variance Amount" value={m.varianceAmount} tone={m.varianceAmount !== 0 ? 'warning' : 'default'} /></div>
        </div>
      </section>
      <section className="system-sales-section system-sales-tender-section">
        <div className="system-sales-section-heading system-sales-tender-heading"><div><h6>Tender Breakdown</h6><span>Payment methods recorded for the selected employee</span></div>
          <span className="system-sales-count-badge">{report.tenders.length} tender{report.tenders.length === 1 ? '' : 's'}</span></div>
        <div className="system-sales-table-container"><table className="table system-sales-table mb-0"><thead><tr><th>Tender Name</th><th className="text-end system-sales-qty-column">Qty</th><th className="text-end system-sales-amount-column">Amount</th></tr></thead>
          <tbody>{report.tenders.length === 0 ? <tr><td colSpan={3} className="text-center text-secondary py-4">No tender records found.</td></tr> : report.tenders.map((t, i) => <tr key={`${t.tenderName}-${i}`}><td className="system-sales-tender-name">{t.tenderName}</td><td className="text-end system-sales-number">{qty(t.qty)}</td><td className="text-end system-sales-number">{money(t.amount)}</td></tr>)}</tbody>
          <tfoot><tr><td>TOTAL</td><td className="text-end">{qty(report.tenderTotal.qty)}</td><td className="text-end">{money(report.tenderTotal.amount)}</td></tr></tfoot></table></div>
      </section>
    </>}

    {loading && <div className="system-sales-loading-overlay" role="status" aria-live="polite">
      <div className="system-sales-loading-card">
        <LoaderCircle size={30} className="spin" />
        <strong>Generating report</strong>
        <span>Reading employee sales and tender information...</span>
      </div>
    </div>}
    {showVariance && <VarianceCheckingModal dateFrom={dateFrom} dateTo={dateTo} employeeName={varianceEmployee} onClose={() => setShowVariance(false)} />}
  </div>
}

function Kpi({ label, value, caption, primary = false, warning = false, onClick }: { label: string; value: string; caption: string; primary?: boolean; warning?: boolean; onClick?: () => void }) {
  const className = `system-sales-kpi-item${primary ? ' system-sales-kpi-primary' : ''}${warning ? ' system-sales-kpi-warning' : ''}${onClick ? ' system-sales-kpi-button' : ''}`
  const content = <>
    <div className="system-sales-kpi-label">{label}</div><div className="system-sales-kpi-value" title={value}>{value}</div><div className="system-sales-kpi-caption">{caption}</div>
  </>
  return onClick ? <button type="button" className={className} onClick={onClick} aria-label="View variance checking">{content}</button> : <div className={className}>{content}</div>
}
function BreakdownRow({ label, value, tone = 'default', format = 'money' }: { label: string; value: number; tone?: 'default' | 'positive' | 'negative' | 'warning'; format?: 'money' | 'count' }) {
  return <div className="system-sales-breakdown-row"><span className="system-sales-breakdown-label">{label}</span><span className={`system-sales-breakdown-value system-sales-value-${tone}`}>{format === 'count' ? qty(value) : money(value)}</span></div>
}
