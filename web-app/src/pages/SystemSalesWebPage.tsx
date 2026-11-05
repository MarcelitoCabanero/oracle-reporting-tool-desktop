import { useNavigate, useParams } from 'react-router-dom'
import SystemSalesPage from '../../../src/features/system-sales/SystemSalesPage'
import VarianceCheckingPage from '../../../src/features/system-sales/variance-checking/VarianceCheckingPage'
import type { SystemSalesView } from '../../../src/features/system-sales/system-sales.types'

const routeViews: Record<string, SystemSalesView> = {
  summary: 'sales-summary',
  'sales-summary': 'sales-summary',
  'employee-sales': 'employee-sales',
  'pos-sales': 'pos-sales',
  'sc-pwd': 'sc-pwd-listing',
  'sc-pwd-listing': 'sc-pwd-listing',
  'tender-listing': 'tender-listing',
}

const viewRoutes: Record<SystemSalesView, string> = {
  'sales-summary': 'summary',
  'employee-sales': 'employee-sales',
  'pos-sales': 'pos-sales',
  'sc-pwd-listing': 'sc-pwd',
  'tender-listing': 'tender-listing',
}

export default function SystemSalesWebPage() {
  const { view } = useParams()
  const navigate = useNavigate()

  if (view === 'variance-checking') return <VarianceCheckingPage />

  const initialView = routeViews[view ?? 'summary'] ?? 'sales-summary'
  return (
    <SystemSalesPage
      initialView={initialView}
      onViewChange={(nextView) => navigate(`/system-sales/${viewRoutes[nextView]}`)}
    />
  )
}
