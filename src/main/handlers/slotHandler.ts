import { ipcMain } from 'electron'
import { HomeSlot } from '../../shared/types'
import { addSlot, loadSlots } from '../utils/storage'
import { setGridItems } from '../windows/main/main'
import { processGameSlots } from '../utils/gameMetadata'
import { debugLog } from '../utils/debug'

/**
 * Registers IPC handlers related to game slot management
 * (add, remove, reorder).
 * Call once during app initialization.
 */
export function registerSlotHandlers(): void {
    /**
     * Adds (or updates) a slot and refreshes the renderer grid.
     * Renderer: window.api.slots.add(slot)
     */
    ipcMain.handle('slot-add', async (_, slot: HomeSlot) => {
        debugLog(`[Slots] Adding slot: ${slot.id}`)
        addSlot(slot)

        // Refresh grid with saved slots, then enrich metadata in background
        const savedSlots = loadSlots()
        setGridItems(savedSlots)

        // Non-blocking: fetch art / metadata if missing
        processGameSlots(savedSlots).then((enriched) => {
            setGridItems(enriched)
        })

        return { success: true }
    })

    /**
     * Adds multiple slots at once.
     */
    ipcMain.handle('slot-add-multiple', async (_, slots: HomeSlot[]) => {
        const { addMultipleSlots, loadSlots } = await import('../utils/storage')
        addMultipleSlots(slots)

        const savedSlots = loadSlots()
        setGridItems(savedSlots)

        return { success: true }
    })

    /**
     * Removes a slot by id and refreshes the renderer grid.
     * Renderer: window.api.slots.remove(id)
     */
    ipcMain.handle('slot-remove', async (_, slotId: string) => {
        debugLog(`[Slots] Removing slot: ${slotId}`)
        const { removeSlot } = await import('../utils/storage')
        removeSlot(slotId)

        const savedSlots = loadSlots()
        setGridItems(savedSlots)

        return { success: true }
    })
}
