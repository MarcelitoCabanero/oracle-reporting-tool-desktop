import {
  useState,
} from 'react'

import SystemSalesNavigation from
  './SystemSalesNavigation'

import SalesSummaryPage from
  './sales-summary/SalesSummaryPage'

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
