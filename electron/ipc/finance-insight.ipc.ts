import {
  loadFinanceInsightData,
  type FinanceInsightLoadInput,
} from '../finance-insight/finance-insight.repository.js'
import { handleIpc } from './ipc-handler.js'

export function registerFinanceInsightIpc(): void {
  handleIpc('finance-insight:load', (_e, input: FinanceInsightLoadInput) =>
    loadFinanceInsightData(input),
  )
}
