import { ipcMain } from 'electron'
import { keymaps } from '../keymaps/keymaps'
import { saveJson } from '../utils/storage'
import { debugLog } from '../utils/debug'

/**
 * Registers IPC handlers for reading and saving key bindings.
 * Call once during app initialization.
 */
/**
 * Registers IPC handlers for reading and saving key bindings.
 * @param onUpdate Optional callback to notify changes (useful for refreshing global shortcuts).
 */
export function registerKeymapHandlers(onUpdate?: () => void): void {
    ipcMain.handle('keymaps-get', async () => {
        debugLog('[Keymaps] Returning current keymaps')
        return { ...keymaps }
    })

    ipcMain.handle('keymaps-save', async (_, updated: Record<string, string>) => {
        const allowedKeys = Object.keys(keymaps) as (keyof typeof keymaps)[]
        for (const key of allowedKeys) {
            if (updated[key] !== undefined) {
                (keymaps as Record<string, string>)[key] = updated[key]
            }
        }
        saveJson('config', 'keymaps', keymaps)
        debugLog('[Keymaps] Keymaps updated and saved')
        
        if (onUpdate) onUpdate()
        
        return { success: true }
    })
}
