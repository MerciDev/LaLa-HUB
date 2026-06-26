import { ipcMain, BrowserWindow } from 'electron'
import { triggerSync, getSyncStatus, setSyncMainWindow, pushLibraryToCloud, pullLibraryFromCloud } from '../utils/syncEngine'
import { loadSlots } from '../utils/storage'
import { setGridItems } from '../windows/main/main'

export function registerSyncHandlers(mainWindow: BrowserWindow | null): void {
  setSyncMainWindow(mainWindow)

  ipcMain.handle('sync-get-status', async () => {
    return getSyncStatus()
  })

  ipcMain.handle('sync-trigger', async () => {
    return await triggerSync()
  })

  ipcMain.handle('sync-push-cloud', async () => {
    return await pushLibraryToCloud()
  })

  ipcMain.handle('sync-pull-cloud', async () => {
    const res = await pullLibraryFromCloud()
    if (res.success) {
      const savedSlots = loadSlots()
      setGridItems(savedSlots)
    }
    return res
  })
}
