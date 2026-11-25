import { BrowserWindow } from 'electron'
import { loginUser } from '../auth/auth.service.js'
import { handleIpc } from './ipc-handler.js'

export function registerAuthIpc() {
  console.log('Registering authentication IPC...')

  handleIpc(
    'auth:login',
    async (
      event,
      username: string,
      password: string,
    ) => {
      console.log(
        'IPC auth:login received:',
        username,
      )

      const result = await loginUser(
        username,
        password,
      )

      if (result.success) {
        const win = BrowserWindow.fromWebContents(event.sender) ?? BrowserWindow.getAllWindows()[0]
        if (win && !win.isDestroyed()) {
          win.maximize()
        }
      }

      return result
    },
  )
}