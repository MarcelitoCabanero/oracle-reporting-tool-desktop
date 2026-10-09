import { X } from 'lucide-react'
import VarianceCheckingPage from './VarianceCheckingPage'

interface VarianceCheckingModalProps {
  dateFrom: string
  dateTo: string
  employeeName?: string
  workstation?: string
  onClose: () => void
}

export default function VarianceCheckingModal({ dateFrom, dateTo, employeeName, workstation, onClose }: VarianceCheckingModalProps) {
  return <div className="variance-report-backdrop" role="presentation" onMouseDown={onClose}>
    <div className="variance-report-modal" role="dialog" aria-modal="true" aria-label="Variance Checking" onMouseDown={event => event.stopPropagation()}>
      <div className="variance-report-modal-header">
        <div><strong>Variance Checking</strong><span>{employeeName ? `Employee: ${employeeName}` : workstation ? `Workstation: ${workstation}` : 'Sales Summary'}</span></div>
        <button type="button" className="btn btn-sm btn-light" onClick={onClose} aria-label="Close variance checking"><X size={18} /></button>
      </div>
      <div className="variance-report-modal-body"><VarianceCheckingPage initialDateFrom={dateFrom} initialDateTo={dateTo} employeeName={employeeName} workstation={workstation} autoGenerate /></div>
    </div>
  </div>
}
