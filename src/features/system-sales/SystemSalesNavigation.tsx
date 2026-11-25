import {
  useRef,
} from 'react'

import {
  ReceiptText,
  UsersRound,
  Monitor,
  HeartHandshake,
  CreditCard,
  XCircle,
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
    icon: <ReceiptText size={16} strokeWidth={2} />,
  },
  {
    id: 'employee-sales',
    label: 'Employee Sales',
    description:
      'Employee transaction report',
    icon: <UsersRound size={16} strokeWidth={2} />,
  },
  {
    id: 'pos-sales',
    label: 'POS Sales',
    description: 'Workstation transaction report',
    icon: <Monitor size={16} strokeWidth={2} />,
  },
  {
    id: 'sc-pwd-listing',
    label: 'SC / PWD Listing',
    description: 'Discount transaction details',
    icon: <HeartHandshake size={16} strokeWidth={2} />,
  },
  {
    id: 'tender-listing',
    label: 'Tender Listing',
    description: 'Tender reference details',
    icon: <CreditCard size={16} strokeWidth={2} />,
  },
  {
    id: 'void-summary',
    label: 'Void Summary',
    description: 'Void transactions & cancelled items',
    icon: <XCircle size={16} strokeWidth={2} />,
  },
]

export default function SystemSalesNavigation({
  activeView,
  onNavigate,
}: SystemSalesNavigationProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  function focusAndSelectTab(index: number) {
    const target = navigationItems[index]
    if (!target) return
    onNavigate(target.id)
    tabRefs.current[index]?.focus()
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const count = navigationItems.length
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusAndSelectTab((index + 1) % count)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusAndSelectTab((index - 1 + count) % count)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusAndSelectTab(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusAndSelectTab(count - 1)
    }
  }

  return (
    <div
      className="system-sales-navigation"
      role="tablist"
      aria-label="System Sales functions"
    >
      {navigationItems.map((item, index) => {
        const selected =
          item.id === activeView

        return (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[index] = el
            }}
            id={`system-sales-tab-${item.id}`}
            type="button"
            role="tab"
            className={[
              'system-sales-navigation-item',
              selected
                ? 'system-sales-navigation-item-active'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-selected={selected}
            aria-controls={`system-sales-panel-${item.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() =>
              onNavigate(item.id)
            }
            onKeyDown={(event) =>
              handleKeyDown(event, index)
            }
            title={item.description}
          >
            <span className="system-sales-navigation-icon" aria-hidden="true">
              {item.icon}
            </span>

            <span className="system-sales-navigation-text">
              <strong>{item.label}</strong>
            </span>
          </button>
        )
      })}
    </div>
  )
}
