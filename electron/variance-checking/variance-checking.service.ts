import { getVarianceReceipt, getVarianceRows } from './variance-checking.repository.js'
import type { VarianceCheckingInput, VarianceCheckingResult, VarianceReceiptInput, VarianceReceiptResult } from './variance-checking.types.js'
const DATE_PATTERN=/^\d{4}-\d{2}-\d{2}$/
export async function generateVarianceChecking(input: VarianceCheckingInput): Promise<VarianceCheckingResult> {
  validateDateRange(input)
  const rows=await getVarianceRows(input)
  const totals=rows.reduce((t,r)=>{t.gross+=r.gross;t.totalTender+=r.totalTender;t.variance+=r.variance;return t},{gross:0,totalTender:0,variance:0})
  return {success:true,message:rows.length===0?'No variance found for the selected date range.':`${rows.length} variance record(s) found.`,rows,totals}
}
export async function loadVarianceReceipt(input: VarianceReceiptInput): Promise<VarianceReceiptResult> {
  const checkNumber=input.checkNumber?.trim()
  if(!checkNumber) throw new Error('Check number is required.')
  if(!/^\d+$/.test(checkNumber)) throw new Error('Invalid check number.')
  const lines=await getVarianceReceipt(checkNumber)
  return {success:true,message:'Receipt loaded successfully.',checkNumber,lines}
}
function validateDateRange(input: VarianceCheckingInput){
  if(!DATE_PATTERN.test(input.dateFrom)||!DATE_PATTERN.test(input.dateTo)) throw new Error('Invalid date format. Expected YYYY-MM-DD.')
  if(input.dateFrom>input.dateTo) throw new Error('From date cannot be later than To date.')
}
