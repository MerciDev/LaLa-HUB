import fs from 'fs/promises'
import path from 'path'
import { debugLog, debugError } from './debug'
import { getUserId, getAuthenticatedClient } from './supabase'
import { USER_DATA_PATH, loadSlots } from './storage'
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

export function getSyncStatus(): SyncMeta {
  return syncStatus
}

export async function pushLibraryToCloud(): Promise<{ success: boolean; error?: string }> {
  const userId = getUserId()
  const client = await getAuthenticatedClient()
  if (!userId || !client) {
    return { success: false, error: 'Usuario no autenticado en Supabase' }
  }

  try {
    syncStatus.isSyncing = true
    mainWindow?.webContents.send('sync-status-changed', syncStatus)
    debugLog('[SyncEngine] Subiendo archivos locales de biblioteca a Supabase Storage...')
    
    // 1. Upload slots.json
    const slotsFilePath = path.join(USER_DATA_PATH, 'data', 'slots.json')
    try {
      const buffer = await fs.readFile(slotsFilePath)
      const storagePath = `${userId}/_library/slots.json`
      const { error } = await client.storage.from('game-library').upload(storagePath, buffer, {
        upsert: true,
        contentType: 'application/json'
      })
      if (error) throw error
    } catch (e: any) {
      debugLog(`[SyncEngine] Aviso: no se pudo subir slots.json (${e.message})`)
    }

    // 2. Upload consoles/*.json
    const consolesDir = path.join(USER_DATA_PATH, 'data', 'consoles')
    try {
      const entries = await fs.readdir(consolesDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.json')) continue
        const filePath = path.join(consolesDir, entry.name)
        const buffer = await fs.readFile(filePath)
        const storagePath = `${userId}/_library/consoles/${entry.name}`
        const { error } = await client.storage.from('game-library').upload(storagePath, buffer, {
          upsert: true,
          contentType: 'application/json'
        })
        if (error) throw error
      }
    } catch (e: any) {
      debugLog(`[SyncEngine] Aviso leyendo carpeta consoles (${e.message})`)
    }

    syncStatus.lastSyncAt = new Date().toISOString()
    syncStatus.isSyncing = false
    mainWindow?.webContents.send('sync-status-changed', syncStatus)
    debugLog('[SyncEngine] Subida de biblioteca completada.')
    return { success: true }
  } catch (error: any) {
    syncStatus.isSyncing = false
    mainWindow?.webContents.send('sync-status-changed', syncStatus)
    debugError(`[SyncEngine] Error al subir biblioteca: ${error.message}`)
    return { success: false, error: error.message || 'Error al subir a Supabase' }
  }
}

export async function pullLibraryFromCloud(): Promise<{ success: boolean; error?: string }> {
  const userId = getUserId()
  const client = await getAuthenticatedClient()
  if (!userId || !client) {
    return { success: false, error: 'Usuario no autenticado en Supabase' }
  }

  try {
    syncStatus.isSyncing = true
    mainWindow?.webContents.send('sync-status-changed', syncStatus)
    debugLog('[SyncEngine] Descargando biblioteca desde Supabase Storage...')
    
    const dataDir = path.join(USER_DATA_PATH, 'data')
    const consolesDir = path.join(dataDir, 'consoles')
    await fs.mkdir(consolesDir, { recursive: true })

    // 1. Download slots.json
    try {
      const storagePath = `${userId}/_library/slots.json`
      const { data: blob, error } = await client.storage.from('game-library').download(storagePath)
      if (!error && blob) {
        const arrayBuf = await blob.arrayBuffer()
        await fs.writeFile(path.join(dataDir, 'slots.json'), Buffer.from(arrayBuf))
      }
    } catch (e: any) {
      debugLog(`[SyncEngine] Aviso descargando slots.json (${e.message})`)
    }

    // 2. Download consoles/*.json
    try {
      const listPath = `${userId}/_library/consoles`
      const { data: fileList, error: listError } = await client.storage.from('game-library').list(listPath)
      if (!listError && fileList) {
        for (const f of fileList) {
          if (!f.name?.endsWith('.json')) continue
          const storagePath = `${listPath}/${f.name}`
          const { data: blob, error } = await client.storage.from('game-library').download(storagePath)
          if (!error && blob) {
            const arrayBuf = await blob.arrayBuffer()
            await fs.writeFile(path.join(consolesDir, f.name), Buffer.from(arrayBuf))
          }
        }
      }
    } catch (e: any) {
      debugLog(`[SyncEngine] Aviso descargando consolas (${e.message})`)
    }

    syncStatus.lastSyncAt = new Date().toISOString()
    syncStatus.isSyncing = false
    mainWindow?.webContents.send('sync-status-changed', syncStatus)
    debugLog('[SyncEngine] Descarga de biblioteca completada.')
    return { success: true }
  } catch (error: any) {
    syncStatus.isSyncing = false
    mainWindow?.webContents.send('sync-status-changed', syncStatus)
    debugError(`[SyncEngine] Error al descargar biblioteca: ${error.message}`)
    return { success: false, error: error.message || 'Error al descargar de Supabase' }
  }
}

export async function triggerSync(): Promise<{ success: boolean; error?: string }> {
  return await pushLibraryToCloud()
}

export function initSyncEngine(): void {
  setSlotSyncCallback(async () => {
    // We can auto trigger if autoSync is enabled
  })
}
