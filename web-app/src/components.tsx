import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ButtonHTMLAttributes, FormEvent, MouseEvent, ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  Command,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  X,
} from 'lucide-react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { navigationGroups } from './data'
import { useAuth } from './auth/useAuth'
import type { TableColumn } from './types'
import type { LucideIcon } from 'lucide-react'
import jcoLogo from '../assets/jco-logo.png'

export type Theme = 'light' | 'dark'
type ToastTone = 'success' | 'info' | 'warning'
interface ToastMessage { id: number; message: string; tone: ToastTone }
interface ToastContextValue { notify: (message: string, tone?: ToastTone) => void }

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used within AppLayout.')
  return value
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value)
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-heading-actions">{actions}</div>}
    </div>
  )
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger' }) {
  return <button className={`button button-${variant}`} {...props}>{children}</button>
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function StatCard({
  label,
  value,
  note,
  trend,
  icon: Icon,
  tone = 'blue',
}: {
  label: string
  value: string
  note: string
  trend?: 'up' | 'down'
  icon: LucideIcon
  tone?: 'blue' | 'green' | 'amber' | 'violet'
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-${tone}`}><Icon size={18} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-note ${trend === 'down' ? 'note-down' : trend ? 'note-up' : ''}`}>
        {trend === 'up' && <ArrowUpRight size={14} />}
        {trend === 'down' && <ArrowDownRight size={14} />}
        <span>{note}</span>
      </div>
    </article>
  )
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = 'No records match the selected filters.',
}: {
  columns: TableColumn<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string | number
  empty?: string
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr>{columns.map((column, index) => <th key={`${column.label}-${index}`} className={column.align === 'right' ? 'align-right' : ''}>{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={rowKey(row, rowIndex)}>
              {columns.map((column, columnIndex) => <td key={`${column.label}-${columnIndex}`} className={column.align === 'right' ? 'align-right' : ''}>{column.render(row, rowIndex)}</td>)}
            </tr>
          )) : <tr><td className="empty-cell" colSpan={columns.length}>{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

export function StatusBadge({ children }: { children: string }) {
  const value = children.toLowerCase()
  const tone = value.includes('active') || value.includes('completed') || value.includes('reconciled') || value.includes('balanced')
    ? 'green'
    : value.includes('review') || value.includes('short') || value.includes('void')
      ? 'amber'
      : value.includes('inactive') || value.includes('error')
        ? 'gray'
        : 'blue'
  return <span className={`status-badge status-${tone}`}><span />{children}</span>
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return <label className="field"><span>{label}</span>{children}</label>
}

export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}) {
  function closeOnBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }
  return (
    <div className="modal-backdrop" onMouseDown={closeOnBackdrop}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/finance-insight': 'Finance insight',
  '/insight': 'Insights',
  '/hourly-sales': 'Hourly sales',
  '/system-sales': 'System sales',
  '/system-sales/summary': 'Sales summary',
  '/system-sales/employee-sales': 'Employee sales',
  '/system-sales/pos-sales': 'POS sales',
  '/system-sales/sc-pwd': 'SC / PWD listing',
  '/system-sales/tender-listing': 'Tender listing',
  '/system-sales/variance-checking': 'Variance checking',
  '/menu-item': 'Menu items',
  '/pos-journal': 'POS journal',
  '/transactions': 'Transactions',
  '/reports': 'Reports',
  '/rof': 'Remittance of funds',
  '/deposit': 'Deposit monitoring',
  '/maintenance': 'Maintenance',
}

export function AppLayout() {
  const [theme, setTheme] = useState<Theme>(() => window.localStorage.getItem('ort-web-theme') === 'dark' ? 'dark' : 'light')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const title = pageTitles[location.pathname] ?? 'Oracle Reporting Tool'

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('ort-web-theme', theme)
  }, [theme])

  const notify = useMemo<ToastContextValue>(() => ({
    notify(message, tone = 'info') {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current, { id, message, tone }])
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600)
    },
  }), [])

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      notify.notify(error instanceof Error ? error.message : 'Unable to end your session.', 'warning')
      navigate('/login', {
        replace: true,
        state: { logoutWarning: error instanceof Error ? error.message : 'Unable to end your server session.' },
      })
    } finally {
      setLogoutOpen(false)
    }
  }

  function quickSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const query = String(formData.get('query') ?? '').trim()
    if (query) navigate(`/transactions?search=${encodeURIComponent(query)}`)
    setSearchOpen(false)
  }

  return (
    <ToastContext.Provider value={notify}>
      <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
        <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
          <Link className="brand" to="/dashboard" onClick={() => setMobileOpen(false)}>
            <img className="brand-logo" src={jcoLogo} alt="" />
            <span className="brand-copy"><strong>Oracle Reporting</strong><small>STORE OPERATIONS</small></span>
          </Link>
          <nav className="sidebar-nav" aria-label="Main navigation">
            {navigationGroups.map((group, index) => (
              <div className="nav-group" key={group.label} style={index === 0 ? { marginTop: '12px' } : undefined}>
                <div className="nav-group-label">{group.label}</div>
                {group.items.map(({ label, to, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={collapsed ? label : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `nav-link ${isActive || (to === '/system-sales' && location.pathname.startsWith(to)) ? 'nav-active' : ''}`}
                  >
                    <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
                    {to === '/maintenance' && <i className="nav-dot" />}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button type="button" className="theme-toggle" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}>
              <span className="theme-toggle-icon">{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</span>
              <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
              <span className={`toggle-track ${theme === 'dark' ? 'toggle-on' : ''}`}><i /></span>
            </button>
            <div className="sidebar-user">
              <span className="user-avatar">{user?.displayName.slice(0, 1).toUpperCase() ?? 'U'}</span>
              <span className="user-copy"><strong>{user?.displayName}</strong><small>{user?.role}</small></span>
              <button type="button" className="icon-button logout-button" onClick={() => setLogoutOpen(true)} aria-label="Sign out"><LogOut size={17} /></button>
            </div>
          </div>
        </aside>

        <div className="app-main">
          <header className="topbar">
            <div className="topbar-left">
              <button className="icon-button desktop-toggle" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
              <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
              <span className="breadcrumb-muted">Workspace</span><ChevronRight size={14} className="breadcrumb-chevron" /><span className="breadcrumb-current">{title}</span>
            </div>
            <div className="topbar-actions">
              <span className="sync-status"><span /> Data as of 10:45 AM</span>
              <button className="icon-button topbar-search" aria-label="Quick search" onClick={() => setSearchOpen(true)}><Search size={18} /></button>
              <button className="icon-button" aria-label="Notifications" onClick={() => notify.notify('You’re all caught up.')}><Bell size={18} /></button>
              <div className="topbar-divider" />
              <div className="topbar-user"><span className="user-avatar small-avatar">{user?.displayName.slice(0, 1).toUpperCase() ?? 'U'}</span><span>{user?.displayName}</span></div>
            </div>
          </header>
          <main className="main-content"><Outlet /></main>
          <footer className="app-footer"><span>Oracle Reporting Tool <span className="footer-version">WEB PREVIEW · 0.1.0</span></span><span>Sample data · Not connected to production</span></footer>
        </div>
      </div>

      {logoutOpen && (
        <Modal title="Sign out?" description="You will need to sign in again to view store reports." onClose={() => setLogoutOpen(false)}>
          <div className="modal-actions"><Button variant="secondary" onClick={() => setLogoutOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => void handleSignOut()}>Sign out</Button></div>
        </Modal>
      )}
      {searchOpen && (
        <Modal title="Quick search" description="Find a transaction by check number or employee." onClose={() => setSearchOpen(false)}>
          <form onSubmit={quickSearch}>
            <Field label="Search transactions">
              <div className="input-with-icon"><Search size={16} /><input name="query" autoFocus placeholder="Check number, employee..." /></div>
            </Field>
            <div className="modal-actions"><Button variant="secondary" type="button" onClick={() => setSearchOpen(false)}>Cancel</Button><Button type="submit">Search</Button></div>
          </form>
        </Modal>
      )}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => <div key={toast.id} className={`toast toast-${toast.tone}`}><Check size={16} /><span>{toast.message}</span><button onClick={() => setToasts((all) => all.filter((item) => item.id !== toast.id))} aria-label="Dismiss notification"><X size={15} /></button></div>)}
      </div>
    </ToastContext.Provider>
  )
}

export function LoadingScreen({ message = 'Loading workspace…' }: { message?: string }) {
  return <div className="center-screen"><div className="loading-spinner" /><p>{message}</p></div>
}

export function SessionFailure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="center-screen">
      <div className="session-error"><span className="error-icon">!</span><h1>Session unavailable</h1><p>{message}</p><Button onClick={retry}>Try again</Button></div>
    </div>
  )
}

export function SectionTabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: { label: string; value: string }[]
  active: string
  onSelect: (value: string) => void
}) {
  return (
    <div className="section-tabs" role="tablist">
      {tabs.map((tab) => <button key={tab.value} type="button" role="tab" aria-selected={active === tab.value} className={active === tab.value ? 'tab-active' : ''} onClick={() => onSelect(tab.value)}>{tab.label}</button>)}
    </div>
  )
}

export function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  return (
    <div className="pagination">
      <span>Page {page} of {pageCount}</span>
      <div><button className="icon-button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button><button className="icon-button" disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button></div>
    </div>
  )
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="empty-state"><span><Command size={20} /></span><strong>{title}</strong><p>{message}</p></div>
}

export function AppLink({ to, children }: { to: string; children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  return <button className="text-link" type="button" onClick={() => { navigate(to); if (location.pathname === to) window.scrollTo({ top: 0, behavior: 'smooth' }) }}>{children}</button>
}
