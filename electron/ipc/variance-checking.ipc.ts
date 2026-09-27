import { ipcMain } from 'electron'
import { generateVarianceChecking, loadVarianceReceipt } from '../variance-checking/variance-checking.service.js'
import type { VarianceCheckingInput, VarianceReceiptInput } from '../variance-checking/variance-checking.types.js'
export function registerVarianceCheckingIpc(){
  ipcMain.handle('variance-checking:generate',async(_event,input:VarianceCheckingInput)=>generateVarianceChecking(input))
  ipcMain.handle('variance-checking:receipt',async(_event,input:VarianceReceiptInput)=>loadVarianceReceipt(input))
}
