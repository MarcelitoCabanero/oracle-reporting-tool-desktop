import {
  ReceiptText,
  UsersRound,
  Monitor,
  HeartHandshake,
} from 'lucide-react'

import type {
  SystemSalesView,
} from './system-sales.types'

interface SystemSalesNavigationProps {
  activeView: SystemSalesView
  onNavigate: (
    view: SystemSalesView,
  ) => void
}

interface SystemSalesNavigationItem {
  id: SystemSalesView
  label: string
  description: string
  icon: React.ReactNode
}

const navigationItems:
SystemSalesNavigationItem[] = [
  {
    id: 'sales-summary',
    label: 'Sales Summary',
    description:
      'Consolidated sales and tenders',
    icon: <ReceiptText size={17} />,
  },
  {
    id: 'employee-sales',
    label: 'Employee Sales',
    description:
      'Employee transaction report',
    icon: <UsersRound size={17} />,
  },
  {
    id: 'pos-sales',
    label: 'POS Sales',
    description: 'Workstation transaction report',
    icon: <Monitor size={17} />,
  },
  { id: 'sc-pwd-listing', label: 'SC / PWD Listing', description: 'Discount transaction details', icon: <HeartHandshake size={17} /> },
]

export default function SystemSalesNavigation({
  activeView,
  onNavigate,
}: SystemSalesNavigationProps) {
  return (
    <nav
      className="system-sales-navigation"
      aria-label="System Sales functions"
    >
      {navigationItems.map((item) => {
        const selected =
          item.id === activeView

        return (
          <button
            key={item.id}
            type="button"
            className={[
              'system-sales-navigation-item',
              selected
                ? 'system-sales-navigation-item-active'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={
              selected ? 'page' : undefined
            }
            onClick={() =>
              onNavigate(item.id)
            }
          >
            <span className="system-sales-navigation-icon">
              {item.icon}
            </span>

            <span className="system-sales-navigation-text">
              <strong>{item.label}</strong>

              <small>
                {item.description}
              </small>
            </span>
          </button>
        )
      })}
    </nav>
  )
}
