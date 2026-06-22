import { ipcMain } from 'electron'
import { Platform } from '../../shared/types'
import { loadPlatforms, savePlatform, removePlatform, loadSettings, saveSettings } from '../utils/settings'
import { debugLog } from '../utils/debug'
import { getUserId, isOnline } from '../utils/supabase'
import { fetchFromTable } from '../utils/supabaseData'

export function registerPlatformHandlers(): void {
  ipcMain.handle('platforms-get', async () => {
    const platforms = loadPlatforms()
    debugLog(`[Platforms] Loaded ${platforms.length} platforms`)
    return platforms
  })

  ipcMain.handle('platform-save', async (_, platform: Platform) => {
    savePlatform(platform)
    return { success: true }
  })

  ipcMain.handle('platform-remove', async (_, id: string) => {
    removePlatform(id)
    return { success: true }
  })

  ipcMain.handle('platforms-sync', async (_, options: { overwrite?: boolean } = {}) => {
    try {
      let apiPlatforms: Platform[] = []

      if (isOnline() && getUserId()) {
        const remotePlats = await fetchFromTable<any>('consoles')
        apiPlatforms = remotePlats.map((p: any) => ({
          id: p.id || p.name?.toLowerCase().replace(/\s+/g, '-'),
          name: p.name || '',
          image: p.image || p.background || '',
          company: p.company || p.manufacturer || p.brand || '',
          icon: p.icon || p.brandIcon || ''
        }))
      }

      if (apiPlatforms.length === 0) {
        const response = await fetch('http://localhost:3000/api/consoles')
        if (response.ok) {
          const data = await response.json() as Platform[]
          apiPlatforms = data.map(p => ({
            id: p.id,
            name: p.name,
            image: p.image || (p as any).background || '',
            company: p.company || (p as any).manufacturer || (p as any).brand || (p as any).fabricante || '',
            icon: p.icon || (p as any).brandIcon || (p as any).icono || ''
          }))
        }
      }

      const settings = loadSettings()
      debugLog(`[Platforms] Syncing ${apiPlatforms.length} platforms...`)

      if (options.overwrite) {
        settings.platforms = apiPlatforms
        debugLog('[Platforms] Overwrite mode: replaced local list')
      } else {
        if (!settings.platforms) settings.platforms = []
        for (const plat of apiPlatforms) {
          const idx = settings.platforms.findIndex(p => p.id === plat.id)
          if (idx >= 0) {
            settings.platforms[idx] = plat
          } else {
            settings.platforms.push(plat)
          }
        }
        debugLog('[Platforms] Merge mode: updated/added platforms')
      }
      saveSettings(settings)

      return { success: true, count: apiPlatforms.length }
    } catch (err) {
      debugLog(`[Platforms] Sync failed: ${err}`)
      return { success: false, error: String(err) }
    }
  })
}
