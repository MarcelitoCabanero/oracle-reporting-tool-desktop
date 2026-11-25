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
import SalesTargetPage from './pages/SalesTargetPage.tsx'
import InsightPage from './pages/InsightPage.tsx'
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
import type { AppUpdateStatus } from './types/electron'

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

function RequiredUpdateScreen({
  status,
  actionError,
  actionInProgress,
  onInstall,
  onRetry,
}: {
  status: Exclude<AppUpdateStatus, 'idle' | 'checking'>
  actionError: string
  actionInProgress: boolean
  onInstall: () => void
  onRetry: () => void
}) {
  const isReady = status === 'ready'
  const hasError = status === 'error'

  const statusMessage = hasError
    ? 'The required update could not be downloaded. Retry the download to continue.'
    : isReady
      ? 'The update is ready. Restart the application to install it before continuing.'
      : status === 'available'
        ? 'A new version is available. The required update is being prepared.'
        : 'Downloading the required update. Please keep the application open.'

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-light p-4"
      style={{ zIndex: 2000 }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="required-update-title"
      aria-describedby="required-update-message"
    >
      <section className="bg-white border rounded-4 shadow-sm p-4 p-md-5 text-center w-100" style={{ maxWidth: 480 }}>
        {!isReady && !hasError && (
          <div className="spinner-border text-primary mb-3" role="status" aria-label="Updating" />
        )}

        <h1 id="required-update-title" className="h4 fw-bold mb-3">
          Required update
        </h1>
        <p id="required-update-message" className="text-secondary mb-4">
          {statusMessage}
        </p>

        {actionError && (
          <div className="alert alert-danger small text-start" role="alert">
            {actionError}
          </div>
        )}

        {isReady ? (
          <button type="button" className="btn btn-primary px-4" onClick={onInstall} disabled={actionInProgress}>
            {actionInProgress ? 'Restarting to update…' : 'Restart and install update'}
          </button>
        ) : hasError ? (
          <button type="button" className="btn btn-primary px-4" onClick={onRetry} disabled={actionInProgress}>
            {actionInProgress ? 'Retrying update…' : 'Retry update'}
          </button>
        ) : (
          <div className="small text-secondary" role="status">
            The application will be available after the update is installed.
          </div>
        )}
      </section>
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
  const [seenByLocation, setSeenByLocation] = useState<Record<string, string[]>>({})
  const [checkingNotifications, setCheckingNotifications] = useState(false)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)
  const [maintenanceAutoLoadTrigger, setMaintenanceAutoLoadTrigger] = useState(0)
  const [updateStatus, setUpdateStatus] = useState<AppUpdateStatus>('idle')
  const [updateActionError, setUpdateActionError] = useState('')
  const [updateActionInProgress, setUpdateActionInProgress] = useState(false)
  const checkingRef = useRef(false)

  const {
    user,
    isAuthenticated,
  } = useAuth()

  const locationName = user?.locationName ?? ''

  useEffect(() => {
    let receivedStatusEvent = false
    const unsubscribe = window.api.app.onUpdateStatus((status) => {
      receivedStatusEvent = true
      setUpdateStatus(status)
      setUpdateActionError('')
    })

    void window.api.app.getUpdateStatus()
      .then((status) => {
        if (!receivedStatusEvent) {
          setUpdateStatus(status)
        }
      })
      .catch((error: unknown) => {
        console.error('Unable to read application update status:', error)
      })

    return unsubscribe
  }, [])

  async function installRequiredUpdate() {
    setUpdateActionInProgress(true)
    setUpdateActionError('')
    try {
      await window.api.app.installUpdate()
    } catch (error) {
      console.error('Unable to install required application update:', error)
      setUpdateActionError(error instanceof Error ? error.message : 'Unable to start the update installation.')
      setUpdateActionInProgress(false)
    }
  }

  async function retryRequiredUpdate() {
    setUpdateActionInProgress(true)
    setUpdateActionError('')
    try {
      await window.api.app.retryUpdate()
    } catch (error) {
      console.error('Unable to retry the required application update:', error)
      setUpdateActionError(error instanceof Error ? error.message : 'Unable to retry the update download.')
    } finally {
      setUpdateActionInProgress(false)
    }
  }

  const seenDepositSignatures = useMemo(
    () => (locationName ? seenByLocation[locationName] ?? loadSeenDepositSignatures(locationName) : []),
    [locationName, seenByLocation],
  )

  const unreadDepositNotifications = useMemo(() => {
    if (!isAuthenticated || depositNotifications.length === 0) {
      return []
    }
    const seenSet = new Set(seenDepositSignatures)
    return depositNotifications.filter(
      (item) => !seenSet.has(getDepositNotificationSignature(item)),
    )
  }, [isAuthenticated, depositNotifications, seenDepositSignatures])

  const markDepositNotificationsSeen = useCallback(
    (depositIds?: number[]) => {
      if (!locationName || depositNotifications.length === 0) {
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

      setSeenByLocation((prev) => {
        const current = prev[locationName] ?? loadSeenDepositSignatures(locationName)
        const merged = Array.from(new Set([...current, ...newSigs]))
        saveSeenDepositSignatures(locationName, merged)
        return { ...prev, [locationName]: merged }
      })
    },
    [locationName, depositNotifications],
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
        locationName && window.api?.deposit?.getNotifications
          ? window.api.deposit.getNotifications(locationName).catch(() => [])
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
  }, [locationName])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const initialTimer = window.setTimeout(() => {
      void checkMissingMenuItems()
    }, 0)

    const timer = window.setInterval(() => {
      void checkMissingMenuItems()
    }, notificationPollIntervalMs)

    return () => {
      window.clearTimeout(initialTimer)
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

  if (
    updateStatus === 'available' ||
    updateStatus === 'downloading' ||
    updateStatus === 'ready' ||
    updateStatus === 'error'
  ) {
    return (
      <RequiredUpdateScreen
        status={updateStatus}
        actionError={updateActionError}
        actionInProgress={updateActionInProgress}
        onInstall={() => void installRequiredUpdate()}
        onRetry={() => void retryRequiredUpdate()}
      />
    )
  }

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
        return <InsightPage />

      case 'hourly-sales':
        return <HourlySalesPage />

    case 'system-sales':
  return <SystemSalesPage />

     case 'menu-item':
  return <MenuItemPage />

      case 'sales-target':
        return <SalesTargetPage />

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
