import { BrowserWindow } from 'electron'
import { loadScPwd } from '../sc-pwd/sc-pwd.repository.js'
import { exportScPwdExcel, exportScPwdPdf } from '../sc-pwd/sc-pwd.export.js'
import { handleIpc } from './ipc-handler.js'
export function registerScPwdIpc(){handleIpc('sc-pwd:generate',(_e,input:Parameters<typeof loadScPwd>[0])=>loadScPwd(input));handleIpc('sc-pwd:export-excel',(e,input:Parameters<typeof exportScPwdExcel>[0])=>exportScPwdExcel(input,BrowserWindow.fromWebContents(e.sender)??undefined));handleIpc('sc-pwd:export-pdf',(e,input:Parameters<typeof exportScPwdPdf>[0])=>exportScPwdPdf(input,BrowserWindow.fromWebContents(e.sender)??undefined))}
