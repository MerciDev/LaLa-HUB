import fs from 'fs'
import path from 'path'
import { ipcMain } from 'electron'
import { loadRetroArchSettings, saveRetroArchSettings } from '../utils/settings'
import { debugLog, debugError } from '../utils/debug'
import { RetroArchSettings } from '../../shared/types'

export function registerRetroArchHandlers(): void {
    /** Returns current RetroArch settings. */
    ipcMain.handle('retroarch-get-settings', async () => {
        return loadRetroArchSettings()
    })

    /** Saves RetroArch settings (path, coresPath). */
    ipcMain.handle('retroarch-save-settings', async (_, settings: RetroArchSettings) => {
        saveRetroArchSettings(settings)
        return { success: true }
    })

    /**
     * Lists all available cores (*.dll on Windows, *.so on Linux) 
     * in the configured RetroArch cores directory.
     */
    ipcMain.handle('retroarch-get-cores', async () => {
        const settings = loadRetroArchSettings()
        if (!settings || !settings.coresPath || !fs.existsSync(settings.coresPath)) {
            debugLog('[RetroArch] Cores path not configured or missing')
            return []
        }

        try {
            const files = await fs.promises.readdir(settings.coresPath)
            // Filter by extension (libretro cores usually end with _libretro.[ext])
            const cores = files
                .filter(f => f.toLowerCase().endsWith('.dll') || f.toLowerCase().endsWith('.so'))
                .map(f => ({
                    filename: f,
                    name: f.replace('_libretro', '').replace('.dll', '').replace('.so', '').toUpperCase()
                }))
            
            debugLog(`[RetroArch] Found ${cores.length} cores`)
            return cores
        } catch (err: any) {
            debugError(`[RetroArch] Failed to list cores: ${err.message}`)
            return []
        }
    })
}
