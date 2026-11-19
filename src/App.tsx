import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import AppLayout from './layouts/AppLayout'
import type { DepositNotificationItem } from './components/navigation/TopHeader'
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
const seenDepositNotifKeyPrefix = 'oracle-reporting-tool-seen-depo-notifs:'
const notificationPollIntervalMs = 15 * 60 * 1000

function getDepositNotificationSignature(
  item: DepositNotificationItem,
): string {
  return `${item.depositId}|${item.approvalStatus}|${item.approvedAt}|${item.deleteStatus}|${item.deleteApprovedAt}`
}

function loadSeenDepositSignatures(locationName?: string): string[] {
  if (!locationName) return []
  try {
    const raw = window.localStorage.getItem(
      `${seenDepositNotifKeyPrefix}${locationName}`,
    )
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function saveSeenDepositSignatures(
  locationName: string,
  signatures: string[],
): void {
  try {
    // Keep most recent 200 signatures to prevent unbounded growth
    const trimmed = signatures.slice(-200)
    window.localStorage.setItem(
      `${seenDepositNotifKeyPrefix}${locationName}`,
      JSON.stringify(trimmed),
    )
  } catch {
    // Ignore storage errors
  }
}

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
  const [depositNotifications, setDepositNotifications] = useState<DepositNotificationItem[]>([])
  const [seenDepositSignatures, setSeenDepositSignatures] = useState<string[]>([])
  const [checkingNotifications, setCheckingNotifications] = useState(false)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)
  const [maintenanceAutoLoadTrigger, setMaintenanceAutoLoadTrigger] = useState(0)
  const checkingRef = useRef(false)

  const {
    user,
    isAuthenticated,
  } = useAuth()

  useEffect(() => {
    setSeenDepositSignatures(
      loadSeenDepositSignatures(user?.locationName),
    )
  }, [user?.locationName])

  const unreadDepositNotifications = useMemo(() => {
    if (depositNotifications.length === 0) {
      return []
    }
    const seenSet = new Set(seenDepositSignatures)
    return depositNotifications.filter(
      (item) => !seenSet.has(getDepositNotificationSignature(item)),
    )
  }, [depositNotifications, seenDepositSignatures])

  const markDepositNotificationsSeen = useCallback(
    (depositIds?: number[]) => {
      if (!user?.locationName || depositNotifications.length === 0) {
        return
      }

      const idSet =
        depositIds && depositIds.length > 0
          ? new Set(depositIds)
          : null

      const newSigs = depositNotifications
        .filter((item) => (idSet ? idSet.has(item.depositId) : true))
        .map(getDepositNotificationSignature)

      if (newSigs.length === 0) {
        return
      }

      setSeenDepositSignatures((prev) => {
        const merged = Array.from(new Set([...prev, ...newSigs]))
        saveSeenDepositSignatures(user.locationName, merged)
        return merged
      })
    },
    [user?.locationName, depositNotifications],
  )

  const checkMissingMenuItems = useCallback(async () => {
    if (checkingRef.current) {
      return
    }

    checkingRef.current = true
    setCheckingNotifications(true)

    try {
      const [menuRows, depoRows] = await Promise.all([
        window.api?.maintenance?.loadMissingItems
          ? window.api.maintenance.loadMissingItems().catch(() => [])
          : Promise.resolve([]),
        user?.locationName && window.api?.deposit?.getNotifications
          ? window.api.deposit.getNotifications(user.locationName).catch(() => [])
          : Promise.resolve([]),
      ])

      setMissingMenuItems(menuRows)
      setDepositNotifications(depoRows)
      setLastCheckedAt(new Date())
    } catch {
      // Fail silently during background checks so the UI is never disrupted
    } finally {
      checkingRef.current = false
      setCheckingNotifications(false)
    }
  }, [user?.locationName])

  useEffect(() => {
    if (!isAuthenticated) {
      setMissingMenuItems([])
      setDepositNotifications([])
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

  function handleDepositNotificationClick(depositId: number) {
    markDepositNotificationsSeen([depositId])
    setActivePage('deposit')
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
      depositNotifications={unreadDepositNotifications}
      checkingNotifications={checkingNotifications}
      lastCheckedAt={lastCheckedAt}
      onRefreshNotifications={() => void checkMissingMenuItems()}
      onNotificationClick={handleNotificationClick}
      onDepositNotificationClick={handleDepositNotificationClick}
      onMarkDepositNotificationsSeen={markDepositNotificationsSeen}
    >
      {renderPage()}
    </AppLayout>
  )
}

export default App
