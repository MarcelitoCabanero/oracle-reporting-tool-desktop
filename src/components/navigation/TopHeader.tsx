import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Database,
  PanelLeft,
  RefreshCw,
  UserRound,
} from 'lucide-react'
import type { MissingMenuItem } from '../../pages/MaintenancePage'

interface TopHeaderProps {
  title: string
  version?: string
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  userName?: string
  userRole?: string
  updateStatus?: 'idle' | 'checking' | 'available' | 'downloading' | 'ready'
  onUpdateClick?: () => void
  missingMenuItems?: MissingMenuItem[]
  checkingNotifications?: boolean
  lastCheckedAt?: Date | null
  onRefreshNotifications?: () => void
  onNotificationClick?: () => void
}

function formatCheckTime(date: Date | null | undefined): string {
  if (!date) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function TopHeader({
  title,
  version = 'v1.0.0',
  sidebarCollapsed,
  onToggleSidebar,
  userName = 'User',
  userRole = 'System User',
  updateStatus = 'idle',
  onUpdateClick,
  missingMenuItems = [],
  checkingNotifications = false,
  lastCheckedAt = null,
  onRefreshNotifications,
  onNotificationClick,
}: TopHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const missingCount = missingMenuItems.length
  const hasNotifications = missingCount > 0
  const previewItems = missingMenuItems.slice(0, 3)
  const remainingCount = Math.max(0, missingCount - previewItems.length)

  useEffect(() => {
    if (!dropdownOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dropdownOpen])

  function getUpdateLabel() {
    switch (updateStatus) {
      case 'checking': return 'Checking updates...'
      case 'available': return 'Update available'
      case 'downloading': return 'Downloading update...'
      case 'ready': return 'Restart to update'
      default: return ''
    }
  }

  function handleSyncNotificationClick() {
    setDropdownOpen(false)
    onNotificationClick?.()
  }

  return (
    <header className="top-header-minimal bg-white border-bottom px-3 px-lg-4 py-2">
      <div className="d-flex align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-2">
          <button type="button" className="btn header-minimal-icon d-flex align-items-center justify-content-center" onClick={onToggleSidebar} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <PanelLeft size={18} />
          </button>
          <h1 className="h6 fw-semibold mb-0">{title}</h1>
        </div>
        <div className="d-flex align-items-center gap-2">
          {updateStatus !== 'idle' && (
            <button
              type="button"
              className="header-update-status d-flex align-items-center gap-2 border-0 bg-transparent"
              onClick={onUpdateClick}
              disabled={!onUpdateClick}
              title={onUpdateClick ? 'Restart the app to install the downloaded update' : undefined}
            >
              <RefreshCw size={14} className={updateStatus === 'checking' || updateStatus === 'downloading' ? 'spin' : ''} />
              <span>{getUpdateLabel()}</span>
            </button>
          )}
          <span className="header-version">{version}</span>

          <div className="position-relative" ref={dropdownRef}>
            <button
              type="button"
              className={`btn header-notification header-minimal-icon position-relative d-flex align-items-center justify-content-center ${hasNotifications ? 'has-unread' : ''}`}
              aria-label="Notifications"
              aria-expanded={dropdownOpen}
              title={
                hasNotifications
                  ? `${missingCount} new menu item(s) need synchronization`
                  : 'Notifications'
              }
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              <Bell size={18} />
              {hasNotifications && (
                <span className="header-notification-badge">
                  {missingCount > 99 ? '99+' : missingCount}
                </span>
              )}
            </button>

            {dropdownOpen && (
              <div className="notification-dropdown shadow-lg rounded-4 border" role="region" aria-label="Notifications panel">
                <div className="notification-dropdown-header d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
                  <div>
                    <div className="fw-semibold small d-flex align-items-center gap-2">
                      <span>Notifications</span>
                      {hasNotifications && (
                        <span className="notification-count-pill">1 new</span>
                      )}
                    </div>
                    {lastCheckedAt && (
                      <div className="notification-checked-time">
                        Checked at {formatCheckTime(lastCheckedAt)}
                      </div>
                    )}
                  </div>
                  {onRefreshNotifications && (
                    <button
                      type="button"
                      className="btn btn-sm notification-refresh-btn d-flex align-items-center gap-1"
                      onClick={() => onRefreshNotifications()}
                      disabled={checkingNotifications}
                      title="Check HQ for missing menu items now"
                    >
                      <RefreshCw size={13} className={checkingNotifications ? 'spin' : ''} />
                      <span>Check</span>
                    </button>
                  )}
                </div>

                <div className="notification-dropdown-body p-2">
                  {hasNotifications ? (
                    <button
                      type="button"
                      className="notification-item unread w-100 text-start border-0 rounded-3 p-3"
                      onClick={handleSyncNotificationClick}
                    >
                      <div className="d-flex align-items-start gap-3">
                        <div className="notification-item-icon d-flex align-items-center justify-content-center rounded-3 flex-shrink-0">
                          <Database size={18} />
                        </div>
                        <div className="flex-grow-1 min-w-0">
                          <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                            <span className="fw-semibold small notification-item-title">
                              Synchronize Menu Items
                            </span>
                            <span className="notification-unread-dot flex-shrink-0" />
                          </div>
                          <p className="notification-item-desc mb-2">
                            <strong>{missingCount}</strong> new product{missingCount === 1 ? '' : 's'} in HQ missing from the local POS database.
                          </p>
                          <div className="notification-preview-list d-flex flex-column gap-1 mb-2">
                            {previewItems.map((item) => (
                              <div key={item.itemnumber} className="notification-preview-chip text-truncate">
                                <span className="fw-semibold">{item.itemnumber}</span>
                                {' — '}
                                <span>{item.itemname || 'Unnamed item'}</span>
                              </div>
                            ))}
                            {remainingCount > 0 && (
                              <div className="notification-preview-more">
                                +{remainingCount} more item{remainingCount === 1 ? '' : 's'}
                              </div>
                            )}
                          </div>
                          <div className="notification-item-cta d-inline-flex align-items-center gap-1 fw-semibold">
                            <span>Review &amp; Sync in Maintenance</span>
                            <ArrowRight size={13} />
                          </div>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="notification-empty text-center py-4 px-3">
                      <div className="notification-empty-icon mx-auto mb-2 d-flex align-items-center justify-content-center rounded-circle">
                        <CheckCircle2 size={20} />
                      </div>
                      <div className="fw-semibold small mb-1">All menu items in sync</div>
                      <div className="text-secondary notification-empty-sub">
                        No new products waiting in Synchronize menu items.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button type="button" className="btn header-user-button d-flex align-items-center gap-2 px-1 px-lg-2" title={userName}>
            <span className="user-avatar d-flex align-items-center justify-content-center rounded-circle"><UserRound size={17} /></span>
            <span className="d-none d-md-flex flex-column text-start lh-sm">
              <span className="fw-semibold small">{userName}</span>
              <small className="text-secondary">{userRole}</small>
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default TopHeader
