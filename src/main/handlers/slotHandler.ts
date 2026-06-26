import { ipcMain } from 'electron'
import { HomeSlot } from '../../shared/types'
import { addSlot, loadSlots } from '../utils/storage'
import { setGridItems } from '../windows/main/main'
import { processGameSlots } from '../utils/gameMetadata'
import { debugLog } from '../utils/debug'
import { getUserId } from '../utils/supabase'
import { upsertRecords, deleteRemoteRecord } from '../utils/supabaseData'

let syncAfterSlots: (() => void) | null = null

export function setSlotSyncCallback(cb: () => void): void {
  syncAfterSlots = cb
}

async function syncSlotsToCloud(): Promise<void> {
  const userId = getUserId()
  if (!userId || !syncAfterSlots) return
  try {
    await syncAfterSlots()
  } catch { }
}

export function registerSlotHandlers(): void {
  ipcMain.handle('slot-add', async (_, slot: HomeSlot) => {
    debugLog(`[Slots] Adding slot: ${slot.id}`)
    addSlot(slot)

    const savedSlots = loadSlots()
    setGridItems(savedSlots)

    processGameSlots(savedSlots).then((enriched) => {
      setGridItems(enriched)
    })

    syncSlotsToCloud()

    return { success: true }
  })

  ipcMain.handle('slot-add-multiple', async (_, slots: HomeSlot[]) => {
    const { addMultipleSlots, loadSlots } = await import('../utils/storage')
    addMultipleSlots(slots)

    const savedSlots = loadSlots()
    setGridItems(savedSlots)

    syncSlotsToCloud()

    return { success: true }
  })

  ipcMain.handle('slot-remove', async (_, slotId: string) => {
    debugLog(`[Slots] Removing slot: ${slotId}`)
    const { removeSlot } = await import('../utils/storage')
    removeSlot(slotId)

    const savedSlots = loadSlots()
    setGridItems(savedSlots)

    const userId = getUserId()
    if (userId) {
      deleteRemoteRecord('slots', slotId)
    }

    return { success: true }
  })

  ipcMain.handle('slot-get-all', async () => {
    return loadSlots()
  })

  ipcMain.handle('slot-clear-all', async () => {
    debugLog('[Slots] Clearing all slots')
    const { saveSlots, loadSlots } = await import('../utils/storage')
    const current = loadSlots()
    saveSlots([])
    setGridItems([])

    const userId = getUserId()
    if (userId) {
      for (const slot of current) {
        deleteRemoteRecord('slots', slot.id)
      }
    }

    syncSlotsToCloud()
    return { success: true }
  })
}
