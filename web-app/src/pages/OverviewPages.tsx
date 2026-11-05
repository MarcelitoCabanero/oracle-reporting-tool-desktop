import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CalendarDays,
  ClipboardList,
  CircleDollarSign,
  Clock3,
  Download,
  FileBarChart,
  MoreHorizontal,
  RefreshCw,
  ShoppingBag,
  UsersRound,
  WalletCards,
} from 'lucide-react'
import { Link } from 'react-router-dom'
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
import { sampleSales } from '../data'
import type { SalesRow } from '../types'

const moneyColumn = (value: number) => <span className="number-cell">{formatMoney(value)}</span>

function SalesBars({ compact = false }: { compact?: boolean }) {
  const bars = compact
    ? [26, 38, 32, 54, 46, 63, 53, 78, 60, 73, 56, 88, 66, 94, 72, 81, 64, 90, 67, 77, 58, 84, 69, 100]
    : [35, 47, 42, 63, 50, 72, 60, 82, 71, 61, 86, 69, 92, 75, 58, 81, 68, 96, 73, 84, 65, 78, 57, 91]
  return <div className={`sales-bars ${compact ? 'sales-bars-compact' : ''}`} aria-label="Hourly sales chart">{bars.map((height, index) => <div key={index} className={`bar-column ${index === 17 ? 'bar-highlight' : ''}`}><i style={{ height: `${height}%` }} /></div>)}</div>
}

function DashboardPage() {
  const [period, setPeriod] = useState('Today')
  const [query, setQuery] = useState('')
  const { notify } = useToast()
  const rows = useMemo(() => sampleSales.filter((row) => `${row.check} ${row.employee} ${row.tender}`.toLowerCase().includes(query.toLowerCase())), [query])
  const columns = [
    { label: 'Check number', render: (row: SalesRow) => <strong className="table-primary">{row.check}</strong> },
    { label: 'Time', render: (row: SalesRow) => row.date.split('·')[1]?.trim() },
    { label: 'Employee', render: (row: SalesRow) => <span className="employee-cell"><i>{row.employee.slice(0, 1)}</i>{row.employee}</span> },
    { label: 'Workstation', render: (row: SalesRow) => <span className="muted-cell">{row.workstation}</span> },
    { label: 'Tender', render: (row: SalesRow) => row.tender },
    { label: 'Amount', align: 'right' as const, render: (row: SalesRow) => moneyColumn(row.amount) },
    { label: 'Status', render: (row: SalesRow) => <StatusBadge>{row.status}</StatusBadge> },
  ]

  return (
    <>
      <PageHeading eyebrow="TUESDAY, NOVEMBER 4, 2026" title="Good morning, team" description="Here’s what’s happening at Oracle Mall today." actions={<><Field label="Business date"><input type="date" defaultValue="2026-11-04" /></Field><Button variant="secondary" onClick={() => notify('Dashboard preview refreshed from sample data.')}><RefreshCw size={15} /> Refresh</Button></>} />
      <div className="stat-grid">
        <StatCard label="Net sales" value="₱184,620.50" note="+12.8% vs. yesterday" trend="up" icon={CircleDollarSign} tone="blue" />
        <StatCard label="Transactions" value="486" note="+8.2% vs. yesterday" trend="up" icon={ShoppingBag} tone="green" />
        <StatCard label="Average check" value="₱379.88" note="−2.4% vs. yesterday" trend="down" icon={BarChart3} tone="violet" />
        <StatCard label="Cash variance" value="₱50.00" note="1 item needs review" icon={Banknote} tone="amber" />
      </div>
      <div className="dashboard-grid">
        <Panel title="Sales performance" subtitle="Hourly net sales · Store 0042" action={<div className="segmented-control">{['Today', 'Yesterday', '7 days'].map((item) => <button key={item} className={period === item ? 'selected' : ''} onClick={() => setPeriod(item)}>{item}</button>)}</div>} className="sales-performance">
          <div className="chart-summary"><div><strong>₱184,620.50</strong><span><i className="trend-positive"><ArrowUpRight size={14} /> 12.8%</i> compared to yesterday</span></div><button className="icon-button" aria-label="More chart options" onClick={() => notify('Chart options are not available in this preview.')}><MoreHorizontal size={19} /></button></div>
          <SalesBars />
          <div className="chart-axis"><span>6 AM</span><span>8 AM</span><span>10 AM</span><span>12 PM</span><span>2 PM</span><span>4 PM</span><span>6 PM</span></div>
        </Panel>
        <Panel title="Store pulse" subtitle="Operational snapshot">
          <div className="pulse-list">
            <div className="pulse-row"><span className="pulse-icon pulse-indigo"><UsersRound size={17} /></span><span><strong>4 active workstations</strong><small>All POS terminals are online</small></span><i className="pulse-ok" /></div>
            <div className="pulse-row"><span className="pulse-icon pulse-green"><Clock3 size={17} /></span><span><strong>Hourly entries current</strong><small>Last entry received at 10:30 AM</small></span><i className="pulse-ok" /></div>
            <div className="pulse-row"><span className="pulse-icon pulse-amber"><Banknote size={17} /></span><span><strong>1 remittance variance</strong><small>₱50.00 · Cashier M. Reyes</small></span><span className="pulse-alert">Review</span></div>
            <div className="pulse-row"><span className="pulse-icon pulse-blue"><CalendarDays size={17} /></span><span><strong>Deposit submitted</strong><small>Business date Nov 03</small></span><i className="pulse-ok" /></div>
          </div>
          <a className="panel-link" href="/system-sales/variance-checking">Review store activity <ArrowUpRight size={14} /></a>
        </Panel>
      </div>
      <Panel title="Quick actions" subtitle="Jump into common store workflows" className="quick-actions-panel">
        <div className="quick-actions-grid">
          {[
            { label: 'Hourly production', detail: 'Review today’s entries', to: '/hourly-sales', icon: Clock3 },
            { label: 'Sales reports', detail: 'Explore sales breakdowns', to: '/system-sales', icon: FileBarChart },
            { label: 'Remittance', detail: 'Balance cashier tenders', to: '/rof', icon: WalletCards },
            { label: 'Transactions', detail: 'Search POS receipts', to: '/transactions', icon: ClipboardList },
          ].map(({ label, detail, to, icon: Icon }) => <Link className="quick-action" to={to} key={to}><span><Icon size={17} /></span><strong>{label}</strong><small>{detail}</small><ArrowUpRight size={14} className="quick-action-arrow" /></Link>)}
        </div>
      </Panel>
      <Panel title="Recent transactions" subtitle="Latest POS activity for this business date" action={<div className="panel-toolbar"><div className="table-search"><span>⌕</span><input aria-label="Search transactions" placeholder="Search checks..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><Button variant="quiet" onClick={() => notify('Transaction report download is not enabled in the UI preview.')}><Download size={15} /> Export</Button><Link className="text-link" to="/transactions">View all <ArrowUpRight size={14} /></Link></div>}>
        <DataTable columns={columns} rows={rows.slice(0, 5)} rowKey={(row) => row.check} />
      </Panel>
    </>
  )
}

function FinanceInsightPage() {
  const [range, setRange] = useState('This week')
  const { notify } = useToast()
  const stores = [
    { name: 'Oracle Mall', code: '0042', sales: 184620.5, target: 92, change: 12.8 },
    { name: 'Greenbelt 3', code: '0018', sales: 163480, target: 84, change: 8.4 },
    { name: 'SM Megamall', code: '0027', sales: 158940, target: 79, change: -1.6 },
    { name: 'Ayala Center Cebu', code: '0061', sales: 142260, target: 73, change: 5.2 },
  ]
  return (
    <>
      <PageHeading eyebrow="ANALYTICS · FINANCE" title="Finance insight" description="Track sales performance, tender mix, and store targets." actions={<><Field label="Reporting period"><select value={range} onChange={(event) => setRange(event.target.value)}><option>This week</option><option>This month</option><option>Last 30 days</option></select></Field><Button variant="secondary" onClick={() => notify('Finance insight refreshed from sample data.')}><RefreshCw size={15} /> Refresh</Button></>} />
      <div className="stat-grid">
        <StatCard label="Gross sales" value="₱1,284,360" note="+9.4% vs. last period" trend="up" icon={CircleDollarSign} />
        <StatCard label="Net sales" value="₱1,143,280" note="+7.8% vs. last period" trend="up" icon={BarChart3} tone="green" />
        <StatCard label="Tender variance" value="₱1,430" note="Across 6 business days" icon={Banknote} tone="amber" />
        <StatCard label="Target achieved" value="86.4%" note="₱180,640 remaining" icon={ArrowUpRight} tone="violet" />
      </div>
      <div className="dashboard-grid insight-grid">
        <Panel title="Sales trend" subtitle={`${range} · Net sales by hour`}>
          <div className="chart-summary"><div><strong>₱1.14M</strong><span><i className="trend-positive"><ArrowUpRight size={14} /> 7.8%</i> vs. previous period</span></div></div>
          <SalesBars />
          <div className="chart-axis"><span>6 AM</span><span>9 AM</span><span>12 PM</span><span>3 PM</span><span>6 PM</span><span>9 PM</span></div>
        </Panel>
        <Panel title="Tender mix" subtitle="Share of net sales">
          <div className="tender-donut"><div><strong>₱1.14M</strong><small>Total net sales</small></div></div>
          <div className="tender-legend">
            {[['Cash', '₱612,480', '54%', 'blue'], ['Credit / debit', '₱298,140', '26%', 'violet'], ['Digital wallet', '₱186,220', '16%', 'green'], ['Other', '₱46,440', '4%', 'amber']].map(([label, amount, share, color]) => <div key={label}><i className={`legend-dot ${color}`} /><span>{label}</span><strong>{amount}</strong><small>{share}</small></div>)}
          </div>
        </Panel>
      </div>
      <Panel title="Store performance" subtitle="Sales compared to target for the selected period" action={<Button variant="quiet" onClick={() => notify('Store report download is not enabled in the UI preview.')}><Download size={15} /> Export report</Button>}>
        <div className="store-performance-table">
          <div className="store-table-head"><span>Store</span><span>Net sales</span><span>Target achieved</span><span>vs. last period</span></div>
          {stores.map((store) => <div className="store-table-row" key={store.code}><div><span className="store-avatar">{store.code.slice(-2)}</span><span><strong>{store.name}</strong><small>Store {store.code}</small></span></div><strong>{formatMoney(store.sales)}</strong><div className="target-cell"><div className="progress-track"><i style={{ width: `${store.target}%` }} /></div><small>{store.target}%</small></div><span className={store.change < 0 ? 'negative-value' : 'positive-value'}>{store.change > 0 ? '+' : ''}{store.change}%</span></div>)}
        </div>
      </Panel>
    </>
  )
}

function InsightPage() {
  const [active, setActive] = useState('sales')
  const { notify } = useToast()
  const insightRows = [
    { insight: 'Breakfast peak is trending earlier', detail: 'Sales are up 14% between 7:00–8:00 AM over the past 7 days.', impact: 'High', date: 'Today, 9:15 AM' },
    { insight: 'Original Glazed remains the top item', detail: 'Represented 22.4% of donut unit sales this week.', impact: 'Medium', date: 'Today, 8:42 AM' },
    { insight: 'Cash variance needs attention', detail: 'Three short cash tenders recorded across the last 5 business days.', impact: 'Review', date: 'Yesterday, 6:20 PM' },
    { insight: 'Evening sales rose on Friday', detail: 'Transactions after 6:00 PM were 18% above the weekly average.', impact: 'Medium', date: 'Nov 02, 2026' },
  ]
  return (
    <>
      <PageHeading eyebrow="ANALYTICS · STORE TRENDS" title="Insights" description="Quick signals from sales, products, and store operations." actions={<Button variant="secondary" onClick={() => notify('Insights refreshed from sample data.')}><RefreshCw size={15} /> Refresh insights</Button>} />
      <SectionTabs tabs={[{ label: 'Sales', value: 'sales' }, { label: 'Products', value: 'products' }, { label: 'Operations', value: 'operations' }]} active={active} onSelect={setActive} />
      <div className="stat-grid">
        <StatCard label="Sales vs. last week" value="+9.4%" note="₱1.14M net sales" trend="up" icon={ArrowUpRight} />
        <StatCard label="Best selling hour" value="10:00 AM" note="₱142,860 across 7 days" icon={Clock3} tone="green" />
        <StatCard label="Average check" value="₱382.10" note="+₱18.40 week over week" trend="up" icon={BarChart3} tone="violet" />
        <StatCard label="Items to review" value="3 signals" note="1 variance · 2 opportunities" icon={Banknote} tone="amber" />
      </div>
      <div className="dashboard-grid">
        <Panel title="Daily sales pattern" subtitle="Average sales by hour · last 7 days">
          <div className="chart-summary"><div><strong>Strongest hour: 10 AM</strong><span>Peak demand between 9 AM and 11 AM</span></div></div>
          <SalesBars />
          <div className="chart-axis"><span>6 AM</span><span>8 AM</span><span>10 AM</span><span>12 PM</span><span>2 PM</span><span>4 PM</span><span>6 PM</span></div>
        </Panel>
        <Panel title="This week at a glance" subtitle="Selected store · Oracle Mall">
          <div className="at-glance-list">
            <div><span><ShoppingBag size={16} /> Transactions</span><strong>3,240</strong><small className="positive-value"><ArrowUpRight size={13} /> 8.2%</small></div>
            <div><span><UsersRound size={16} /> Top employee</span><strong>A. Santos</strong><small>312 checks</small></div>
            <div><span><Banknote size={16} /> Cash variance</span><strong>₱350.00</strong><small className="negative-value"><ArrowDownRight size={13} /> 2 items</small></div>
          </div>
        </Panel>
      </div>
      <Panel title={`${active[0]?.toUpperCase()}${active.slice(1)} signals`} subtitle="Automatically surfaced patterns from recent store activity">
        <div className="insight-list">
          {insightRows.map((row) => <article className="insight-row" key={row.insight}><span className={`insight-spark insight-${row.impact.toLowerCase()}`}><BarChart3 size={18} /></span><div><strong>{row.insight}</strong><p>{row.detail}</p></div><div className="insight-meta"><StatusBadge>{row.impact}</StatusBadge><small>{row.date}</small></div></article>)}
        </div>
      </Panel>
    </>
  )
}

export { DashboardPage, FinanceInsightPage, InsightPage }
