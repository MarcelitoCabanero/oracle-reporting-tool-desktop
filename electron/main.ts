import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerAuthIpc } from './ipc/auth.ipc.js'
import {registerSystemIpc} from './ipc/system.ipc.js'
import { registerRofIpc } from './ipc/rof.ipc.js'
import {registerDepositIpc} from './ipc/deposit.ipc.js'
import { registerPosJournalIpc } from './ipc/pos-journal.ipc.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

function createWindow() {
 mainWindow = new BrowserWindow({
  width: 1440,
  height: 900,

  minWidth: 1024,
  minHeight: 700,

  webPreferences: {
    preload: path.join(
      __dirname,
      'preload.cjs',
    ),

    contextIsolation: true,
    nodeIntegration: false,
  },
})

  mainWindow.loadURL('http://localhost:5173')
}
ipcMain.handle('app:get-version', () => {
  return app.getVersion()
})

registerAuthIpc()
registerSystemIpc()
registerRofIpc()
registerDepositIpc()
registerPosJournalIpc()

ipcMain.handle('pos-journal:export-pdf', async (_event, checkNumber: string) => {
  if (!mainWindow) {
    throw new Error('Application window is not available.')
  }

  const safeCheckNumber = checkNumber.replace(/[^0-9]/g, '')
  const fileName = safeCheckNumber
    ? `Receipt_${safeCheckNumber}.pdf`
    : 'Receipt.pdf'

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export POS Journal PDF',
    defaultPath: fileName,
    filters: [{ name: 'PDF files', extensions: ['pdf'] }],
  })

  if (result.canceled || !result.filePath) {
    return {
      success: false,
      message: 'PDF export canceled.',
    }
  }

  const pdf = await mainWindow.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: {
      top: 0.35,
      bottom: 0.35,
      left: 0.35,
      right: 0.35,
    },
  })

  await fs.writeFile(result.filePath, pdf)

  return {
    success: true,
    message: 'Successfuly Expprted',
  }
})


app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})