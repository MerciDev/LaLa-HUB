import { debugLog, debugError } from './debug'
import { getUserId, isOnline, refreshSession } from './supabase'
import { upsertRecords, downloadRecords } from './supabaseData'
import { HomeSlot } from '../../shared/types'
import { loadSlots, saveSlots } from './storage'
import { BrowserWindow } from 'electron'
import { setSlotSyncCallback } from '../handlers/slotHandler'

interface SyncMeta {
  lastSyncAt: string | null
  pendingUploads: number
  isSyncing: boolean
}

let syncStatus: SyncMeta = {
  lastSyncAt: null,
  pendingUploads: 0,
  isSyncing: false
}

let mainWindow: BrowserWindow | null = null

export function setSyncMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}

function notifySyncStatus(): void {
  mainWindow?.webContents.send('sync-status-changed', syncStatus)
}

export function getSyncStatus(): SyncMeta {
  return syncStatus
}

async function uploadSlots(): Promise<number> {
  const localSlots = loadSlots()
  const records = localSlots.map(s => ({
    id: s.id,
    updatedAt: new Date().toISOString()
  }))
  if (records.length === 0) return 0
  const uploaded = await upsertRecords<{ id: string; updatedAt: string }>('slots', records)
  return uploaded
}

async function downloadSlots(): Promise<number> {
  const remoteSlots = await downloadRecords<HomeSlot>('slots')
  if (remoteSlots.length === 0) return 0

  const localSlots = loadSlots()
  const remoteMap = new Map<string, HomeSlot>()
  for (const slot of remoteSlots) {
    remoteMap.set(slot.id, slot)
  }

  let merged = 0
  for (const [id, remoteSlot] of remoteMap) {
    const localIdx = localSlots.findIndex(s => s.id === id)
    if (localIdx >= 0) {
      localSlots[localIdx] = remoteSlot
    } else {
      localSlots.push(remoteSlot)
    }
    merged++
  }

  saveSlots(localSlots)
  return merged
}

export async function triggerSync(): Promise<{ success: boolean; error?: string }> {
  debugLog('[Sync] Sincronización remota desactivada: guardando exclusivamente en local.')
  return { success: true }
}

export function initSyncEngine(): void {
  setSlotSyncCallback(async () => {
    await triggerSync()
  })
}
