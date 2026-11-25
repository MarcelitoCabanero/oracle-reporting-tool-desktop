import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  AlertTriangle,
  Banknote,
  Calculator,
  CheckCheck,
  Clock3,
  Megaphone,
  Pin,
  ReceiptText,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'

import type {
  DashboardAnnouncementItem,
  DashboardKpis,
} from '../../electron/dashboard/dashboard.repository'

import type {
  Page,
} from '../types/navigation'

import {
  useAuth,
} from '../auth/useAuth'

interface DashboardPageProps {
  onNavigate: (
    page: Page,
  ) => void
}

const SEEN_ANNOUNCEMENTS_KEY = 'oracle-reporting-tool-seen-announcements'

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function formatAnnouncementDate(value: string): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10)
  }
  return parsed.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function loadSeenAnnouncementIds(): number[] {
  try {
    const raw = window.localStorage.getItem(SEEN_ANNOUNCEMENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.map(Number).filter((id) => Number.isFinite(id) && id > 0)
      : []
  } catch {
    return []
  }
}

function saveSeenAnnouncementIds(ids: number[]): void {
  try {
    const trimmed = Array.from(new Set(ids)).slice(-300)
    window.localStorage.setItem(SEEN_ANNOUNCEMENTS_KEY, JSON.stringify(trimmed))
  } catch {
    // Ignore storage errors
  }
}

function getCategoryBadgeClass(category: string): string {
  const normalized = category.trim().toLowerCase()
  if (normalized === 'update' || normalized === 'feature' || normalized === 'new feature') {
    return 'dashboard-cat-badge is-update'
  }
  if (normalized === 'maintenance' || normalized === 'urgent') {
    return 'dashboard-cat-badge is-maintenance'
  }
  if (normalized === 'reminder' || normalized === 'notice') {
    return 'dashboard-cat-badge is-reminder'
  }
  return 'dashboard-cat-badge is-announcement'
}

function DashboardPage({
  onNavigate,
}: DashboardPageProps) {
  const {
    user,
  } = useAuth()

  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [announcements, setAnnouncements] = useState<DashboardAnnouncementItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [kpiError, setKpiError] = useState<string>('')
  const [announcementWarning, setAnnouncementWarning] = useState<string>('')
  const [seenIds, setSeenIds] = useState<number[]>(loadSeenAnnouncementIds)
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<DashboardAnnouncementItem | null>(null)

  const locationName = user?.locationName ?? ''

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setKpiError('')
    setAnnouncementWarning('')

    try {
      const res = await window.api.dashboard.load({
        locationName,
      })

      if (res && 'success' in res && res.success === false) {
        setKpiError(String((res as { message?: string }).message ?? 'Unable to load dashboard data.'))
        return
      }

      setKpis(res.kpis)
      setAnnouncements(res.announcements ?? [])
      setKpiError(res.kpiError ?? '')
      setAnnouncementWarning(res.announcementWarning ?? '')
    } catch (error) {
      setKpiError(
        error instanceof Error
          ? error.message
          : 'Unable to load dashboard data.',
      )
    } finally {
      setLoading(false)
    }
  }, [locationName])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadDashboard])

  const seenSet = useMemo(() => new Set(seenIds), [seenIds])

  const unreadCount = useMemo(
    () =>
      announcements.filter((item) => !seenSet.has(item.announcementId)).length,
    [announcements, seenSet],
  )

  const averageCheck = useMemo(() => {
    if (!kpis || kpis.totalTransactions <= 0) return 0
    return kpis.netSales / kpis.totalTransactions
  }, [kpis])

  function markAnnouncementSeen(announcementId: number) {
    if (!announcementId || seenSet.has(announcementId)) return
    setSeenIds((prev) => {
      const next = Array.from(new Set([...prev, announcementId]))
      saveSeenAnnouncementIds(next)
      return next
    })
  }

  function markAllAnnouncementsSeen() {
    if (announcements.length === 0) return
    const allIds = announcements.map((a) => a.announcementId)
    setSeenIds((prev) => {
      const next = Array.from(new Set([...prev, ...allIds]))
      saveSeenAnnouncementIds(next)
      return next
    })
  }

  function handleOpenAnnouncement(item: DashboardAnnouncementItem) {
    markAnnouncementSeen(item.announcementId)
    setSelectedAnnouncement(item)
  }

  return (
    <div className="container-fluid p-0">

      {/* Welcome */}

      <section
        className="
          bg-white
          border
          rounded-4
          p-4
          mb-4
        "
      >
        <div>
          <div
            className="
              text-uppercase
              fw-bold
              small
              brand-text
              mb-2
            "
          >
            Overview
          </div>

          <h1 className="h4 fw-bold mb-2">
            Welcome back,{' '}
            {user?.username}
          </h1>

          <p className="text-secondary mb-0">
            Here's an overview of your store's performance today.
          </p>
        </div>

        {kpiError && (
          <div className="alert alert-warning d-flex align-items-center gap-2 py-2 px-3 mt-3 mb-0 small rounded-3">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>{kpiError}</span>
          </div>
        )}
      </section>

      {/* KPI Cards */}

      <section className="row g-3 mb-4">

        <div className="col-12 col-sm-6 col-xl-3">
          <KpiCard
            title="Today's Sales"
            value={loading && !kpis ? '...' : formatMoney(kpis?.netSales ?? 0)}
            description="Net sales today"
            icon={
              <Banknote
                size={20}
              />
            }
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <KpiCard
            title="Total Transactions"
            value={loading && !kpis ? '...' : formatInteger(kpis?.totalTransactions ?? 0)}
            description="Completed transactions"
            icon={
              <ReceiptText
                size={20}
              />
            }
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <KpiCard
            title="Total Guests"
            value={loading && !kpis ? '...' : formatInteger(kpis?.totalGuests ?? 0)}
            description="Guests served today"
            icon={
              <Users
                size={20}
              />
            }
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <KpiCard
            title="Average Check"
            value={loading && !kpis ? '...' : formatMoney(averageCheck)}
            description="Average transaction value"
            icon={
              <Calculator
                size={20}
              />
            }
          />
        </div>

      </section>

      {/* Bottom cards: What's New & Quick Actions */}

      <section className="row g-3">

        <div className="col-12 col-xl-6">
          <div
            className="
              card
              border
              rounded-4
              h-100
            "
          >
            <div
              className="
                card-header
                bg-white
                border-bottom
                d-flex
                align-items-center
                justify-content-between
                gap-2
                py-3
              "
            >
              <div className="d-flex align-items-center gap-2 min-w-0">
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <h2 className="h6 fw-bold mb-0">
                      What's New
                    </h2>
                    {unreadCount > 0 && (
                      <span className="dashboard-unread-pill">
                        {unreadCount} New
                      </span>
                    )}
                  </div>

                  <p className="small text-secondary mb-0 mt-1">
                    Latest announcements &amp; updates
                  </p>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 flex-shrink-0">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm dashboard-mark-read-btn d-inline-flex align-items-center gap-1"
                    onClick={markAllAnnouncementsSeen}
                    title="Mark all announcements as read"
                  >
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                )}
                <div className="dashboard-icon-box">
                  <Megaphone
                    size={19}
                  />
                </div>
              </div>
            </div>

            <div className="card-body p-3">
              {announcementWarning && (
                <div className="alert alert-light border d-flex align-items-center gap-2 py-2 px-3 mb-2 small rounded-3 text-secondary">
                  <AlertTriangle size={15} className="text-warning flex-shrink-0" />
                  <span>{announcementWarning}</span>
                </div>
              )}

              {announcements.length > 0 ? (
                <div className="dashboard-whats-new-list">
                  {announcements.map((item) => {
                    const isUnread = !seenSet.has(item.announcementId)
                    return (
                      <button
                        key={item.announcementId}
                        type="button"
                        className={`dashboard-announcement-item text-start w-100 ${
                          item.isPinned ? 'is-pinned' : ''
                        } ${isUnread ? 'is-unread' : ''}`}
                        onClick={() => handleOpenAnnouncement(item)}
                      >
                        <div className="d-flex align-items-center justify-content-between gap-2 mb-1 flex-wrap">
                          <div className="d-flex align-items-center gap-1 flex-wrap">
                            {item.isPinned && (
                              <span className="dashboard-pin-badge" title="Pinned announcement">
                                <Pin size={11} />
                                <span>Pinned</span>
                              </span>
                            )}
                            <span className={getCategoryBadgeClass(item.category)}>
                              {item.category}
                            </span>
                            {item.versionTag && (
                              <span className="dashboard-version-pill">
                                {item.versionTag}
                              </span>
                            )}
                            {isUnread && (
                              <span className="dashboard-new-dot-pill">
                                NEW
                              </span>
                            )}
                          </div>

                          <small className="text-secondary" style={{ fontSize: '0.73rem' }}>
                            {formatAnnouncementDate(item.createdAt)}
                          </small>
                        </div>

                        <div className="fw-bold dashboard-announcement-title mb-1">
                          {item.title}
                        </div>

                        <p className="dashboard-announcement-preview text-secondary mb-2">
                          {item.message}
                        </p>

                        <div className="d-flex align-items-center justify-content-between gap-2">
                          <small className="text-secondary" style={{ fontSize: '0.72rem' }}>
                            Posted by <strong>{item.authorName}</strong>
                            {item.authorRole ? ` (${item.authorRole})` : ''}
                          </small>
                          <small className="brand-text fw-semibold" style={{ fontSize: '0.73rem' }}>
                            Read more →
                          </small>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="dashboard-whats-new-empty text-center py-4 px-3">
                  <div className="dashboard-icon-box mx-auto mb-2">
                    <Sparkles size={19} />
                  </div>
                  <div className="fw-semibold small mb-1">
                    No announcements yet
                  </div>
                  <p className="text-secondary small mb-0">
                    New updates and announcements will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div
            className="
              card
              border
              rounded-4
              h-100
            "
          >
            <div
              className="
                card-header
                bg-white
                border-bottom
                py-3
              "
            >
              <h2 className="h6 fw-bold mb-1">
                Quick Actions
              </h2>

              <p className="small text-secondary mb-0">
                Frequently used reports
              </p>
            </div>

            <div className="card-body">
              <div className="row g-2">

                <div className="col-12 col-md-6">
                  <QuickAction
                    icon={
                      <Clock3
                        size={19}
                      />
                    }
                    title="Hourly Sales"
                    description="View hourly performance"
                    onClick={() =>
                      onNavigate(
                        'hourly-sales',
                      )
                    }
                  />
                </div>

                <div className="col-12 col-md-6">
                  <QuickAction
                    icon={
                      <TrendingUp
                        size={19}
                      />
                    }
                    title="System Sales"
                    description="View sales summary"
                    onClick={() =>
                      onNavigate(
                        'system-sales',
                      )
                    }
                  />
                </div>

                <div className="col-12 col-md-6">
                  <QuickAction
                    icon={
                      <ReceiptText
                        size={19}
                      />
                    }
                    title="ROF"
                    description="Cash & non-cash reconciliation"
                    onClick={() =>
                      onNavigate(
                        'rof',
                      )
                    }
                  />
                </div>

                <div className="col-12 col-md-6">
                  <QuickAction
                    icon={
                      <Banknote
                        size={19}
                      />
                    }
                    title="Deposit Monitoring"
                    description="Review deposits"
                    onClick={() =>
                      onNavigate(
                        'deposit',
                      )
                    }
                  />
                </div>

              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div
          className="dashboard-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-announcement-modal-title"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="dashboard-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dashboard-modal-header d-flex align-items-start justify-content-between gap-3">
              <div>
                <div className="d-flex align-items-center gap-1 flex-wrap mb-2">
                  {selectedAnnouncement.isPinned && (
                    <span className="dashboard-pin-badge">
                      <Pin size={11} />
                      <span>Pinned</span>
                    </span>
                  )}
                  <span className={getCategoryBadgeClass(selectedAnnouncement.category)}>
                    {selectedAnnouncement.category}
                  </span>
                  {selectedAnnouncement.versionTag && (
                    <span className="dashboard-version-pill">
                      {selectedAnnouncement.versionTag}
                    </span>
                  )}
                  <small className="text-secondary ms-1">
                    {formatAnnouncementDate(selectedAnnouncement.createdAt)}
                  </small>
                </div>

                <h3 id="dashboard-announcement-modal-title" className="h5 fw-bold mb-1">
                  {selectedAnnouncement.title}
                </h3>

                <small className="text-secondary">
                  Posted by <strong>{selectedAnnouncement.authorName}</strong>
                  {selectedAnnouncement.authorRole ? ` · ${selectedAnnouncement.authorRole}` : ''}
                </small>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-light border rounded-3 p-1 d-inline-flex align-items-center justify-content-center"
                onClick={() => setSelectedAnnouncement(null)}
                aria-label="Close announcement"
              >
                <X size={18} />
              </button>
            </div>

            <div className="dashboard-modal-body">
              {selectedAnnouncement.message}
            </div>

            <div className="dashboard-modal-footer d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-primary btn-sm px-3"
                onClick={() => setSelectedAnnouncement(null)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

interface KpiCardProps {
  title: string
  value: string
  description: string
  icon: ReactNode
}

function KpiCard({
  title,
  value,
  description,
  icon,
}: KpiCardProps) {
  return (
    <article
      className="
        card
        bg-white
        border
        rounded-4
        h-100
        dashboard-kpi-card
      "
    >
      <div
        className="
          card-body
          d-flex
          align-items-center
          gap-3
        "
      >
        <div className="dashboard-icon-box flex-shrink-0">
          {icon}
        </div>

        <div className="min-w-0">
          <small
            className="
              text-secondary
              d-block
              mb-1
            "
          >
            {title}
          </small>

          <div
            className="
              fs-4
              fw-bold
              lh-sm
              mb-1
              text-truncate
            "
            title={value}
          >
            {value}
          </div>

          <small className="text-secondary">
            {description}
          </small>
        </div>
      </div>
    </article>
  )
}

interface QuickActionProps {
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
}

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: QuickActionProps) {
  return (
    <button
      type="button"
      className="
        btn
        btn-light
        border
        rounded-3
        w-100
        h-100
        d-flex
        align-items-center
        gap-3
        text-start
        p-3
        dashboard-quick-action
      "
      onClick={onClick}
    >
      <span className="dashboard-icon-box flex-shrink-0">
        {icon}
      </span>

      <span className="min-w-0">
        <strong className="d-block mb-1">
          {title}
        </strong>

        <small className="text-secondary">
          {description}
        </small>
      </span>
    </button>
  )
}

export default DashboardPage
