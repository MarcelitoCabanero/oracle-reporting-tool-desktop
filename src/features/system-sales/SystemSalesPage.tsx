import {
  useState,
} from 'react'

import {
  ChartNoAxesCombined,
} from 'lucide-react'

import SystemSalesNavigation from
  './SystemSalesNavigation'

import SalesSummaryPage from
  './sales-summary/SalesSummaryPage'

import VarianceCheckingPage from
  './variance-checking/VarianceCheckingPage'

import EmployeeSalesPage from
  './employee-sales/EmployeeSalesPage'

import type {
  SystemSalesView,
} from './system-sales.types'

export default function SystemSalesPage() {
  const [activeView, setActiveView] =
    useState<SystemSalesView>(
      'sales-summary',
    )

  function renderActiveView() {
    switch (activeView) {
      case 'variance-checking':
        return <VarianceCheckingPage />

      case 'employee-sales':
        return <EmployeeSalesPage />

      case 'sales-summary':
      default:
        return <SalesSummaryPage />
    }
  }

  return (
    <div className="system-sales-workspace">
      <div className="system-sales-workspace-header">
        <div className="system-sales-workspace-heading">
         
          
        </div>
      </div>

      <SystemSalesNavigation
        activeView={activeView}
        onNavigate={setActiveView}
      />

      <div className="system-sales-workspace-content">
        {renderActiveView()}
      </div>
    </div>
  )
}