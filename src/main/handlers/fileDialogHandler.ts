import { ipcMain, dialog } from 'electron'
import { debugLog } from '../utils/debug'

/**
 * Registers IPC handlers related to native file dialogs.
 * Call once during app initialization.
 */
export function registerFileDialogHandlers(): void {
    /**
     * Opens a native file picker and returns the selected path (or null).
     * Renderer: window.api.browseFile(options)
     */
    ipcMain.handle('browse-file', async (_, options: Electron.OpenDialogOptions) => {
        debugLog(`[FileDialog] Opening dialog with filters: ${JSON.stringify(options.filters)}`)
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            ...options
        })
        if (canceled || filePaths.length === 0) {
            debugLog('[FileDialog] Dialog cancelled')
            return null
        }
        debugLog(`[FileDialog] Selected: ${filePaths[0]}`)
        return filePaths[0]
    })
}
