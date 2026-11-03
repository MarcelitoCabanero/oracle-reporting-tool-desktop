import { BrowserWindow, ipcMain } from 'electron'
import { loadScPwd } from '../sc-pwd/sc-pwd.repository.js'
import { exportScPwdExcel, exportScPwdPdf } from '../sc-pwd/sc-pwd.export.js'
export function registerScPwdIpc(){ipcMain.handle('sc-pwd:generate',(_e,input)=>loadScPwd(input));ipcMain.handle('sc-pwd:export-excel',(e,input)=>exportScPwdExcel(input,BrowserWindow.fromWebContents(e.sender)??undefined));ipcMain.handle('sc-pwd:export-pdf',(e,input)=>exportScPwdPdf(input,BrowserWindow.fromWebContents(e.sender)??undefined))}
