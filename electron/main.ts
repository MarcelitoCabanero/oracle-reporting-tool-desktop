import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import updater from 'electron-updater'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerAuthIpc } from './ipc/auth.ipc.js'
import {registerSystemIpc} from './ipc/system.ipc.js'
import { registerRofIpc } from './ipc/rof.ipc.js'
import {registerDepositIpc} from './ipc/deposit.ipc.js'
import {registerMenuItemIpc} from './ipc/menuitem.ipc.js'
import { registerPosJournalIpc } from './ipc/pos-journal.ipc.js'
import { registerTenderListingIpc } from './ipc/tender-listing.ipc.js'
import { registerMaintenanceIpc } from './ipc/maintenance.ipc.js'
import {registerSystemSalesIpc} from './ipc/system-sales.ipc.js'
import { registerVarianceCheckingIpc } from './ipc/variance-checking.ipc.js'
import { registerEmployeeSalesIpc } from './ipc/employee-sales.ipc.js'
import { registerHourlySalesIpc } from './ipc/hourly-sales.ipc.js'
import { syncPendingHourlyEntries } from './hourly-sales/hourly-sales.repository.js'
import { syncPendingSummaryInputs } from './hourly-sales/hourly-summary.repository.js'
import { registerScPwdIpc } from './ipc/sc-pwd.ipc.js'
import { registerSalesTargetIpc } from './ipc/sales-target.ipc.js'
import { registerFinanceInsightIpc } from './ipc/finance-insight.ipc.js'
import { registerDashboardIpc } from './ipc/dashboard.ipc.js'
import { registerSettingsIpc } from './ipc/settings.ipc.js'
import { registerVoidSummaryIpc } from './ipc/void-summary.ipc.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
const { autoUpdater } = updater
const updateCheckIntervalMs = 5 * 60 * 1000
let updateCheckInFlight = false

type AppUpdateStatus =
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error'
  | 'idle'

let appUpdateStatus: AppUpdateStatus = 'idle'
let updateFound = false

function sendUpdateStatus(status: AppUpdateStatus) {
  appUpdateStatus = status
  mainWindow?.webContents.send('app:update-status', status)
}

async function checkForUpdates() {
  if (
    !app.isPackaged ||
    updateCheckInFlight ||
    appUpdateStatus === 'available' ||
    appUpdateStatus === 'downloading' ||
    appUpdateStatus === 'ready'
  ) {
    return
  }

  updateCheckInFlight = true
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    console.error('Unable to check for application updates:', error)
    sendUpdateStatus(updateFound ? 'error' : 'idle')
  } finally {
    updateCheckInFlight = false
  }
}

function createWindow() {
 mainWindow = new BrowserWindow({
  width: 1440,
  height: 900,

  minWidth: 1024,
  icon: app.isPackaged
    ? path.join(process.resourcesPath, 'J-co_logo_updated.png')
    : path.join(app.getAppPath(), 'public', 'J-co_logo_updated.png'),
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

  if (app.isPackaged) {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  } else {
    void mainWindow.loadURL('http://localhost:5173')
  }
}
ipcMain.handle('app:get-version', () => {
  return app.getVersion()
})

ipcMain.handle('app:get-update-status', () => appUpdateStatus)

ipcMain.handle('app:install-update', () => {
  if (!app.isPackaged) {
    throw new Error('Application updates are only available in the installed app.')
  }

  autoUpdater.quitAndInstall(true, true)
})

ipcMain.handle('app:retry-update', async () => {
  if (!app.isPackaged || !updateFound) {
    throw new Error('There is no required application update to retry.')
  }

  await checkForUpdates()
})

registerAuthIpc()
registerSystemIpc()
registerRofIpc()
registerDepositIpc()
registerMenuItemIpc()
registerPosJournalIpc()
registerTenderListingIpc()
registerMaintenanceIpc()
registerSystemSalesIpc()
registerVarianceCheckingIpc()
registerEmployeeSalesIpc()
registerScPwdIpc()
registerSalesTargetIpc()
registerFinanceInsightIpc()
registerDashboardIpc()
registerVoidSummaryIpc()
registerSettingsIpc()
registerHourlySalesIpc()

function retryPendingHourlySync() {
  void syncPendingHourlyEntries().catch((error: unknown) => {
    console.error('Unable to check pending hourly entries for OracleDB synchronization.', error)
  })
  void syncPendingSummaryInputs().catch((error: unknown) => {
    console.error('Unable to check pending Donut summary input synchronization.', error)
  })
}

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
  app.setAppUserModelId('com.cfi.oracle-reporting-tool')
  createWindow()
  retryPendingHourlySync()
  setInterval(retryPendingHourlySync, 60_000)

  if (app.isPackaged) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.on('checking-for-update', () => {
      if (!updateFound) {
        sendUpdateStatus('checking')
      }
    })
    autoUpdater.on('update-available', () => {
      updateFound = true
      sendUpdateStatus('available')
    })
    autoUpdater.on('download-progress', () => sendUpdateStatus('downloading'))
    autoUpdater.on('update-downloaded', () => sendUpdateStatus('ready'))
    autoUpdater.on('update-not-available', () => {
      sendUpdateStatus(updateFound ? 'error' : 'idle')
    })
    autoUpdater.on('error', (error) => {
      console.error('Application update check failed:', error)
      sendUpdateStatus(updateFound ? 'error' : 'idle')
    })

    setTimeout(checkForUpdates, 3000)
    setInterval(checkForUpdates, updateCheckIntervalMs)
  }

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
