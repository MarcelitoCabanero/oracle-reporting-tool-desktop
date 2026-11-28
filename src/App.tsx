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
import type { AppUpdateProgress, AppUpdateStatus } from './types/electron'

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

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const unitIndex = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / (1024 ** unitIndex)
  return `${value >= 100 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`
}

function formatUpdateEta(progress: AppUpdateProgress | null): string {
  if (!progress || progress.bytesPerSecond <= 0 || progress.total <= progress.transferred) {
    return ''
  }
  const remainingSeconds = Math.ceil((progress.total - progress.transferred) / progress.bytesPerSecond)
  if (remainingSeconds < 60) {
    return `~${remainingSeconds}s left`
  }
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  return seconds > 0 ? `~${minutes}m ${seconds}s left` : `~${minutes}m left`
}

function RequiredUpdateScreen({
  status,
  progress,
  actionError,
  actionInProgress,
  onInstall,
  onRetry,
}: {
  status: Exclude<AppUpdateStatus, 'idle' | 'checking'>
  progress: AppUpdateProgress | null
  actionError: string
  actionInProgress: boolean
  onInstall: () => void
  onRetry: () => void
}) {
  const isReady = status === 'ready'
  const hasError = status === 'error'
  const isPreparing = status === 'available'
  const isDownloading = status === 'downloading'
  const clampedPercent = isReady
    ? 100
    : Math.min(100, Math.max(0, Math.round(progress?.percent ?? 0)))
  const hasByteTotals = (progress?.total ?? 0) > 0
  const etaText = formatUpdateEta(progress)

  const statusMessage = hasError
    ? 'The required update could not be downloaded. Retry the download to continue.'
    : isReady
      ? 'The update is ready. Restart the application to install it before continuing.'
      : isPreparing
        ? 'A new version is available. Preparing the update download...'
        : 'Downloading the required update. Please keep the application open.'

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center login-page-bootstrap p-4"
      style={{ zIndex: 2000 }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="required-update-title"
      aria-describedby="required-update-message"
    >
      <section className="bg-white border rounded-4 shadow-sm p-4 p-md-5 text-center w-100" style={{ maxWidth: 480 }}>
        {!isReady && !hasError && (
          <div className="first-run-loader-wrap mx-auto mb-3">
            <div className="modern-orbital-loader" aria-label="Updating">
              <span className="modern-orbital-ring modern-orbital-ring-outer" />
              <span className="modern-orbital-ring modern-orbital-ring-inner" />
              <span className="modern-orbital-core fw-bold small tabular-nums">
                {isDownloading ? `${clampedPercent}%` : '···'}
              </span>
            </div>
          </div>
        )}

        <div className="text-uppercase fw-bold small mb-2 brand-text first-run-kicker">
          Application Update
        </div>
        <h1 id="required-update-title" className="h4 fw-bold mb-2">
          Required update
        </h1>
        <p id="required-update-message" className="text-secondary small mb-4">
          {statusMessage}
        </p>

        {!hasError && (
          <div className="first-run-progress-panel rounded-3 border p-3 mb-4 text-start">
            <div className="d-flex align-items-center justify-content-between gap-2 small mb-2">
              <span className="fw-medium text-secondary">
                {isReady
                  ? 'Download complete'
                  : isPreparing
                    ? 'Preparing update...'
                    : 'Downloading update...'}
              </span>
              <span className="fw-semibold brand-text tabular-nums">
                {isPreparing && !progress ? 'Starting...' : `${clampedPercent}%`}
              </span>
            </div>

            <div
              className="modern-progress-track"
              role="progressbar"
              aria-valuenow={isPreparing && !progress ? undefined : clampedPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`modern-progress-fill ${
                  isReady
                    ? 'is-complete'
                    : isPreparing && !progress
                      ? 'modern-progress-indeterminate'
                      : 'is-animated'
                }`}
                style={{ width: `${isPreparing && !progress ? 42 : clampedPercent}%` }}
              />
            </div>

            {(isDownloading || isReady) && (hasByteTotals || etaText) && (
              <div className="d-flex align-items-center justify-content-between gap-2 text-secondary mt-2 tabular-nums" style={{ fontSize: '0.75rem' }}>
                <span>
                  {hasByteTotals && progress
                    ? `${formatBytes(progress.transferred)} / ${formatBytes(progress.total)}`
                    : ''}
                </span>
                <span>
                  {progress && progress.bytesPerSecond > 0
                    ? `${formatBytes(progress.bytesPerSecond)}/s${etaText ? ` · ${etaText}` : ''}`
                    : isReady
                      ? 'Ready to install'
                      : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {actionError && (
          <div className="alert alert-danger small text-start" role="alert">
            {actionError}
          </div>
        )}

        {isReady ? (
          <button type="button" className="btn btn-primary px-4 py-2 fw-semibold" onClick={onInstall} disabled={actionInProgress}>
            {actionInProgress ? 'Restarting to update…' : 'Restart and install update'}
          </button>
        ) : hasError ? (
          <button type="button" className="btn btn-primary px-4 py-2 fw-semibold" onClick={onRetry} disabled={actionInProgress}>
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
  const [updateProgress, setUpdateProgress] = useState<AppUpdateProgress | null>(null)
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
    let receivedProgressEvent = false
    const unsubscribeStatus = window.api.app.onUpdateStatus((status) => {
      receivedStatusEvent = true
      setUpdateStatus(status)
      setUpdateActionError('')
    })
    const unsubscribeProgress = window.api.app.onUpdateProgress((progress) => {
      receivedProgressEvent = true
      setUpdateProgress(progress)
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

    void window.api.app.getUpdateProgress()
      .then((progress) => {
        if (!receivedProgressEvent) {
          setUpdateProgress(progress)
        }
      })
      .catch((error: unknown) => {
        console.error('Unable to read application update progress:', error)
      })

    return () => {
      unsubscribeStatus()
      unsubscribeProgress()
    }
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
        progress={updateProgress}
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
