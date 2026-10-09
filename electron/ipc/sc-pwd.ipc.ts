import { ipcMain } from 'electron'
import { loadScPwd } from '../sc-pwd/sc-pwd.repository.js'
export function registerScPwdIpc(){ipcMain.handle('sc-pwd:generate',(_e,input)=>loadScPwd(input))}
