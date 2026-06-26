import { ipcMain } from 'electron'
import { HomeSlot } from '../../shared/types'
import { addSlot, loadSlots, saveSlots, removeSlot, loadAllLibrarySlots } from '../utils/storage'
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
  if (!syncAfterSlots) return
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
    saveSlots(slots)

    setGridItems(slots)

    syncSlotsToCloud()

    return { success: true }
  })

  ipcMain.handle('slot-remove', async (_, slotId: string) => {
    debugLog(`[Slots] Removing slot: ${slotId}`)
    removeSlot(slotId)

    const savedSlots = loadSlots()
    setGridItems(savedSlots)

    const userId = getUserId()
    if (userId) {
      if (slotId.startsWith('lib|')) {
        const gameId = slotId.split('|')[2]
        await deleteRemoteRecord('games', gameId)
      } else {
        await deleteRemoteRecord('slots', slotId)
      }
    }

    syncSlotsToCloud()
    return { success: true }
  })

  ipcMain.handle('slot-get-all', async () => {
    return loadAllLibrarySlots()
  })

  ipcMain.handle('slot-clear-all', async () => {
    debugLog('[Slots] Clearing grid layout')
    const current = loadSlots()
    saveSlots([])
    setGridItems([])

    const userId = getUserId()
    if (userId) {
      await Promise.all(current.map(slot => deleteRemoteRecord('slots', slot.id)))
    }

    syncSlotsToCloud()
    return { success: true }
  })
}
