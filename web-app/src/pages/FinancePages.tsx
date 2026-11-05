import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  FileImage,
  Filter,
  Plus,
  Search,
  WalletCards,
} from 'lucide-react'
import {
  Button,
  DataTable,
  Field,
  Modal,
  PageHeading,
  Panel,
  SectionTabs,
  StatCard,
  StatusBadge,
  formatMoney,
  useToast,
} from '../components'
import { depositRows, rofCashRows, rofNonCashRows } from '../data'

function DepositPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All statuses')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedDeposit, setSelectedDeposit] = useState<string | null>(null)
  const { notify } = useToast()
  const filtered = useMemo(() => depositRows.filter((row) =>
    `${row.reference} ${row.businessDate} ${row.depositDate}`.toLowerCase().includes(query.toLowerCase())
    && (status === 'All statuses' || row.status === status),
  ), [query, status])
  const selected = depositRows.find((row) => row.reference === selectedDeposit)
  const columns = [
    { label: 'Business date', render: (row: typeof depositRows[number]) => <strong>{row.businessDate}</strong> },
    { label: 'Deposit date', render: (row: typeof depositRows[number]) => row.depositDate },
    { label: 'Bank reference', render: (row: typeof depositRows[number]) => <span className="table-primary">{row.reference}</span> },
    { label: 'POS amount', align: 'right' as const, render: (row: typeof depositRows[number]) => formatMoney(row.pos) },
    { label: 'Deposit amount', align: 'right' as const, render: (row: typeof depositRows[number]) => <strong>{formatMoney(row.deposited)}</strong> },
    { label: 'Variance', align: 'right' as const, render: (row: typeof depositRows[number]) => <span className={row.variance ? 'negative-value' : 'positive-value'}>{formatMoney(row.variance)}</span> },
    { label: 'Status', render: (row: typeof depositRows[number]) => <StatusBadge>{row.status}</StatusBadge> },
    { label: 'Action', render: (row: typeof depositRows[number]) => <button className="text-link" onClick={() => setSelectedDeposit(row.reference)}>View details</button> },
  ]
  function showPreviewNotice() {
    notify('Deposit records are read-only preview data. Saving and attachments are not connected.')
    setCreateOpen(false)
  }
  return (
    <>
      <PageHeading eyebrow="FINANCE · CASH MANAGEMENT" title="Deposit monitoring" description="Review daily bank deposits, references, and cash reconciliation variances." actions={<><Button variant="secondary" onClick={() => notify('Deposit report export is not enabled in the UI preview.')}><Download size={15} /> Export</Button><Button onClick={() => setCreateOpen(true)}><Plus size={16} /> Record deposit</Button></>} />
      <div className="stat-grid">
        <StatCard label="Deposits this month" value="28" note="Nov 01 – Nov 30, 2026" icon={WalletCards} />
        <StatCard label="Total deposited" value="₱1,428,340" note="Across all business dates" icon={Banknote} tone="green" />
        <StatCard label="Reconciled" value="24" note="85.7% of deposits" icon={CheckCircle2} tone="violet" />
        <StatCard label="Needs review" value="2" note="Variance of ₱350.00" icon={ArrowDownRight} tone="amber" />
      </div>
      <Panel title="Deposit records" subtitle={`${filtered.length} sample records`} action={<span className="preview-chip">SAMPLE DATA</span>}>
        <div className="table-filters"><Field label="Search"><div className="input-with-icon"><Search size={15} /><input placeholder="Reference or business date..." value={query} onChange={(event) => setQuery(event.target.value)} /></div></Field><Field label="Status"><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Reconciled</option><option>Submitted</option><option>For review</option></select></Field><Field label="Month"><select><option>November 2026</option><option>October 2026</option></select></Field><Button variant="secondary" onClick={() => notify('Deposit list filtered using sample data.')}><Filter size={15} /> Filter</Button></div>
        <DataTable columns={columns} rows={filtered} rowKey={(row) => row.reference} />
        <div className="table-footer"><span>Showing {filtered.length} of 28 deposits</span><div className="table-pagination"><button disabled>Previous</button><button className="page-number">1</button><button onClick={() => notify('Only sample rows are available in this preview.')}>2</button><button onClick={() => notify('Only sample rows are available in this preview.')}>Next</button></div></div>
      </Panel>
      <div className="info-banner"><i>i</i><span>Deposits, attachments, and bank reconciliation are sample-only. No bank, database, or file system is connected.</span></div>
      {createOpen && <Modal title="Record a deposit" description="Enter the deposit details for a business date. This form is a non-persistent UI preview." onClose={() => setCreateOpen(false)}>
        <div className="modal-form-grid"><Field label="Business date"><input type="date" defaultValue="2026-11-03" /></Field><Field label="Deposit date"><input type="date" defaultValue="2026-11-04" /></Field><Field label="Bank reference"><input placeholder="Enter bank/reference number" /></Field><Field label="Deposit amount"><input type="number" placeholder="0.00" min="0" step="0.01" /></Field><Field label="Petty cash"><input type="number" placeholder="0.00" min="0" step="0.01" /></Field><Field label="BIR 2307"><input type="number" placeholder="0.00" min="0" step="0.01" /></Field></div>
        <button className="attachment-picker" type="button" onClick={() => notify('File attachments are not available in a browser preview.')}><FileImage size={18} /><span><strong>Attach deposit slip</strong><small>PDF, JPG or PNG · Attachments are disabled in this preview</small></span><Plus size={16} /></button>
        <div className="modal-actions"><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={showPreviewNotice}>Save deposit</Button></div>
      </Modal>}
      {selected && <Modal title={`Deposit · ${selected.reference}`} description={`${selected.businessDate} business date · Oracle Mall · Sample record`} onClose={() => setSelectedDeposit(null)}>
        <div className="deposit-detail-grid"><div><small>POS cash amount</small><strong>{formatMoney(selected.pos)}</strong></div><div><small>Bank deposit</small><strong>{formatMoney(selected.deposited)}</strong></div><div><small>Variance</small><strong className={selected.variance ? 'negative-value' : 'positive-value'}>{formatMoney(selected.variance)}</strong></div><div><small>Status</small><StatusBadge>{selected.status}</StatusBadge></div><div><small>Deposit date</small><strong>{selected.depositDate}</strong></div><div><small>Reference number</small><strong>{selected.reference}</strong></div></div>
        <div className="modal-actions"><Button variant="secondary" onClick={() => setSelectedDeposit(null)}>Close</Button><Button onClick={() => { setSelectedDeposit(null); notify('Deposit editing is not enabled in the UI preview.') }}>Edit deposit</Button></div>
      </Modal>}
    </>
  )
}

function RofPage() {
  const [active, setActive] = useState('cash')
  const [businessDate, setBusinessDate] = useState('2026-11-03')
  const { notify } = useToast()
  const cashVariance = rofCashRows.reduce((sum, row) => sum + row.actual - row.pos, 0)
  const nonCashVariance = rofNonCashRows.reduce((sum, row) => sum + row.actual - row.pos, 0)
  return (
    <>
      <PageHeading eyebrow="FINANCE · END OF DAY" title="Remittance of funds" description="Reconcile cashier cash and non-cash tenders against POS totals." actions={<><Field label="Business date"><input type="date" value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} /></Field><Button variant="secondary" onClick={() => notify('ROF details loaded from sample data.')}><CalendarDays size={15} /> Load day</Button><Button onClick={() => notify('ROF changes cannot be saved in the UI preview.')}><CheckCircle2 size={15} /> Save remittance</Button></>} />
      <div className="stat-grid">
        <StatCard label="POS cash total" value="₱48,670" note="3 cashier tills" icon={Banknote} />
        <StatCard label="Actual cash" value="₱48,620" note="Counted at close" icon={WalletCards} tone="green" />
        <StatCard label="Cash variance" value="−₱50.00" note="M. Reyes · Needs review" icon={ArrowDownRight} tone="amber" />
        <StatCard label="Non-cash tenders" value="₱37,950" note="Card, wallet & certificates" icon={CreditCard} tone="violet" />
      </div>
      <div className="rof-summary-banner"><span className="rof-summary-icon"><WalletCards size={20} /></span><div><strong>Remittance for November 3, 2026</strong><small>Oracle Mall · Store 0042 · Business date closes at 2:00 AM</small></div><StatusBadge>Draft</StatusBadge></div>
      <SectionTabs tabs={[{ label: 'Cash remittance', value: 'cash' }, { label: 'Non-cash remittance', value: 'noncash' }, { label: 'ROF summary', value: 'summary' }]} active={active} onSelect={setActive} />
      {active === 'cash' && <Panel title="Cash remittance by cashier" subtitle="Compare POS tender to actual counted cash" action={<span className="preview-chip">3 CASHIERS</span>}>
        <DataTable columns={[
          { label: 'Cashier', render: (row: typeof rofCashRows[number]) => <span className="employee-cell"><i>{row.cashier[0]}</i><strong>{row.cashier}</strong></span> },
          { label: 'Tender', render: (row) => row.tender },
          { label: 'POS amount', align: 'right', render: (row) => formatMoney(row.pos) },
          { label: 'Actual amount', align: 'right', render: (row) => <input className="table-number-input" type="number" defaultValue={row.actual.toFixed(2)} aria-label={`Actual amount for ${row.cashier}`} /> },
          { label: 'Variance', align: 'right', render: (row) => <strong className={row.actual === row.pos ? 'positive-value' : 'negative-value'}>{formatMoney(row.actual - row.pos)}</strong> },
          { label: 'Remarks', render: (row) => <input className="table-remarks-input" defaultValue={row.remarks} aria-label={`Remarks for ${row.cashier}`} /> },
          { label: 'Status', render: (row) => <StatusBadge>{row.actual === row.pos ? 'Balanced' : 'Review'}</StatusBadge> },
        ]} rows={rofCashRows} rowKey={(row) => row.cashier} />
        <div className="rof-total-row"><strong>Cash total</strong><strong>{formatMoney(48670)}</strong><strong>{formatMoney(48620)}</strong><strong className="negative-value">{formatMoney(cashVariance)}</strong></div>
      </Panel>}
      {active === 'noncash' && <Panel title="Non-cash remittance" subtitle="Card, digital wallet, and other tender settlements">
        <DataTable columns={[
          { label: 'Cashier / source', render: (row: typeof rofNonCashRows[number]) => row.cashier },
          { label: 'Tender type', render: (row) => <strong>{row.tender}</strong> },
          { label: 'POS amount', align: 'right', render: (row) => formatMoney(row.pos) },
          { label: 'Actual amount', align: 'right', render: (row) => <input className="table-number-input" type="number" defaultValue={row.actual.toFixed(2)} aria-label={`Actual ${row.tender} amount`} /> },
          { label: 'Variance', align: 'right', render: (row) => formatMoney(row.actual - row.pos) },
          { label: 'Remarks', render: (row) => <input className="table-remarks-input" defaultValue={row.remarks} aria-label={`Remarks for ${row.tender}`} /> },
        ]} rows={rofNonCashRows} rowKey={(row) => row.tender} />
        <div className="rof-total-row"><strong>Non-cash total</strong><strong>{formatMoney(37950)}</strong><strong>{formatMoney(37950)}</strong><strong className="positive-value">{formatMoney(nonCashVariance)}</strong></div>
      </Panel>}
      {active === 'summary' && <div className="dashboard-grid">
        <Panel title="Remittance summary" subtitle="November 3, 2026 · Store 0042"><div className="summary-ledger">{[['Cash · POS total', '₱48,670.00'], ['Cash · Actual count', '₱48,620.00'], ['Cash variance', '−₱50.00'], ['Non-cash · POS total', '₱37,950.00'], ['Non-cash · Actual settlement', '₱37,950.00'], ['Net remitted', '₱86,570.00']].map(([label, amount], index) => <div key={label} className={index === 5 ? 'ledger-total' : ''}><span>{label}</span><strong className={index === 2 ? 'negative-value' : ''}>{amount}</strong></div>)}</div></Panel>
        <Panel title="Shift notes" subtitle="Cashier remarks"><div className="notes-preview"><div><StatusBadge>Review</StatusBadge><p>M. Reyes cash drawer was short by ₱50.00. Verify change fund and end-of-shift count.</p><small>Added by A. Santos · Nov 04 at 1:56 AM</small></div><Field label="Add a note"><textarea placeholder="Enter a remittance note..." rows={3} /></Field><Button variant="secondary" onClick={() => notify('Notes cannot be saved in the UI preview.')}>Add note</Button></div></Panel>
      </div>}
      <div className="info-banner"><i>i</i><span>Cash counts, remarks, and remittance status are local preview values; no accounting or POS records are created.</span></div>
    </>
  )
}

export { DepositPage, RofPage }
