import {
  useEffect,
  useState,
} from 'react'

import SystemSalesNavigation from
  './SystemSalesNavigation'

import SalesSummaryPage from
  './sales-summary/SalesSummaryPage'

import EmployeeSalesPage from
  './employee-sales/EmployeeSalesPage'
import ScPwdPage from './sc-pwd/ScPwdPage'
import TenderListingPage from './tender-listing/TenderListingPage'

import type {
  SystemSalesView,
} from './system-sales.types'

let systemSalesViewCache: SystemSalesView = 'sales-summary'

interface SystemSalesPageProps {
  initialView?: SystemSalesView
  onViewChange?: (view: SystemSalesView) => void
}

export default function SystemSalesPage({ initialView, onViewChange }: SystemSalesPageProps = {}) {
  const [activeView, setActiveView] =
    useState<SystemSalesView>(
      initialView ?? systemSalesViewCache,
    )

  useEffect(() => {
    if (!initialView) return
    systemSalesViewCache = initialView
    setActiveView(initialView)
  }, [initialView])

  function navigate(view: SystemSalesView) {
    systemSalesViewCache = view
    setActiveView(view)
    onViewChange?.(view)
  }

  function renderActiveView() {
    switch (activeView) {
      case 'employee-sales':
        return <EmployeeSalesPage />

      case 'pos-sales':
        return <SalesSummaryPage workstationMode />

      case 'sc-pwd-listing':
        return <ScPwdPage />

      case 'tender-listing':
        return <TenderListingPage />

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
