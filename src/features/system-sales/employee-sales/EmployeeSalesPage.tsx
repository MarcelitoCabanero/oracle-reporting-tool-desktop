import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, LoaderCircle, ReceiptText, RefreshCw, UsersRound } from 'lucide-react'
import type { EmployeeOption, EmployeeSalesResult } from '../../../types/employee-sales'
import './EmployeeSalesPage.css'

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const money = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)
const qty = (n: number) => new Intl.NumberFormat('en-PH').format(n)

export default function EmployeeSalesPage() {
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [employeeName, setEmployeeName] = useState('')
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<EmployeeSalesResult | null>(null)

  useEffect(() => {
    let active = true
    async function fetchEmployees() {
      try {
        if (!window.api?.employeeSales?.employees) throw new Error('Employee Sales desktop API is unavailable. Check preload wiring and restart Electron.')
        const rows = await window.api.employeeSales.employees()
        if (!active) return
        setEmployees(rows)
        setEmployeeName(rows[0]?.checkName ?? '')
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load employees.')
      } finally {
        if (active) setLoadingEmployees(false)
      }
    }
    void fetchEmployees()
    return () => { active = false }
  }, [])

  async function generate() {
    if (!employeeName) { setError('Please select an employee.'); return }
    if (!dateFrom || !dateTo || dateFrom > dateTo) { setError('Please select a valid date range.'); return }
    setError('')
    setReport(null)
    setLoading(true)
    try {
      if (!window.api?.employeeSales?.generate) throw new Error('Employee Sales desktop API is unavailable. Check preload wiring and restart Electron.')
      setReport(await window.api.employeeSales.generate({ employeeName, dateFrom, dateTo }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate Employee Sales.')
    } finally {
      setLoading(false)
    }
  }

  const m = report?.metrics
  const rows = m && report ? [
    ['Service Charge', m.serviceAmount, 'default'],
    ['Less VAT', m.lessVat, 'negative'],
    ['Senior Citizen', m.lessSC, 'negative'],
    ['PWD', m.lessPWD, 'negative'],
    ['Employee', m.lessEmp, 'negative'],
    ['National Athlete', m.lessNationalAth, 'negative'],
    ['Solo Parent', m.lessSoloParent, 'negative'],
    ['Other Discount', m.otherDiscount, 'negative'],
    ['Total Discounts', report.totalDiscounts, 'negative'],
    ['Void Amount', m.voidAmount, 'negative'],
    ['Variance Amount', report.variance, report.variance === 0 ? 'default' : 'warning'],
  ] as const : []

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
      <div className="system-sales-toolbar-controls employee-sales-controls">
        <div className="system-sales-date-field"><label htmlFor="emp-from">From</label>
          <input id="emp-from" type="date" className="form-control form-control-sm" value={dateFrom} disabled={loading} onChange={e => setDateFrom(e.target.value)} /></div>
        <div className="system-sales-date-arrow">→</div>
        <div className="system-sales-date-field"><label htmlFor="emp-to">To</label>
          <input id="emp-to" type="date" className="form-control form-control-sm" value={dateTo} disabled={loading} onChange={e => setDateTo(e.target.value)} /></div>
        <div className="employee-sales-employee-field"><label htmlFor="emp-name">Employee</label>
          <select id="emp-name" className="form-select form-select-sm" value={employeeName} disabled={loading || loadingEmployees} onChange={e => setEmployeeName(e.target.value)}>
            {employees.length === 0 && <option value="">No employees available</option>}
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

    {report?.hasSales && m && <>
      <section className="system-sales-section">
        <div className="system-sales-section-heading"><div><h6>Sales Overview</h6><span>Key figures for {report.employeeName}</span></div></div>
        <div className="system-sales-kpi-strip">
          <Kpi label="Net Sales" value={money(m.netSales)} caption="Total net sales" primary />
          <Kpi label="Tax Collected" value={money(m.taxCollected)} caption="Collected VAT" />
          <Kpi label="Gross Sales" value={money(report.grossSales)} caption="After report adjustments" />
          <Kpi label="Tender Total" value={money(report.tenderTotal.amount)} caption="Recorded payments" warning={report.variance !== 0} />
        </div>
      </section>
      <section className="system-sales-section">
        <div className="system-sales-section-heading"><div><h6>Report Breakdown</h6><span>Discounts and adjustments for the selected employee</span></div></div>
        <div className="employee-sales-breakdown">
          <div className="system-sales-breakdown-column"><div className="system-sales-breakdown-title system-sales-accent-info">Sales &amp; Tax</div>
            <BreakdownRow label="Net Sales" value={m.netSales} /><BreakdownRow label="Tax Collected" value={m.taxCollected} /><BreakdownRow label="Gross Sales" value={report.grossSales} /></div>
          <div className="system-sales-breakdown-column"><div className="system-sales-breakdown-title system-sales-accent-danger">Discounts</div>
            {rows.slice(1, 10).map(([label, value, tone]) => <BreakdownRow key={label} label={label} value={value} tone={tone} />)}</div>
          <div className="system-sales-breakdown-column"><div className="system-sales-breakdown-title system-sales-accent-warning">Other Sales &amp; Adjustments</div>
            <BreakdownRow label="Service Charge" value={m.serviceAmount} /><BreakdownRow label="Void Amount" value={m.voidAmount} tone="negative" />
            <BreakdownRow label="Tender Total" value={report.tenderTotal.amount} /><BreakdownRow label="Variance Amount" value={report.variance} tone={report.variance === 0 ? 'default' : 'warning'} /></div>
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
  </div>
}

function Kpi({ label, value, caption, primary = false, warning = false }: { label: string; value: string; caption: string; primary?: boolean; warning?: boolean }) {
  return <div className={`system-sales-kpi-item${primary ? ' system-sales-kpi-primary' : ''}${warning ? ' system-sales-kpi-warning' : ''}`}>
    <div className="system-sales-kpi-label">{label}</div><div className="system-sales-kpi-value" title={value}>{value}</div><div className="system-sales-kpi-caption">{caption}</div>
  </div>
}
function BreakdownRow({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'negative' | 'warning' }) {
  return <div className="system-sales-breakdown-row"><span className="system-sales-breakdown-label">{label}</span><span className={`system-sales-breakdown-value system-sales-value-${tone}`}>{money(value)}</span></div>
}
