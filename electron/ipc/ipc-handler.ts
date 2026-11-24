import { ipcMain, type IpcMainInvokeEvent } from 'electron'

export interface IpcErrorResponse {
  success: false
  message: string
}

export function handleIpc<TArgs extends unknown[], TResult>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<TResult> | TResult,
): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    try {
      return await handler(event, ...(args as TArgs))
    } catch (error) {
      console.error(`IPC error [${channel}]:`, error)
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      } satisfies IpcErrorResponse
    }
  })
}
