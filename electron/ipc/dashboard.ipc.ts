import {
  loadDashboardData,
  type DashboardLoadInput,
} from '../dashboard/dashboard.repository.js'
import { handleIpc } from './ipc-handler.js'

export function registerDashboardIpc(): void {
  handleIpc('dashboard:load', (_e, input?: DashboardLoadInput) =>
    loadDashboardData(input),
  )
}
