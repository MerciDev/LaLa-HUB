import { ipcMain, BrowserWindow } from 'electron'
import { DownloadEntry } from '../../shared/types'
import {
  fetchSource,
  getSourcesConfig,
  getTasks,
  startDownload,
  cancelDownload,
  removeDownload,
  retryDownload,
  clearCompleted,
  loadTasks,
  setMainWindow,
  searchGameInSources
} from '../utils/downloadManager'

export function registerDownloadHandlers(mainWindow: BrowserWindow): void {
  setMainWindow(mainWindow)
  loadTasks()

  ipcMain.handle('download-search-sources', async (_, title: string) => {
    try {
      const results = await searchGameInSources(title)
      return { success: true, data: results }
    } catch (error: any) {
      return { success: false, error: error.message || String(error) }
    }
  })

  ipcMain.handle('download-get-sources-config', async () => {
    return getSourcesConfig()
  })

  ipcMain.handle('download-fetch-source', async (_, url: string) => {
    try {
      const data = await fetchSource(url)
      return { success: true, data }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('download-get-tasks', async () => {
    return getTasks()
  })

  ipcMain.handle('download-start', async (_, entry: DownloadEntry, sourceName: string) => {
    try {
      const task = await startDownload(entry, sourceName)
      return { success: true, task }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('download-cancel', async (_, id: string) => {
    cancelDownload(id)
    return { success: true }
  })

  ipcMain.handle('download-remove', async (_, id: string) => {
    removeDownload(id)
    return { success: true }
  })

  ipcMain.handle('download-retry', async (_, id: string) => {
    retryDownload(id)
    return { success: true }
  })

  ipcMain.handle('download-clear-completed', async () => {
    clearCompleted()
    return { success: true }
  })
}
