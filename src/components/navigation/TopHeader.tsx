import { Bell, PanelLeft, RefreshCw, UserRound } from 'lucide-react'

interface TopHeaderProps {
  title: string
  version?: string
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  userName?: string
  userRole?: string
  updateStatus?: 'idle' | 'checking' | 'available' | 'downloading' | 'ready'
}

function TopHeader({
  title,
  version = 'v1.0.0',
  sidebarCollapsed,
  onToggleSidebar,
  userName = 'User',
  userRole = 'System User',
  updateStatus = 'idle',
}: TopHeaderProps) {
  function getUpdateLabel() {
    switch (updateStatus) {
      case 'checking': return 'Checking updates...'
      case 'available': return 'Update available'
      case 'downloading': return 'Downloading update...'
      case 'ready': return 'Restart to update'
      default: return ''
    }
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
            <div className="header-update-status d-flex align-items-center gap-2">
              <RefreshCw size={14} className={updateStatus === 'checking' || updateStatus === 'downloading' ? 'spin' : ''} />
              <span>{getUpdateLabel()}</span>
            </div>
          )}
          <span className="header-version">{version}</span>
          <button type="button" className="btn header-notification header-minimal-icon d-flex align-items-center justify-content-center" aria-label="Notifications" title="Notifications">
            <Bell size={18} />
          </button>
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
