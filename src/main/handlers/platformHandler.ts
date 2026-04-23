import { ipcMain } from 'electron'
import { Platform } from '../../shared/types'
import { loadPlatforms, savePlatform, removePlatform, clearPlatforms, loadSettings, saveSettings } from '../utils/settings'
import { debugLog } from '../utils/debug'

/**
 * Registers IPC handlers for platform management (Settings panel).
 * Call once during app initialization.
 */
export function registerPlatformHandlers(): void {
    /** Returns all saved platforms. */
    ipcMain.handle('platforms-get', async () => {
        const platforms = loadPlatforms()
        debugLog(`[Platforms] Loaded ${platforms.length} platforms`)
        return platforms
    })

    /** Adds or updates a platform by id. */
    ipcMain.handle('platform-save', async (_, platform: Platform) => {
        savePlatform(platform)
        return { success: true }
    })

    /** Removes a platform by id. */
    ipcMain.handle('platform-remove', async (_, id: string) => {
        removePlatform(id)
        return { success: true }
    })

    /** Syncs platforms from the external API. */
    ipcMain.handle('platforms-sync', async (_, options: { overwrite?: boolean } = {}) => {
        try {
            const response = await fetch('http://localhost:3000/api/consoles')
            if (!response.ok) throw new Error('Network response was not ok')
            const apiPlatforms = await response.json() as Platform[]
            
            const settings = loadSettings()
            debugLog(`[Platforms] Syncing ${apiPlatforms.length} platforms from API...`)
            
            if (apiPlatforms.length > 0) {
                debugLog(`[Platforms] Sample API Raw: ${JSON.stringify(apiPlatforms[0])}`)
            }

            // Map common API field variations to our internal Platform type
            const normalizedPlatforms = apiPlatforms.map(p => ({
                id: p.id,
                name: p.name,
                image: p.image || (p as any).background || '',
                company: p.company || (p as any).manufacturer || (p as any).brand || (p as any).fabricante || '',
                icon: p.icon || (p as any).brandIcon || (p as any).icono || ''
            }))

            if (apiPlatforms.length > 0) {
                debugLog(`[Platforms] Sample Normalized: ${JSON.stringify(normalizedPlatforms[0])}`)
            }

            if (options.overwrite) {
                settings.platforms = normalizedPlatforms
                debugLog('[Platforms] Overwrite mode: replaced local list')
            } else {
                if (!settings.platforms) settings.platforms = []
                for (const plat of normalizedPlatforms) {
                    const idx = settings.platforms.findIndex(p => p.id === plat.id)
                    if (idx >= 0) {
                        settings.platforms[idx] = plat
                    } else {
                        settings.platforms.push(plat)
                    }
                }
                debugLog(`[Platforms] Merge mode: updated/added platforms`)
            }
            saveSettings(settings)
            
            return { success: true, count: normalizedPlatforms.length }
        } catch (err) {
            debugLog(`[Platforms] Sync failed: ${err}`)
            return { success: false, error: String(err) }
        }
    })
}
