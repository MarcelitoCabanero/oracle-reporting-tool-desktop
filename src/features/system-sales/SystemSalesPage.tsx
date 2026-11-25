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
import TenderListingPage from './tender-listing/TenderListingPage'
import VoidSummaryPage from './void-summary/VoidSummaryPage'

import type {
  SystemSalesView,
} from './system-sales.types'

function getToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

let systemSalesViewCache: SystemSalesView = 'sales-summary'
let systemSalesDateFromCache: string | null = null
let systemSalesDateToCache: string | null = null

export default function SystemSalesPage() {
  const today = getToday()
  const [activeView, setActiveView] =
    useState<SystemSalesView>(
      systemSalesViewCache,
    )
  const [dateFrom, setDateFromState] = useState(
    systemSalesDateFromCache ?? today,
  )
  const [dateTo, setDateToState] = useState(
    systemSalesDateToCache ?? today,
  )

  function handleDateFromChange(value: string) {
    systemSalesDateFromCache = value
    setDateFromState(value)
  }

  function handleDateToChange(value: string) {
    systemSalesDateToCache = value
    setDateToState(value)
  }

  function navigate(view: SystemSalesView) {
    systemSalesViewCache = view
    setActiveView(view)
  }

  const sharedDateProps = {
    dateFrom,
    dateTo,
    onDateFromChange: handleDateFromChange,
    onDateToChange: handleDateToChange,
  }

  function renderActiveView() {
    switch (activeView) {
      case 'employee-sales':
        return <EmployeeSalesPage {...sharedDateProps} />

      case 'pos-sales':
        return <SalesSummaryPage key="workstation" workstationMode {...sharedDateProps} />

      case 'sc-pwd-listing':
        return <ScPwdPage {...sharedDateProps} />

      case 'tender-listing':
        return <TenderListingPage {...sharedDateProps} />

      case 'void-summary':
        return <VoidSummaryPage {...sharedDateProps} />

      case 'sales-summary':
      default:
        return <SalesSummaryPage key="summary" {...sharedDateProps} />
    }
  }

  return (
    <div className="system-sales-workspace">
      <SystemSalesNavigation
        activeView={activeView}
        onNavigate={navigate}
      />

      <div
        id={`system-sales-panel-${activeView}`}
        role="tabpanel"
        aria-labelledby={`system-sales-tab-${activeView}`}
        className="system-sales-workspace-content"
      >
        {renderActiveView()}
      </div>
    </div>
  )
}
