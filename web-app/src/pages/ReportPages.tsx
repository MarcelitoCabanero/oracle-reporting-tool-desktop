import { useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  FileBarChart,
  Filter,
  HeartHandshake,
  Monitor,
  NotebookText,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  UsersRound,
} from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import jcoLogo from '../../assets/jco-logo.png'
import {
  Button,
  DataTable,
  Field,
  PageHeading,
  Panel,
  SectionTabs,
  StatCard,
  StatusBadge,
  formatMoney,
  useToast,
} from '../components'
import {
  employeeRows,
  hourlyRows,
  journalReceipt,
  menuItems,
  sampleSales,
  scPwdRows,
  tenderRows,
  varianceRows,
} from '../data'
import type { SalesRow } from '../types'

const today = '2026-11-04'
const money = (value: number) => <span className="number-cell">{formatMoney(value)}</span>
const commonDateField = <Field label="Business date"><input type="date" defaultValue={today} /></Field>

interface MonthlySummaryRow {
  date: string
  quantity: number
  ring: number
  shell: number
  jpops: number
  allocation: number
}

interface ReportPreviewRow {
  date: string
  checks: number
  gross: number
  discount: number
  net: number
}

function HourlySalesPage() {
  const { section = 'overview' } = useParams()
  const [recordType, setRecordType] = useState('Produce')
  const [reportType, setReportType] = useState('MSSD')
  const { notify } = useToast()
  const currentSection = ['records', 'daily-report', 'summary-reports'].includes(section) ? section : 'overview'
  const hourlyTabs = [
    { label: 'Hourly overview', path: '/hourly-sales' },
    { label: 'Produce / waste records', path: '/hourly-sales/records' },
    { label: 'Daily report', path: '/hourly-sales/daily-report' },
    { label: 'Summary reports', path: '/hourly-sales/summary-reports' },
  ]
  const recordRows = recordType === 'Produce'
    ? [
      { time: '10:00 AM', entryDate: 'Nov 04, 2026', shell: 28, ring: 42, jpops: 19, remarks: 'Fresh batch' },
      { time: '09:00 AM', entryDate: 'Nov 04, 2026', shell: 34, ring: 48, jpops: 22, remarks: 'Regular production' },
      { time: '08:00 AM', entryDate: 'Nov 04, 2026', shell: 42, ring: 64, jpops: 30, remarks: 'Opening batch' },
      { time: '07:00 AM', entryDate: 'Nov 04, 2026', shell: 38, ring: 56, jpops: 24, remarks: 'Opening batch' },
    ]
    : [
      { time: '10:00 AM', entryDate: 'Nov 04, 2026', shell: 1, ring: 2, jpops: 0, remarks: 'Frying waste' },
      { time: '09:00 AM', entryDate: 'Nov 04, 2026', shell: 1, ring: 1, jpops: 0, remarks: 'Proofing waste' },
      { time: '08:00 AM', entryDate: 'Nov 04, 2026', shell: 2, ring: 2, jpops: 1, remarks: 'Quality check' },
    ]
  return (
    <>
      <PageHeading eyebrow="STORE OPERATIONS · PRODUCTION" title="Hourly sales" description="Monitor production, waste, and POS sell-through by business hour." actions={<>{commonDateField}<Button variant="secondary" onClick={() => notify('Hourly report refreshed from sample data.')}><RefreshCw size={15} /> Refresh</Button></>} />
      <div className="module-tabs">{hourlyTabs.map((tab) => <Link key={tab.path} to={tab.path} className={(currentSection === 'overview' ? tab.path.endsWith('hourly-sales') : tab.path.endsWith(currentSection)) ? 'module-tab-active' : ''}>{tab.label}</Link>)}</div>
      {currentSection === 'overview' && <>
        <div className="stat-grid">
          <StatCard label="Total produced" value="613 pcs" note="Ring 277 · Shell 191 · J-Pops 145" icon={ShoppingBag} />
          <StatCard label="POS units sold" value="372 pcs" note="61% of produced quantity" trend="up" icon={ArrowUpRight} tone="green" />
          <StatCard label="Recorded waste" value="17 pcs" note="2.8% of production" icon={BarChart3} tone="amber" />
          <StatCard label="Ending inventory" value="224 pcs" note="After recorded sales and waste" icon={Clock3} tone="violet" />
        </div>
        <Panel title="Hourly production vs. sales" subtitle="Units by hour · November 4, 2026" action={<span className="preview-chip">SAMPLE REPORT</span>}>
          <div className="hourly-chart">
            {hourlyRows.map((row) => <div className="hourly-chart-group" key={row.time}><div className="hourly-bar-pair"><i style={{ height: `${Math.min(100, row.ring + row.shell + row.jpops)}%` }} title={`${row.ring + row.shell + row.jpops} produced`} /><i className="sold-bar" style={{ height: `${row.sold}%` }} title={`${row.sold} sold`} /></div><small>{row.time.slice(0, 5)}</small></div>)}
          </div>
          <div className="chart-legend"><span><i className="legend-dot blue" /> Produced</span><span><i className="legend-dot green" /> POS sold</span></div>
        </Panel>
        <Panel title="Hourly breakdown" subtitle="Production, waste, and sales by time interval">
          <DataTable columns={[
            { label: 'Time', render: (row: typeof hourlyRows[number]) => <strong className="table-primary">{row.time}</strong> },
            { label: 'Ring', align: 'right', render: (row) => row.ring },
            { label: 'Shell', align: 'right', render: (row) => row.shell },
            { label: 'J-Pops', align: 'right', render: (row) => row.jpops },
            { label: 'Produced', align: 'right', render: (row) => <strong>{row.ring + row.shell + row.jpops}</strong> },
            { label: 'Waste', align: 'right', render: (row) => <span className="negative-value">{row.waste}</span> },
            { label: 'POS sold', align: 'right', render: (row) => <strong>{row.sold}</strong> },
          ]} rows={hourlyRows} rowKey={(row) => row.time} />
        </Panel>
      </>}
      {currentSection === 'records' && <>
        <SectionTabs tabs={[{ label: 'Produce', value: 'Produce' }, { label: 'Waste', value: 'Waste' }]} active={recordType} onSelect={setRecordType} />
        <Panel title={`${recordType} records`} subtitle="Hourly entry log · UI preview only" action={<Button onClick={() => notify('New records cannot be saved in the UI preview.')}><span>＋</span> Add {recordType.toLowerCase()} entry</Button>}>
          <div className="table-filters"><Field label="Date from"><input type="date" defaultValue={today} /></Field><Field label="Date to"><input type="date" defaultValue={today} /></Field><Field label="Record type"><select value={recordType} onChange={(event) => setRecordType(event.target.value)}><option>Produce</option><option>Waste</option></select></Field><Button variant="secondary" onClick={() => notify('Records filtered using sample data.')}><Filter size={15} /> Apply filters</Button></div>
          <DataTable columns={[
            { label: 'Entry date', render: (row: typeof recordRows[number]) => row.entryDate },
            { label: 'Time', render: (row) => <strong>{row.time}</strong> },
            { label: 'Shell', align: 'right', render: (row) => row.shell },
            { label: 'Ring', align: 'right', render: (row) => row.ring },
            { label: 'J-Pops', align: 'right', render: (row) => row.jpops },
            { label: 'Remarks', render: (row) => row.remarks },
            { label: 'Action', render: () => <button className="text-link" onClick={() => notify('Record editing is not enabled in the UI preview.')}>Edit</button> },
          ]} rows={recordRows} rowKey={(row) => `${row.time}-${row.entryDate}`} />
        </Panel>
        <div className="info-banner"><i>i</i><span>Hourly production and waste values are sample data. Saving, editing, and synchronization are not connected in this preview.</span></div>
      </>}
      {currentSection === 'daily-report' && <>
        <div className="report-meta-bar"><span><CalendarDays size={16} /> Business date: <strong>November 4, 2026</strong></span><span>Store: <strong>Oracle Mall · 0042</strong></span><Button variant="secondary" onClick={() => notify('Print is not available in the UI preview.')}><Download size={15} /> Export</Button></div>
        <div className="stat-grid">
          <StatCard label="Produced" value="613 pcs" note="Ring 277 · Shell 191 · J-Pops 145" icon={ShoppingBag} />
          <StatCard label="Waste" value="17 pcs" note="2.8% waste allocation" icon={BarChart3} tone="amber" />
          <StatCard label="POS sold" value="372 pcs" note="Including promotional units" icon={ArrowUpRight} tone="green" />
          <StatCard label="Variance" value="+224 pcs" note="Ending stock estimate" icon={Clock3} tone="violet" />
        </div>
        <Panel title="Production monitoring report" subtitle="Opening + production − waste − POS sold = estimated ending inventory">
          <DataTable columns={[
            { label: 'Hour', render: (row: typeof hourlyRows[number]) => <strong>{row.time}</strong> },
            { label: 'Opening', align: 'right', render: (_row, index) => hourlyRows.slice(0, index).reduce((total, prior) => total + prior.ring + prior.shell + prior.jpops - prior.waste - prior.sold, 0) },
            { label: 'Produced', align: 'right', render: (row) => row.ring + row.shell + row.jpops },
            { label: 'Waste', align: 'right', render: (row) => row.waste },
            { label: 'POS sold', align: 'right', render: (row) => row.sold },
            { label: 'Ending', align: 'right', render: (_row, index) => <strong>{hourlyRows.slice(0, index + 1).reduce((total, prior) => total + prior.ring + prior.shell + prior.jpops - prior.waste - prior.sold, 0)}</strong> },
          ]} rows={hourlyRows} rowKey={(row) => row.time} />
        </Panel>
        <div className="info-banner"><i>i</i><span>Inventory balances and waste allocations are representative preview values, not live POS data.</span></div>
      </>}
      {currentSection === 'summary-reports' && <>
        <div className="summary-report-head"><div><span className="eyebrow">MONTHLY HOURLY SUMMARIES</span><h2>Oracle Mall · November 2026</h2><p>Choose a report to review daily production and waste allocations.</p></div><div className="table-filters"><Field label="Month"><select defaultValue="November"><option>November</option><option>October</option><option>September</option></select></Field><Field label="Year"><select defaultValue="2026"><option>2026</option><option>2025</option></select></Field></div></div>
        <SectionTabs tabs={[{ label: 'MSSD · Daily sales', value: 'MSSD' }, { label: 'MSWD · Daily waste', value: 'MSWD' }, { label: 'MPPAR · Production', value: 'MPPAR' }]} active={reportType} onSelect={setReportType} />
        <Panel title={`${reportType} · ${reportType === 'MSSD' ? 'Monthly Sales Summary Daily' : reportType === 'MSWD' ? 'Monthly Summary Waste Daily' : 'Monthly Production Planning & Allocation'}`} subtitle="Daily totals · November 1–4, 2026" action={<Button variant="secondary" onClick={() => notify('Summary export is not enabled in the UI preview.')}><Download size={15} /> Export</Button>}>
          <DataTable<MonthlySummaryRow> columns={[
            { label: 'Business date', render: (row: { date: string }) => <strong>{row.date}</strong> },
            { label: 'Location', render: () => 'Oracle Mall' },
            { label: reportType === 'MSWD' ? 'Waste quantity' : 'Produced quantity', align: 'right', render: (row) => `${row.quantity} pcs` },
            { label: 'Ring', align: 'right', render: (row) => row.ring },
            { label: 'Shell', align: 'right', render: (row) => row.shell },
            { label: 'J-Pops', align: 'right', render: (row) => row.jpops },
            { label: 'Allocation', align: 'right', render: (row) => `${row.allocation}%` },
          ]} rows={[
            { date: 'Nov 04, 2026', quantity: reportType === 'MSWD' ? 17 : 613, ring: 277, shell: 191, jpops: 145, allocation: 2.8 },
            { date: 'Nov 03, 2026', quantity: reportType === 'MSWD' ? 21 : 678, ring: 288, shell: 190, jpops: 200, allocation: 3.1 },
            { date: 'Nov 02, 2026', quantity: reportType === 'MSWD' ? 19 : 642, ring: 260, shell: 174, jpops: 208, allocation: 2.9 },
            { date: 'Nov 01, 2026', quantity: reportType === 'MSWD' ? 24 : 701, ring: 288, shell: 190, jpops: 223, allocation: 3.4 },
          ]} rowKey={(row) => row.date} />
        </Panel>
      </>}
    </>
  )
}

const systemTabs = [
  { label: 'Sales summary', value: 'summary', icon: BarChart3 },
  { label: 'Employee sales', value: 'employee-sales', icon: UsersRound },
  { label: 'POS sales', value: 'pos-sales', icon: Monitor },
  { label: 'SC / PWD listing', value: 'sc-pwd', icon: HeartHandshake },
  { label: 'Tender listing', value: 'tender-listing', icon: ShoppingBag },
  { label: 'Variance checking', value: 'variance-checking', icon: ArrowDownRight },
]

function SystemSalesPage() {
  const { view = 'summary' } = useParams()
  const navigate = useNavigate()
  const currentView = systemTabs.some((tab) => tab.value === view) ? view : 'summary'
  const [query, setQuery] = useState('')
  const [workstation, setWorkstation] = useState('All workstations')
  const { notify } = useToast()

  function reportAction() {
    notify('Report generated from sample data. No database was queried.')
  }

  return (
    <>
      <PageHeading eyebrow="REPORTS · SALES OPERATIONS" title={systemTabs.find((tab) => tab.value === currentView)?.label ?? 'System sales'} description="Review sales, tender activity, discounts, and cashier variances." actions={<><Field label="Date from"><input type="date" defaultValue={today} /></Field><Field label="Date to"><input type="date" defaultValue={today} /></Field><Button onClick={reportAction}><RefreshCw size={15} /> Generate</Button></>} />
      <div className="system-sales-tabs">{systemTabs.map(({ label, value, icon: Icon }) => <button key={value} className={currentView === value ? 'system-tab-active' : ''} onClick={() => navigate(`/system-sales/${value}`)}><Icon size={16} />{label}</button>)}</div>
      {currentView === 'summary' && <>
        <div className="stat-grid">
          <StatCard label="Gross sales" value="₱208,460" note="+8.4% vs. prior day" trend="up" icon={CircleDollarSign} />
          <StatCard label="Net sales" value="₱184,620" note="After discounts & VAT" icon={BarChart3} tone="green" />
          <StatCard label="Transactions" value="486" note="₱379.88 average check" trend="up" icon={ShoppingBag} tone="violet" />
          <StatCard label="Tender variance" value="₱50.00" note="1 check requires review" icon={ArrowDownRight} tone="amber" />
        </div>
        <div className="dashboard-grid">
          <Panel title="Sales by hour" subtitle="Net sales · November 4, 2026"><div className="chart-summary"><div><strong>₱184,620.50</strong><span>486 checks for this business date</span></div></div><div className="mini-bar-chart">{[34, 52, 45, 70, 64, 82, 71, 94, 68, 87, 73, 100].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><div className="chart-axis"><span>6 AM</span><span>9 AM</span><span>12 PM</span><span>3 PM</span><span>6 PM</span><span>9 PM</span></div></Panel>
          <Panel title="Tender breakdown" subtitle="Tender totals from POS transactions"><div className="breakdown-list">{[['Cash', 74640, 40], ['Credit card', 56640, 31], ['GCash', 38420, 21], ['Debit card', 14920, 8]].map(([label, amount, share]) => <div className="breakdown-item" key={String(label)}><div><span>{label}</span><strong>{formatMoney(Number(amount))}</strong></div><div className="progress-track"><i style={{ width: `${share}%` }} /></div><small>{share}%</small></div>)}</div></Panel>
        </div>
        <Panel title="Sales by major group" subtitle="Product category contribution"><div className="category-list">{[['Donuts', 92480, 50], ['Beverages', 53400, 29], ['Bakery', 23980, 13], ['Other', 14760, 8]].map(([label, amount, share]) => <div className="category-row" key={String(label)}><span>{label}</span><div className="progress-track"><i style={{ width: `${share}%` }} /></div><strong>{formatMoney(Number(amount))}</strong><small>{share}%</small></div>)}</div></Panel>
      </>}
      {currentView === 'employee-sales' && <>
        <div className="stat-grid compact-stats"><StatCard label="Employees" value="14" note="Active for selected period" icon={UsersRound} /><StatCard label="Total checks" value="163" note="Across 4 employees shown" icon={ShoppingBag} tone="green" /><StatCard label="Net sales" value="₱106,800" note="₱655 average per check" icon={BarChart3} tone="violet" /><StatCard label="Variances" value="2" note="₱75.00 total variance" icon={ArrowDownRight} tone="amber" /></div>
        <Panel title="Employee sales" subtitle="Sales & adjustment totals by cashier" action={<Button variant="secondary" onClick={() => notify('Employee report export is not enabled in this preview.')}><Download size={15} /> Export</Button>}>
          <div className="table-filters"><Field label="Employee"><select><option>All employees</option>{employeeRows.map((row) => <option key={row.employee}>{row.employee}</option>)}</select></Field><Field label="Search"><div className="input-with-icon"><Search size={15} /><input placeholder="Employee name..." value={query} onChange={(event) => setQuery(event.target.value)} /></div></Field><Button variant="secondary" onClick={reportAction}><Filter size={15} /> Apply</Button></div>
          <DataTable columns={[
            { label: 'Employee', render: (row: typeof employeeRows[number]) => <span className="employee-cell"><i>{row.employee[0]}</i><strong>{row.employee}</strong></span> },
            { label: 'Checks', align: 'right', render: (row) => row.checks },
            { label: 'Gross sales', align: 'right', render: (row) => money(row.gross) },
            { label: 'Discounts', align: 'right', render: (row) => money(row.discounts) },
            { label: 'Net sales', align: 'right', render: (row) => <strong>{formatMoney(row.net)}</strong> },
            { label: 'Variance', align: 'right', render: (row) => <span className={row.variance ? 'negative-value' : ''}>{formatMoney(row.variance)}</span> },
            { label: 'Status', render: (row) => <StatusBadge>{row.variance ? 'Review' : 'Balanced'}</StatusBadge> },
          ]} rows={employeeRows.filter((row) => row.employee.toLowerCase().includes(query.toLowerCase()))} rowKey={(row) => row.employee} />
        </Panel>
      </>}
      {currentView === 'pos-sales' && <>
        <Panel title="Workstation transaction report" subtitle="Transaction totals by POS terminal" action={<Field label="Workstation"><select value={workstation} onChange={(event) => setWorkstation(event.target.value)}><option>All workstations</option><option>POS-01</option><option>POS-02</option><option>POS-03</option><option>POS-04</option></select></Field>}>
          <div className="workstation-grid">{['POS-01', 'POS-02', 'POS-03', 'POS-04'].filter((item) => workstation === 'All workstations' || workstation === item).map((name, index) => <article className="workstation-card" key={name}><span className="workstation-icon"><Monitor size={18} /></span><span>{name}<small>{12 + index * 3} checks · Active</small></span><strong>{formatMoney([48240, 56480, 41320, 38580][index])}</strong><small className="positive-value"><ArrowUpRight size={13} /> {8 + index * 2}.4%</small></article>)}</div>
          <DataTable columns={[
            { label: 'Check number', render: (row: SalesRow) => <strong>{row.check}</strong> },
            { label: 'Time', render: (row) => row.date.split('·')[1]?.trim() },
            { label: 'Workstation', render: (row) => <StatusBadge>{row.workstation}</StatusBadge> },
            { label: 'Employee', render: (row) => row.employee },
            { label: 'Tender', render: (row) => row.tender },
            { label: 'Amount', align: 'right', render: (row) => money(row.amount) },
          ]} rows={sampleSales.filter((row) => workstation === 'All workstations' || row.workstation === workstation)} rowKey={(row) => row.check} />
        </Panel>
      </>}
      {currentView === 'sc-pwd' && <>
        <div className="stat-grid compact-stats"><StatCard label="Discount transactions" value="128" note="OSCA and PWD" icon={HeartHandshake} /><StatCard label="Gross amount" value="₱78,240" note="Before discounts" icon={BarChart3} tone="green" /><StatCard label="Discount granted" value="₱9,388.80" note="Senior citizen & PWD" icon={ArrowDownRight} tone="amber" /><StatCard label="Net sales" value="₱68,851.20" note="After applicable discounts" icon={ShoppingBag} tone="violet" /></div>
        <Panel title="SC / PWD transactions" subtitle="Discount details by receipt and identification" action={<Button variant="secondary" onClick={() => notify('SC / PWD report export is not enabled in this preview.')}><Download size={15} /> Export</Button>}>
          <div className="table-filters"><Field label="Discount type"><select><option>All types</option><option>OSCA</option><option>PWD</option></select></Field><Field label="Search"><div className="input-with-icon"><Search size={15} /><input placeholder="Check, ID, customer..." value={query} onChange={(event) => setQuery(event.target.value)} /></div></Field></div>
          <DataTable columns={[
            { label: 'Check', render: (row: typeof scPwdRows[number]) => <strong>{row.check}</strong> },
            { label: 'Business date', render: (row) => row.date },
            { label: 'Type', render: (row) => <StatusBadge>{row.type}</StatusBadge> },
            { label: 'Customer', render: (row) => row.name },
            { label: 'ID number', render: (row) => <span className="muted-cell">{row.id}</span> },
            { label: 'Workstation', render: (row) => row.workstation },
            { label: 'Gross', align: 'right', render: (row) => money(row.gross) },
            { label: 'Discount', align: 'right', render: (row) => <span className="negative-value">{money(row.discount)}</span> },
            { label: 'Net sales', align: 'right', render: (row) => <strong>{formatMoney(row.net)}</strong> },
          ]} rows={scPwdRows.filter((row) => `${row.name} ${row.id} ${row.check}`.toLowerCase().includes(query.toLowerCase()))} rowKey={(row) => row.check} />
        </Panel>
      </>}
      {currentView === 'tender-listing' && <>
        <div className="stat-grid compact-stats"><StatCard label="Tendered amount" value="₱184,620" note="486 transactions" icon={CircleDollarSign} /><StatCard label="Cash" value="₱74,640" note="40.4% of net sales" icon={ShoppingBag} tone="green" /><StatCard label="Card & wallet" value="₱109,980" note="59.6% of net sales" icon={BarChart3} tone="violet" /><StatCard label="References" value="315" note="Card and wallet payments" icon={CheckCircle2} tone="amber" /></div>
        <Panel title="Tender details" subtitle="Payment references for the selected business dates" action={<Button variant="secondary" onClick={() => notify('Tender export is not enabled in this preview.')}><Download size={15} /> Export</Button>}>
          <div className="table-filters"><Field label="Search tenders"><div className="input-with-icon"><Search size={15} /><input placeholder="Check, tender, reference..." value={query} onChange={(event) => setQuery(event.target.value)} /></div></Field><Field label="Tender type"><select><option>All tender types</option><option>Cash</option><option>Credit card</option><option>GCash</option><option>Debit card</option></select></Field></div>
          <DataTable columns={[
            { label: 'Check number', render: (row: typeof tenderRows[number]) => <strong>{row.check}</strong> },
            { label: 'Business date', render: (row) => row.date },
            { label: 'Tender type', render: (row) => row.type },
            { label: 'Amount', align: 'right', render: (row) => money(row.amount) },
            { label: 'Reference', render: (row) => <span className="muted-cell">{row.reference}</span> },
          ]} rows={tenderRows.filter((row) => `${row.check} ${row.type} ${row.reference}`.toLowerCase().includes(query.toLowerCase()))} rowKey={(row) => row.check} />
        </Panel>
      </>}
      {currentView === 'variance-checking' && <>
        <div className="info-banner"><i>i</i><span>Review POS sales against tender totals. Variance records shown below are sample transactions only.</span></div>
        <div className="stat-grid compact-stats"><StatCard label="Checks reviewed" value="132" note="For selected business date" icon={CheckCircle2} /><StatCard label="Balanced" value="129" note="97.7% of checks" icon={ArrowUpRight} tone="green" /><StatCard label="Variance checks" value="3" note="Total variance ₱75.00" icon={ArrowDownRight} tone="amber" /><StatCard label="Employees" value="4" note="Cashiers on the shift" icon={UsersRound} tone="violet" /></div>
        <Panel title="Tender variance details" subtitle="Check-level review · November 4, 2026" action={<Button variant="secondary" onClick={() => notify('Variance report export is not enabled in this preview.')}><Download size={15} /> Export</Button>}>
          <DataTable columns={[
            { label: 'Check', render: (row: typeof varianceRows[number]) => <strong>{row.check}</strong> },
            { label: 'Time', render: (row) => row.time },
            { label: 'Employee', render: (row) => row.employee },
            { label: 'Workstation', render: (row) => row.workstation },
            { label: 'POS sales', align: 'right', render: (row) => money(row.sales) },
            { label: 'Tender total', align: 'right', render: (row) => money(row.tender) },
            { label: 'Variance', align: 'right', render: (row) => <strong className={row.variance ? 'negative-value' : 'positive-value'}>{formatMoney(row.variance)}</strong> },
            { label: 'Status', render: (row) => <StatusBadge>{row.reason}</StatusBadge> },
          ]} rows={varianceRows.filter((row) => `${row.employee} ${row.check}`.toLowerCase().includes(query.toLowerCase()))} rowKey={(row) => row.check} />
        </Panel>
      </>}
    </>
  )
}

function MenuItemPage() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('All major groups')
  const [status, setStatus] = useState('All items')
  const { notify } = useToast()
  const groups = [...new Set(menuItems.map((item) => item.major))]
  const filtered = menuItems.filter((item) =>
    `${item.number} ${item.name} ${item.major} ${item.family}`.toLowerCase().includes(query.toLowerCase())
    && (group === 'All major groups' || item.major === group)
    && (status === 'All items' || item.status === status),
  )
  return (
    <>
      <PageHeading eyebrow="CATALOG · POS REFERENCE" title="Menu items" description="Browse item numbers, product groups, and POS selling prices." actions={<><Button variant="secondary" onClick={() => notify('Menu item synchronization is not enabled in the UI preview.')}><RefreshCw size={15} /> Sync status</Button><Button onClick={() => notify('Menu items are read-only in this UI preview.')}><Download size={15} /> Export list</Button></>} />
      <div className="stat-grid">
        <StatCard label="Total items" value="428" note="Across 8 major groups" icon={ShoppingBag} />
        <StatCard label="Active items" value="412" note="Available in POS" icon={CheckCircle2} tone="green" />
        <StatCard label="Major groups" value="8" note="Donuts, beverages & more" icon={BarChart3} tone="violet" />
        <StatCard label="Needs review" value="6" note="Inactive or missing mapping" icon={ArrowDownRight} tone="amber" />
      </div>
      <Panel title="POS menu catalog" subtitle={`${filtered.length} sample items shown`} action={<Button variant="quiet" onClick={() => notify('Menu item changes cannot be saved in the UI preview.')}>+ Add item</Button>}>
        <div className="table-filters"><Field label="Search items"><div className="input-with-icon"><Search size={15} /><input placeholder="Item number or name..." value={query} onChange={(event) => setQuery(event.target.value)} /></div></Field><Field label="Major group"><select value={group} onChange={(event) => setGroup(event.target.value)}><option>All major groups</option>{groups.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Status"><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All items</option><option>Active</option><option>Inactive</option></select></Field><Button variant="secondary" onClick={() => notify('Showing filtered sample menu items.')}><Filter size={15} /> Filter</Button></div>
        <DataTable columns={[
          { label: 'Item number', render: (row: typeof menuItems[number]) => <strong className="table-primary">{row.number}</strong> },
          { label: 'Item name', render: (row) => <span className="item-name"><i className="product-dot">{row.name[0]}</i><strong>{row.name}</strong></span> },
          { label: 'Major group', render: (row) => <span className="category-tag">{row.major}</span> },
          { label: 'Family group', render: (row) => row.family },
          { label: 'Selling price', align: 'right', render: (row) => <strong>{formatMoney(row.price)}</strong> },
          { label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { label: 'Action', render: (row) => <button className="text-link" onClick={() => notify(`${row.name} is read-only in this UI preview.`)}>View</button> },
        ]} rows={filtered} rowKey={(row) => row.number} />
      </Panel>
    </>
  )
}

function PosJournalPage() {
  const [check, setCheck] = useState('208451')
  const [date, setDate] = useState(today)
  const [searchText, setSearchText] = useState('')
  const [selectedCheck, setSelectedCheck] = useState('208451')
  const [loading, setLoading] = useState(false)
  const { notify } = useToast()
  const matching = sampleSales.filter((row) => row.check.includes(check) || row.date.includes(date))
  const receipt = selectedCheck === '208451' ? journalReceipt : [
    'J.CO DONUTS PHILIPPINES',
    'STORE 0042  |  ORACLE MALL',
    '--------------------------------',
    `Check No: ${selectedCheck}      POS-01`,
    'Nov 04, 2026          10:36 AM',
    '--------------------------------',
    'Original Glazed Dozen       520.00',
    'Iced Latte Large            185.00',
    '--------------------------------',
    'TOTAL                       705.00',
    'Credit card                 705.00',
    '--------------------------------',
    'Thank you. See you again!',
  ]
  async function loadReceipt() {
    setLoading(true)
    await new Promise((resolve) => window.setTimeout(resolve, 350))
    setSelectedCheck(check || sampleSales[0].check)
    setLoading(false)
  }
  const visibleReceipt = receipt.filter((line) => line.toLowerCase().includes(searchText.toLowerCase()))
  return (
    <>
      <PageHeading eyebrow="POS TOOLS · RECEIPT LOOKUP" title="POS journal" description="Look up receipt reprints and review transaction details." actions={<Button variant="secondary" onClick={() => notify('Printing is not available in this UI preview.')}><Printer size={15} /> Print receipt</Button>} />
      <div className="journal-layout">
        <div className="journal-left">
          <Panel title="Find a transaction" subtitle="Search by check number or business date">
            <div className="journal-search-form">
              <Field label="Check number"><div className="input-with-icon"><Search size={15} /><input value={check} onChange={(event) => setCheck(event.target.value)} placeholder="e.g. 208451" /></div></Field>
              <Button onClick={() => void loadReceipt()} disabled={loading}>{loading ? <span className="button-spinner" /> : <Search size={15} />}{loading ? 'Searching' : 'Find check'}</Button>
              <div className="field-separator"><span>OR</span></div>
              <Field label="Business date"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
              <Button variant="secondary" onClick={() => void loadReceipt()}><CalendarDays size={15} /> View date</Button>
            </div>
            <div className="journal-result-heading"><span>Recent receipts</span><small>{matching.length} transactions</small></div>
            <div className="receipt-list">{matching.slice(0, 6).map((row) => <button key={row.check} className={`receipt-list-item ${selectedCheck === row.check ? 'receipt-selected' : ''}`} onClick={() => { setSelectedCheck(row.check); setCheck(row.check) }}><span className="receipt-list-icon"><NotebookText size={17} /></span><span><strong>Check #{row.check}</strong><small>{row.date.split('·')[1]?.trim()} · {row.workstation} · {row.employee}</small></span><span className="receipt-list-total">{formatMoney(row.amount)}</span></button>)}</div>
          </Panel>
          <div className="info-banner"><i>i</i><span>Receipt data is sample content. Search and print are not connected to a POS system.</span></div>
        </div>
        <Panel title="Receipt preview" subtitle={`Check #${selectedCheck} · sample receipt`} action={<span className="status-badge status-green"><span />Ready to view</span>} className="receipt-preview-panel">
          <div className="receipt-controls"><div className="table-search"><Search size={15} /><input placeholder="Find text on receipt..." value={searchText} onChange={(event) => setSearchText(event.target.value)} /></div><Button variant="quiet" onClick={() => setSearchText('')}>Clear</Button></div>
          <div className="receipt-paper"><img className="receipt-logo" src={jcoLogo} alt="J.CO" />{visibleReceipt.map((line, index) => <div key={`${line}-${index}`} className={line.includes('---') ? 'receipt-dash' : line.includes('TOTAL') ? 'receipt-total' : ''}>{line}</div>)}{visibleReceipt.length === 0 && <div className="receipt-no-match">No matching text on this receipt.</div>}</div>
        </Panel>
      </div>
    </>
  )
}

function TransactionsPage() {
  const [queryParams, setQueryParams] = useSearchParams()
  const [query, setQuery] = useState(queryParams.get('search') ?? '')
  const [tender, setTender] = useState('All tenders')
  const filtered = sampleSales.filter((row) => `${row.check} ${row.employee} ${row.workstation}`.toLowerCase().includes(query.toLowerCase()) && (tender === 'All tenders' || row.tender === tender))
  const { notify } = useToast()
  return (
    <>
      <PageHeading eyebrow="POS ACTIVITY · TRANSACTION LOG" title="Transactions" description="Search and review receipt-level activity for the selected business date." actions={<>{commonDateField}<Button variant="secondary" onClick={() => notify('Transaction export is not enabled in this preview.')}><Download size={15} /> Export</Button></>} />
      <div className="stat-grid">
        <StatCard label="Transactions" value="486" note="For November 4, 2026" icon={ShoppingBag} />
        <StatCard label="Net sales" value="₱184,620.50" note="All tender types" icon={BarChart3} tone="green" />
        <StatCard label="Voids" value="4" note="₱4,260.00 voided" icon={ArrowDownRight} tone="amber" />
        <StatCard label="Refunds" value="2" note="₱840.00 refunded" icon={RefreshCw} tone="violet" />
      </div>
      <Panel title="Transaction activity" subtitle={`${filtered.length} preview records match your filters`} action={<span className="preview-chip">SAMPLE DATA</span>}>
        <div className="table-filters"><Field label="Search"><div className="input-with-icon"><Search size={15} /><input placeholder="Check number, employee or terminal..." value={query} onChange={(event) => { setQuery(event.target.value); setQueryParams(event.target.value ? { search: event.target.value } : {}) }} /></div></Field><Field label="Tender type"><select value={tender} onChange={(event) => setTender(event.target.value)}><option>All tenders</option>{[...new Set(sampleSales.map((row) => row.tender))].map((item) => <option key={item}>{item}</option>)}</select></Field><Button variant="secondary" onClick={() => setQuery('')}><Filter size={15} /> Clear filters</Button></div>
        <DataTable columns={[
          { label: 'Check number', render: (row: SalesRow) => <strong className="table-primary">{row.check}</strong> },
          { label: 'Business date', render: (row) => row.date },
          { label: 'Employee', render: (row) => <span className="employee-cell"><i>{row.employee[0]}</i>{row.employee}</span> },
          { label: 'Workstation', render: (row) => row.workstation },
          { label: 'Tender', render: (row) => row.tender },
          { label: 'Amount', align: 'right', render: (row) => money(row.amount) },
          { label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          { label: 'Action', render: (row) => <button className="text-link" onClick={() => notify(`Receipt ${row.check} is available in POS Journal preview.`)}>View receipt</button> },
        ]} rows={filtered} rowKey={(row) => row.check} />
      </Panel>
    </>
  )
}

function ReportsPage() {
  const [selected, setSelected] = useState('daily-sales')
  const { notify } = useToast()
  const reports = [
    { value: 'daily-sales', title: 'Daily sales summary', description: 'Net sales, tender totals, discounts, and tax breakdown.', icon: BarChart3, group: 'SALES' },
    { value: 'hourly-sales', title: 'Hourly sales report', description: 'Sales and production comparison across hourly intervals.', icon: Clock3, group: 'SALES' },
    { value: 'employee-sales', title: 'Employee sales', description: 'Cashier sales totals, tender mix, and variances.', icon: UsersRound, group: 'SALES' },
    { value: 'tender-listing', title: 'Tender listing', description: 'Tender types, amounts, and payment references.', icon: ShoppingBag, group: 'FINANCE' },
    { value: 'sc-pwd', title: 'SC / PWD listing', description: 'Discount transaction details by customer ID.', icon: HeartHandshake, group: 'FINANCE' },
    { value: 'deposit-monitoring', title: 'Deposit monitoring', description: 'Deposit references and bank reconciliation status.', icon: CreditCard, group: 'FINANCE' },
  ]
  const selectedReport = reports.find((report) => report.value === selected) ?? reports[0]
  return (
    <>
      <PageHeading eyebrow="REPORT CENTER · LIBRARY" title="Reports" description="Choose a report, set a period, and review a formatted preview." actions={<Button variant="secondary" onClick={() => notify('Reports library refreshed from sample data.')}><RefreshCw size={15} /> Refresh</Button>} />
      <div className="reports-layout">
        <Panel title="Report library" subtitle="Select a report type">
          <div className="report-library">{reports.map(({ value, title, description, icon: Icon, group }, index) => <button key={value} className={`report-library-item ${selected === value ? 'report-selected' : ''}`} onClick={() => setSelected(value)}><span className={`report-library-icon report-icon-${index % 4}`}><Icon size={18} /></span><span><small>{group}</small><strong>{title}</strong><p>{description}</p></span></button>)}</div>
        </Panel>
        <div className="report-builder">
          <Panel title="Report parameters" subtitle={selectedReport.description}>
            <div className="report-parameter-grid"><Field label="Date from"><input type="date" defaultValue="2026-11-01" /></Field><Field label="Date to"><input type="date" defaultValue={today} /></Field><Field label="Store"><select><option>Oracle Mall · 0042</option><option>Greenbelt 3 · 0018</option></select></Field><Field label="Grouping"><select><option>Business date</option><option>Hourly</option><option>Workstation</option></select></Field></div>
            <Button onClick={() => notify('Report preview generated from sample data.')}><FileBarChart size={16} /> Generate preview</Button>
          </Panel>
          <Panel title={`${selectedReport.title} · Preview`} subtitle="November 1–4, 2026 · Oracle Mall · Sample data" action={<Button variant="quiet" onClick={() => notify('Report export is not enabled in the UI preview.')}><Download size={15} /> Download</Button>}>
            <div className="report-preview-summary"><div><small>NET SALES</small><strong>₱684,240.50</strong></div><div><small>TRANSACTIONS</small><strong>1,842</strong></div><div><small>AVG CHECK</small><strong>₱371.46</strong></div><div><small>DISCOUNTS</small><strong>₱24,860.00</strong></div></div>
            <DataTable<ReportPreviewRow> columns={[
              { label: 'Business date', render: (row: { date: string }) => <strong>{row.date}</strong> },
              { label: 'Transactions', align: 'right', render: (row) => row.checks.toLocaleString() },
              { label: 'Gross sales', align: 'right', render: (row) => money(row.gross) },
              { label: 'Discounts', align: 'right', render: (row) => money(row.discount) },
              { label: 'Net sales', align: 'right', render: (row) => <strong>{formatMoney(row.net)}</strong> },
            ]} rows={[
              { date: 'Nov 04, 2026', checks: 486, gross: 208460, discount: 8260, net: 184620 },
              { date: 'Nov 03, 2026', checks: 452, gross: 196830, discount: 7840, net: 172460 },
              { date: 'Nov 02, 2026', checks: 438, gross: 188940, discount: 7460, net: 165280 },
              { date: 'Nov 01, 2026', checks: 466, gross: 202140, discount: 7980, net: 178320 },
            ]} rowKey={(row) => row.date} />
            <div className="preview-disclaimer">Preview values are illustrative and are not retrieved from your POS database.</div>
          </Panel>
        </div>
      </div>
    </>
  )
}

export {
  HourlySalesPage,
  MenuItemPage,
  PosJournalPage,
  ReportsPage,
  SystemSalesPage,
  TransactionsPage,
}
