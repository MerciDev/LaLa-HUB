import { ipcMain } from 'electron'
import { loadSlots } from '../utils/storage'
import { formatPlaytime } from '../utils/playtime'
import { debugLog } from '../utils/debug'

/**
 * Registers IPC handlers related to playtime queries.
 * Call once during app initialization.
 */
export function registerPlaytimeHandlers(): void {
    /**
     * Returns total playtimeMinutes and a formatted string for a given slot.
     * Renderer: window.api.playtime.get(slotId)
     */
    ipcMain.handle('playtime-get', async (_, slotId: string) => {
        const slots = loadSlots()
        const slot = slots.find(s => s.id === slotId)
        const minutes = slot?.game?.playtimeMinutes ?? 0
        debugLog(`[Playtime] Query for ${slotId}: ${minutes} min`)
        return {
            minutes,
            formatted: formatPlaytime(minutes)
        }
    })

    /**
     * Returns playtime for all slots at once (for batch display).
     * Renderer: window.api.playtime.getAll()
     */
    ipcMain.handle('playtime-get-all', async () => {
        const slots = loadSlots()
        return slots.map(slot => ({
            slotId: slot.id,
            name: slot.label,
            minutes: slot.game?.playtimeMinutes ?? 0,
            formatted: formatPlaytime(slot.game?.playtimeMinutes ?? 0)
        }))
    })
}
