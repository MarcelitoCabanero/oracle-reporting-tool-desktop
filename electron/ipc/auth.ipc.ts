import { loginUser } from '../auth/auth.service.js'
import { handleIpc } from './ipc-handler.js'

export function registerAuthIpc() {
  console.log('Registering authentication IPC...')

  handleIpc(
    'auth:login',
    async (
      _event,
      username: string,
      password: string,
    ) => {
      console.log(
        'IPC auth:login received:',
        username,
      )

      return loginUser(
        username,
        password,
      )
    },
  )
}