import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  BarChart3, ChevronDown, ChevronRight, Clock3, FileBarChart,
  LayoutDashboard, LogOut, Menu, NotebookText, ReceiptText, Settings, ShieldCheck, WalletCards,
} from 'lucide-react'
import logo from '../../assets/jco-logo.png'
import type { Page } from '../../types/navigation'

interface SidebarProps {
  activePage: Page
  collapsed: boolean
  onNavigate: (page: Page) => void
  onLogout: () => void
}

interface NavItemProps {
  label: string
  page: Page
  icon: ReactNode
  activePage: Page
  collapsed: boolean
  onNavigate: (page: Page) => void
}

interface SidebarSectionProps {
  title: string
  collapsed: boolean
  defaultOpen?: boolean
  children: ReactNode
}

function NavItem({ label, page, icon, activePage, collapsed, onNavigate }: NavItemProps) {
  const active = activePage === page

  return (
    <button
      type="button"
      className={`sidebar-nav-item btn border-0 w-100 d-flex align-items-center gap-3 text-start rounded-3 px-3 py-2 ${active ? 'active' : ''}`}
      onClick={() => onNavigate(page)}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
    >
      <span className="d-flex align-items-center">{icon}</span>
      <span className="sidebar-item-label flex-grow-1">{label}</span>
    </button>
  )
}

function SidebarSection({ title, collapsed, defaultOpen = true, children }: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="sidebar-section-current mb-3">
      {!collapsed && (
        <button
          type="button"
          className="btn border-0 w-100 d-flex align-items-center justify-content-between px-3 py-1 text-secondary sidebar-section-title"
          onClick={() => setOpen((current) => !current)}
        >
          <span>{title}</span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      )}
      {(open || collapsed) && <div className="d-grid gap-1 mt-1">{children}</div>}
    </div>
  )
}

function Sidebar({ activePage, collapsed, onNavigate, onLogout }: SidebarProps) {
  return (
    <aside className={`app-sidebar bg-white border-end d-flex flex-column flex-shrink-0 ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand d-flex align-items-center gap-2 px-3 py-3 border-bottom">
        <img src={logo} alt="Oracle Reporting Tool" className="sidebar-logo" />
        <div className="sidebar-brand-copy lh-sm">
          <div className="fw-bold">Oracle</div>
          <small className="text-secondary">Reporting Tool</small>
        </div>
      </div>

      <nav className="sidebar-nav-current flex-grow-1 overflow-auto py-3 px-2">
        <SidebarSection title="DASHBOARD" collapsed={collapsed}>
          <NavItem label="Dashboard" page="dashboard" icon={<LayoutDashboard size={18} />} activePage={activePage} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem label="Finance Insight" page="finance-insight" icon={<BarChart3 size={18} />} activePage={activePage} collapsed={collapsed} onNavigate={onNavigate} />
        </SidebarSection>
        <SidebarSection title="REPORTS" collapsed={collapsed}>
          <NavItem label="Hourly Sales" page="hourly-sales" icon={<Clock3 size={18} />} activePage={activePage} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem label="System Sales" page="system-sales" icon={<FileBarChart size={18} />} activePage={activePage} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem label="Menu Item" page="menu-item" icon={<Menu size={18} />} activePage={activePage} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem label="POS Journal" page="pos-journal" icon={<NotebookText size={18} />} activePage={activePage} collapsed={collapsed} onNavigate={onNavigate} />
        </SidebarSection>
        <SidebarSection title="FINANCE" collapsed={collapsed}>
          <NavItem label="ROF" page="rof" icon={<ReceiptText size={18} />} activePage={activePage} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem label="Deposit Monitoring" page="deposit" icon={<WalletCards size={18} />} activePage={activePage} collapsed={collapsed} onNavigate={onNavigate} />
        </SidebarSection>
        <SidebarSection title="SYSTEM" collapsed={collapsed}>
          <NavItem label="Maintenance" page="maintenance" icon={<ShieldCheck size={18} />} activePage={activePage} collapsed={collapsed} onNavigate={onNavigate} />
          <NavItem label="Settings" page="settings" icon={<Settings size={18} />} activePage={activePage} collapsed={collapsed} onNavigate={onNavigate} />
        </SidebarSection>
      </nav>

      <div className="border-top p-2">
        <button type="button" className="sidebar-logout btn border-0 w-100 d-flex align-items-center gap-3 text-start rounded-3 px-3 py-2 text-danger" onClick={onLogout} title={collapsed ? 'Logout' : undefined}>
          <LogOut size={18} />
          <span className="sidebar-item-label">Logout</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
