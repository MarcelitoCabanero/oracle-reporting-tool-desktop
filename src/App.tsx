import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MaintenancePage from './pages/MaintenancePage'
import type { MissingMenuItem } from './pages/MaintenancePage'
import RofPage from './pages/RofPage'
import DepositPage from './pages/DepositPage'
import MenuItemPage from './pages/MenuItemPage.tsx'
import PosJournalPage from './pages/PosJournalPage.tsx'
import SystemSalesPage from './features/system-sales/SystemSalesPage'
import HourlySalesPage from './pages/HourlySalesPage'
import SettingsPage from './pages/SettingsPage'


import {
  useAuth,
} from './auth/useAuth'

import type {
  Page,
} from './types/navigation'

export type Theme = 'light' | 'dark'

const themeStorageKey = 'oracle-reporting-tool-theme'
const notificationPollIntervalMs = 15 * 60 * 1000

function getInitialTheme(): Theme {
  const savedTheme = window.localStorage.getItem(themeStorageKey)

  return savedTheme === 'dark' ? 'dark' : 'light'
}

function PlaceholderPage({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h1 className="h4 fw-bold">
        {title}
      </h1>

      <p className="text-secondary">
        {description}
      </p>
    </div>
  )
}

function App() {
  const [
    activePage,
    setActivePage,
  ] =
    useState<Page>(
      'dashboard',
    )

  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [missingMenuItems, setMissingMenuItems] = useState<MissingMenuItem[]>([])
  const [checkingNotifications, setCheckingNotifications] = useState(false)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)
  const [maintenanceAutoLoadTrigger, setMaintenanceAutoLoadTrigger] = useState(0)
  const checkingRef = useRef(false)

  const {
    user,
    isAuthenticated,
  } = useAuth()

  const checkMissingMenuItems = useCallback(async () => {
    if (checkingRef.current || !window.api?.maintenance?.loadMissingItems) {
      return
    }

    checkingRef.current = true
    setCheckingNotifications(true)

    try {
      const rows = await window.api.maintenance.loadMissingItems()
      setMissingMenuItems(rows)
      setLastCheckedAt(new Date())
    } catch {
      // Fail silently during background checks so the UI is never disrupted
    } finally {
      checkingRef.current = false
      setCheckingNotifications(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setMissingMenuItems([])
      setLastCheckedAt(null)
      return
    }

    void checkMissingMenuItems()

    const timer = window.setInterval(() => {
      void checkMissingMenuItems()
    }, notificationPollIntervalMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [isAuthenticated, checkMissingMenuItems])

  function handleNotificationClick() {
    setActivePage('maintenance')
    setMaintenanceAutoLoadTrigger((prev) => prev + 1)
  }

  const handleMissingItemsChange = useCallback((items: MissingMenuItem[]) => {
    setMissingMenuItems(items)
    setLastCheckedAt(new Date())
  }, [])

  function changeTheme(nextTheme: Theme) {
    setTheme(nextTheme)
    window.localStorage.setItem(themeStorageKey, nextTheme)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function renderPage() {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={
              setActivePage
            }
          />
        )

      case 'finance-insight':
        return (
          <PlaceholderPage
            title="Finance Insight"
            description="Financial analytics and sales insights."
          />
        )

      case 'hourly-sales':
        return <HourlySalesPage />

    case 'system-sales':
  return <SystemSalesPage />

     case 'menu-item':
  return <MenuItemPage />

      case 'pos-journal':
        return <PosJournalPage />

      case 'rof':
        return <RofPage />

case 'deposit':
  return <DepositPage />

      case 'maintenance':
        return (
          <MaintenancePage
            initialMissingItems={missingMenuItems}
            autoLoadTrigger={maintenanceAutoLoadTrigger}
            onMissingItemsChange={handleMissingItemsChange}
          />
        )

      case 'settings':
        return user?.role.trim().toLowerCase() === 'admin'
          ? <SettingsPage />
          : <DashboardPage onNavigate={setActivePage} />

      default:
        return (
          <DashboardPage
            onNavigate={
              setActivePage
            }
          />
        )
    }
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <AppLayout
      activePage={
        activePage
      }
      onNavigate={
        setActivePage
      }
      theme={theme}
      onThemeChange={changeTheme}
      missingMenuItems={missingMenuItems}
      checkingNotifications={checkingNotifications}
      lastCheckedAt={lastCheckedAt}
      onRefreshNotifications={() => void checkMissingMenuItems()}
      onNotificationClick={handleNotificationClick}
    >
      {renderPage()}
    </AppLayout>
  )
}

export default App
