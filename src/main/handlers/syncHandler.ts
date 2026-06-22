import { ipcMain, BrowserWindow } from 'electron'
import { triggerSync, getSyncStatus, setSyncMainWindow } from '../utils/syncEngine'

export function registerSyncHandlers(mainWindow: BrowserWindow | null): void {
  setSyncMainWindow(mainWindow)

  ipcMain.handle('sync-get-status', async () => {
    return getSyncStatus()
  })

  ipcMain.handle('sync-trigger', async () => {
    return await triggerSync()
  })
}
