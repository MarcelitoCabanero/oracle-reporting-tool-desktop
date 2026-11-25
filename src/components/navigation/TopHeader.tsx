import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bell,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import type { MissingMenuItem } from '../../pages/MaintenancePage'

export interface DepositNotificationItem {
  depositId: number
  businessDate: string
  depositReference: string
  approvalStatus: 'Not Required' | 'Pending' | 'Approved' | 'Rejected'
  approvedBy: string
  approvedAt: string
  deleteStatus: 'None' | 'Pending Delete' | 'Delete Approved' | 'Delete Rejected'
  deleteApprovedBy: string
  deleteApprovedAt: string
  deleteReason: string
}

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
  depositNotifications?: DepositNotificationItem[]
  checkingNotifications?: boolean
  lastCheckedAt?: Date | null
  onRefreshNotifications?: () => void
  onNotificationClick?: () => void
  onDepositNotificationClick?: (depositId: number) => void
  onMarkDepositNotificationsSeen?: (depositIds?: number[]) => void
}

function formatCheckTime(date: Date | null | undefined): string {
  if (!date) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatShortDate(value: string): string {
  if (!value) return '—'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function TopHeader({
  title,
  version = 'v1.0.0',
  userName = 'User',
  userRole = 'System User',
  updateStatus = 'idle',
  onUpdateClick,
  missingMenuItems = [],
  depositNotifications = [],
  checkingNotifications = false,
  lastCheckedAt = null,
  onRefreshNotifications,
  onNotificationClick,
  onDepositNotificationClick,
  onMarkDepositNotificationsSeen,
}: TopHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const missingCount = missingMenuItems.length
  const depositNotifCount = depositNotifications.length
  const totalBadgeCount =
    (missingCount > 0 ? 1 : 0) + depositNotifCount
  const hasNotifications = totalBadgeCount > 0
  const previewItems = missingMenuItems.slice(0, 3)
  const remainingCount = Math.max(0, missingCount - previewItems.length)

  function closeDropdownAndClearSeen() {
    setDropdownOpen(false)
    if (depositNotifications.length > 0) {
      onMarkDepositNotificationsSeen?.(
        depositNotifications.map((item) => item.depositId),
      )
    }
  }

  useEffect(() => {
    if (!dropdownOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
        if (depositNotifications.length > 0) {
          onMarkDepositNotificationsSeen?.(
            depositNotifications.map((item) => item.depositId),
          )
        }
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false)
        if (depositNotifications.length > 0) {
          onMarkDepositNotificationsSeen?.(
            depositNotifications.map((item) => item.depositId),
          )
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dropdownOpen, depositNotifications, onMarkDepositNotificationsSeen])

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

  function handleDepositItemClick(depositId: number) {
    setDropdownOpen(false)
    onDepositNotificationClick?.(depositId)
  }

  return (
    <header className="top-header-minimal bg-white border-bottom px-3 px-lg-4 py-2">
      <div className="d-flex align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-2">
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
                  ? `${totalBadgeCount} notification(s)`
                  : 'Notifications'
              }
              onClick={() => {
                if (dropdownOpen) {
                  closeDropdownAndClearSeen()
                } else {
                  setDropdownOpen(true)
                }
              }}
            >
              <Bell size={18} />
              {hasNotifications && (
                <span className="header-notification-badge">
                  {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
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
                        <span className="notification-count-pill">
                          {totalBadgeCount} active
                        </span>
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
                      title="Check HQ for updates now"
                    >
                      <RefreshCw size={13} className={checkingNotifications ? 'spin' : ''} />
                      <span>Check</span>
                    </button>
                  )}
                </div>

                <div
                  className="notification-dropdown-body p-2 d-flex flex-column gap-2"
                  style={{ maxHeight: 420, overflowY: 'auto' }}
                >
                  {hasNotifications ? (
                    <>
                      {depositNotifications.map((item) => {
                        const isDeleteApproved =
                          item.deleteStatus === 'Delete Approved'
                        const isDeleteRejected =
                          item.deleteStatus === 'Delete Rejected'
                        const isPendingDelete =
                          item.deleteStatus === 'Pending Delete'

                        return (
                          <button
                            key={`depo-notif-${item.depositId}`}
                            type="button"
                            className="notification-item unread w-100 text-start border-0 rounded-3 p-3"
                            onClick={() =>
                              handleDepositItemClick(item.depositId)
                            }
                          >
                            <div className="d-flex align-items-start gap-3">
                              <div className="notification-item-icon d-flex align-items-center justify-content-center rounded-3 flex-shrink-0">
                                {isDeleteApproved ? (
                                  <Trash2 size={18} className="text-danger" />
                                ) : item.approvalStatus === 'Approved' ? (
                                  <ShieldCheck size={18} className="text-success" />
                                ) : item.approvalStatus === 'Rejected' ||
                                  isDeleteRejected ? (
                                  <AlertTriangle size={18} className="text-danger" />
                                ) : (
                                  <Banknote size={18} />
                                )}
                              </div>

                              <div className="flex-grow-1 min-w-0">
                                <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                                  <span className="fw-semibold small notification-item-title">
                                    Deposit #{item.depositId} ·{' '}
                                    {formatShortDate(item.businessDate)}
                                  </span>
                                  <span className="notification-unread-dot flex-shrink-0" />
                                </div>

                                <div className="d-flex flex-wrap gap-1 mb-1">
                                  {item.deleteStatus !== 'None' && (
                                    <span
                                      className={`badge ${
                                        isDeleteApproved
                                          ? 'text-bg-danger'
                                          : isDeleteRejected
                                            ? 'text-bg-secondary'
                                            : 'text-bg-warning'
                                      }`}
                                      style={{ fontSize: '0.68rem' }}
                                    >
                                      {isDeleteApproved
                                        ? 'Delete Approved (Ready to Confirm)'
                                        : item.deleteStatus}
                                    </span>
                                  )}

                                  {item.approvalStatus !== 'Not Required' && (
                                    <span
                                      className={`badge ${
                                        item.approvalStatus === 'Approved'
                                          ? 'text-bg-success'
                                          : item.approvalStatus === 'Rejected'
                                            ? 'text-bg-danger'
                                            : 'text-bg-warning'
                                      }`}
                                      style={{ fontSize: '0.68rem' }}
                                    >
                                      {item.approvalStatus === 'Pending'
                                        ? 'Pending Approval'
                                        : `Deduction ${item.approvalStatus}`}
                                    </span>
                                  )}
                                </div>

                                <p className="notification-item-desc mb-1">
                                  {isDeleteApproved ? (
                                    <>
                                      Delete request approved
                                      {item.deleteApprovedBy
                                        ? ` by ${item.deleteApprovedBy}`
                                        : ''}
                                      . Click to confirm permanent deletion.
                                    </>
                                  ) : isDeleteRejected ? (
                                    <>
                                      Delete request was rejected
                                      {item.deleteApprovedBy
                                        ? ` by ${item.deleteApprovedBy}`
                                        : ''}
                                      .
                                    </>
                                  ) : isPendingDelete ? (
                                    <>
                                      Delete request is waiting for Area Manager approval.
                                    </>
                                  ) : item.approvalStatus === 'Approved' ? (
                                    <>
                                      Deposit deductions approved
                                      {item.approvedBy
                                        ? ` by ${item.approvedBy}`
                                        : ''}
                                      .
                                    </>
                                  ) : item.approvalStatus === 'Rejected' ? (
                                    <>
                                      Deposit deductions rejected
                                      {item.approvedBy
                                        ? ` by ${item.approvedBy}`
                                        : ''}
                                      . Review thread remarks.
                                    </>
                                  ) : (
                                    <>
                                      Ref# {item.depositReference || '—'} is waiting for Area Manager approval.
                                    </>
                                  )}
                                </p>

                                <div className="notification-item-cta d-inline-flex align-items-center gap-1 fw-semibold">
                                  <Clock size={12} />
                                  <span>Open in Deposit Monitoring</span>
                                  <ArrowRight size={13} />
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}

                      {missingCount > 0 && (
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
                      )}
                    </>
                  ) : (
                    <div className="notification-empty text-center py-4 px-3">
                      <div className="notification-empty-icon mx-auto mb-2 d-flex align-items-center justify-content-center rounded-circle">
                        <CheckCircle2 size={20} />
                      </div>
                      <div className="fw-semibold small mb-1">All caught up</div>
                      <div className="text-secondary notification-empty-sub">
                        No deposit approval updates or new menu items waiting.
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
