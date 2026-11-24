import { generateVarianceChecking, loadVarianceReceipt } from '../variance-checking/variance-checking.service.js'
import type { VarianceCheckingInput, VarianceReceiptInput } from '../variance-checking/variance-checking.types.js'
import { handleIpc } from './ipc-handler.js'
export function registerVarianceCheckingIpc(){
  handleIpc('variance-checking:generate',async(_event,input:VarianceCheckingInput)=>generateVarianceChecking(input))
  handleIpc('variance-checking:receipt',async(_event,input:VarianceReceiptInput)=>loadVarianceReceipt(input))
}
