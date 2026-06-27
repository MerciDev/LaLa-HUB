import { ipcMain } from 'electron'
import { scanDirectoryForRoms } from '../utils/scanner'
import { Emulator } from '../../shared/types'
import { debugLog, debugError } from '../utils/debug'

export function registerScannerHandlers(): void {
    /**
     * Scans a directory and returns an array of HomeSlot objects.
     * Use window.api.scanner.scan(...)
     */
    ipcMain.handle('scanner-scan', async (_, { path, emulator, extensions, recursive }: { 
        path: string, 
        emulator: Emulator, 
        extensions: string[], 
        recursive: boolean 
    }) => {
        try {
            debugLog(`[Scanner] Starting scan in: ${path} for extensions: ${extensions.join(', ')}`)
            const slots = await scanDirectoryForRoms(path, emulator, extensions, recursive)
            debugLog(`[Scanner] Found ${slots.length} games.`)
            return { success: true, slots }
        } catch (error: any) {
            debugError(`[Scanner] Scan failed: ${error.message}`)
            return { success: false, error: error.message }
        }
    })
}
