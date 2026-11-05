import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import { AppLayout, LoadingScreen, SessionFailure } from './components'
import LoginPage from './pages/LoginPage'
import {
  DashboardPage,
  DepositPage,
  FinanceInsightPage,
  HourlySalesPage,
  InsightPage,
  MaintenancePage,
  MenuItemPage,
  PosJournalPage,
  ReportsPage,
  RofPage,
  SystemSalesPage,
  TransactionsPage,
} from './pages/Pages'

function PublicRoute() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen message="Checking your session…" />
  if (user) return <Navigate to="/dashboard" replace />
  return <LoginPage />
}

function ProtectedRoute() {
  const { user, loading, sessionError, refreshSession } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (sessionError) return <SessionFailure message={sessionError} retry={() => void refreshSession()} />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="finance-insight" element={<FinanceInsightPage />} />
          <Route path="insight" element={<InsightPage />} />
          <Route path="hourly-sales" element={<HourlySalesPage />} />
          <Route path="hourly-sales/:section" element={<HourlySalesPage />} />
          <Route path="system-sales" element={<SystemSalesPage />} />
          <Route path="system-sales/:view" element={<SystemSalesPage />} />
          <Route path="menu-item" element={<MenuItemPage />} />
          <Route path="pos-journal" element={<PosJournalPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="rof" element={<RofPage />} />
          <Route path="deposit" element={<DepositPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="tender-listing" element={<Navigate to="/system-sales/tender-listing" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
