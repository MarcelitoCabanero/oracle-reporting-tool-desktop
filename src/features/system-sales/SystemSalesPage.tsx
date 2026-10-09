import {
  useState,
} from 'react'

import SystemSalesNavigation from
  './SystemSalesNavigation'

import SalesSummaryPage from
  './sales-summary/SalesSummaryPage'

import EmployeeSalesPage from
  './employee-sales/EmployeeSalesPage'
import ScPwdPage from './sc-pwd/ScPwdPage'

import type {
  SystemSalesView,
} from './system-sales.types'

let systemSalesViewCache: SystemSalesView = 'sales-summary'

export default function SystemSalesPage() {
  const [activeView, setActiveView] =
    useState<SystemSalesView>(
      systemSalesViewCache,
    )

  function navigate(view: SystemSalesView) {
    systemSalesViewCache = view
    setActiveView(view)
  }

  function renderActiveView() {
    switch (activeView) {
      case 'employee-sales':
        return <EmployeeSalesPage />

      case 'pos-sales':
        return <SalesSummaryPage workstationMode />

      case 'sc-pwd-listing':
        return <ScPwdPage />

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
        onNavigate={navigate}
      />

      <div className="system-sales-workspace-content">
        {renderActiveView()}
      </div>
    </div>
  )
}
