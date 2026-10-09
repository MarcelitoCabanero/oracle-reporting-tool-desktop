import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, LoaderCircle, ReceiptText, RefreshCw, Scale, X } from 'lucide-react'
import './VarianceCheckingPage.css'
import type {
  VarianceCheckingResult,
  VarianceReceiptResult,
} from '../../../types/variance-checking'

function todayString(){const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`}
function money(v:number){return new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:2,maximumFractionDigits:2}).format(v||0)}
function dateText(v:string){if(!v)return'';const[y,m,d]=v.split('-').map(Number);return new Intl.DateTimeFormat('en-PH',{month:'short',day:'2-digit',year:'numeric'}).format(new Date(y,m-1,d))}

interface VarianceCheckingPageProps {
 initialDateFrom?: string
 initialDateTo?: string
 employeeName?: string
 autoGenerate?: boolean
}

export default function VarianceCheckingPage({ initialDateFrom, initialDateTo, employeeName, autoGenerate = false }: VarianceCheckingPageProps){
 const today=todayString(); const[dateFrom,setDateFrom]=useState(initialDateFrom ?? today); const[dateTo,setDateTo]=useState(initialDateTo ?? today)
 const[report,setReport]=useState<VarianceCheckingResult|null>(null); const[receipt,setReceipt]=useState<VarianceReceiptResult|null>(null)
 const[loading,setLoading]=useState(false); const[receiptLoading,setReceiptLoading]=useState(false); const[error,setError]=useState('')
 const period=useMemo(()=>dateFrom===dateTo?dateText(dateFrom):`${dateText(dateFrom)} – ${dateText(dateTo)}`,[dateFrom,dateTo])
 async function generate(){if(!dateFrom||!dateTo){setError('Please select a valid date range.');return}if(dateFrom>dateTo){setError('From date cannot be later than To date.');return}setLoading(true);setError('');try{setReport(await window.api.varianceChecking.generate({dateFrom,dateTo,employeeName}))}catch(e){setReport(null);setError(e instanceof Error?e.message:'Unable to generate Variance Checking report.')}finally{setLoading(false)}}
 useEffect(()=>{if(autoGenerate) void generate()}, [])
 async function openReceipt(checkNumber:string){setReceiptLoading(true);setError('');try{setReceipt(await window.api.varianceChecking.receipt({checkNumber}))}catch(e){setError(e instanceof Error?e.message:'Unable to load variance receipt.')}finally{setReceiptLoading(false)}}
 const busy=loading||receiptLoading
 return <div className="container-fluid px-0 variance-checking-page">
  <div className="variance-toolbar"><div className="variance-toolbar-title"><CalendarDays size={16}/><span>Report Parameters</span></div><div className="variance-toolbar-controls">
   <div className="variance-date-field"><label htmlFor="variance-from">From</label><input id="variance-from" type="date" className="form-control form-control-sm" value={dateFrom} disabled={busy} onChange={e=>setDateFrom(e.target.value)}/></div>
   <div className="variance-date-arrow">→</div><div className="variance-date-field"><label htmlFor="variance-to">To</label><input id="variance-to" type="date" className="form-control form-control-sm" value={dateTo} disabled={busy} onChange={e=>setDateTo(e.target.value)}/></div>
   <button type="button" className="btn btn-primary btn-sm variance-generate-btn" disabled={busy} onClick={generate}>{loading?<LoaderCircle size={15} className="spin"/>:<RefreshCw size={15}/>} {loading?'Generating...':'Generate'}</button>
   <div className="variance-period"><div>Report Period</div><strong>{period}</strong></div>
  </div></div>
  {error&&<div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3"><AlertTriangle size={16}/><span className="small">{error}</span></div>}
  {!report&&!loading&&<div className="variance-empty-state"><Scale size={38} strokeWidth={1.4}/><h6>No variance report generated</h6><p>Select a business date range and click Generate.</p></div>}
  {report&&<><section className="variance-summary">
   <div className="variance-summary-item"><span>Variance Checks</span><strong>{report.rows.length}</strong></div>
   <div className="variance-summary-item"><span>Gross Sales</span><strong>{money(report.totals.gross)}</strong></div>
   <div className="variance-summary-item"><span>Total Tender</span><strong>{money(report.totals.totalTender)}</strong></div>
   <div className={`variance-summary-item ${report.totals.variance!==0?'variance-summary-warning':''}`}><span>Variance Amount</span><strong>{money(report.totals.variance)}</strong></div>
  </section><section className="variance-section"><div className="variance-section-heading"><div><h6>Variance Transactions</h6><span>Double-click a row to view the full receipt</span></div><span className="variance-count-badge">{report.rows.length} record{report.rows.length===1?'':'s'}</span></div>
   <div className="variance-table-container"><table className="table variance-table mb-0"><thead><tr><th>Check Number</th><th>Business Date</th><th className="text-end">Gross Sales</th><th className="text-end">Total Tender</th><th className="text-end">Variance</th></tr></thead><tbody>
   {report.rows.length===0?<tr><td colSpan={5} className="text-center text-secondary py-4">No variance found for the selected period.</td></tr>:report.rows.map((r,i)=><tr key={`${r.businessDate}-${r.checkNumber}-${i}`} className="variance-clickable-row" title="Double-click to view receipt" onDoubleClick={()=>openReceipt(r.checkNumber)}><td className="fw-semibold">{r.checkNumber}</td><td>{dateText(r.businessDate)}</td><td className="text-end variance-number">{money(r.gross)}</td><td className="text-end variance-number">{money(r.totalTender)}</td><td className={`text-end variance-number fw-semibold ${r.variance>0?'variance-positive':r.variance<0?'variance-negative':''}`}>{money(r.variance)}</td></tr>)}</tbody>
   <tfoot><tr><td colSpan={2}>TOTAL</td><td className="text-end">{money(report.totals.gross)}</td><td className="text-end">{money(report.totals.totalTender)}</td><td className="text-end">{money(report.totals.variance)}</td></tr></tfoot></table></div>
  </section></>}
  {receipt&&<div className="variance-receipt-backdrop" onMouseDown={()=>setReceipt(null)}><div className="variance-receipt-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}><div className="variance-receipt-header"><div><div className="variance-receipt-title"><ReceiptText size={18}/><strong>Variance Details</strong></div><span>Check Number: {receipt.checkNumber}</span></div><button type="button" className="btn btn-sm btn-light variance-receipt-close" onClick={()=>setReceipt(null)}><X size={18}/></button></div><div className="variance-receipt-body"><pre>{receipt.lines.join('\n')}</pre></div></div></div>}
  {busy&&<div className="variance-loading-overlay"><div className="variance-loading-card"><LoaderCircle size={30} className="spin"/><strong>{receiptLoading?'Loading receipt':'Generating variance report'}</strong><span>Please wait...</span></div></div>}
 </div>
}
