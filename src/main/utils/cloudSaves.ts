import fs from 'fs/promises'
import path from 'path'
import { HomeSlot, SaveFileInfo } from '../../shared/types'
import { getAuthenticatedClient, getUserId } from './supabase'
import { debugLog, debugError } from './debug'
import { loadSlots } from './storage'

import AdmZip from 'adm-zip'
import os from 'os'

function getSafeSlotId(slot: HomeSlot | undefined, fallbackId: string): string {
    return slot?.game?.searchId || slot?.game?.id || fallbackId.replace(/\|/g, '-')
}

/** Helper to scan local save files matching extension */
export async function scanLocalSaves(dirPath: string, extension?: string): Promise<SaveFileInfo[]> {
    if (!dirPath) return []
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        const files: SaveFileInfo[] = []
        const exts = extension 
            ? extension.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
            : []

        for (const entry of entries) {
            if (!entry.isFile() && !entry.isDirectory()) continue
            const filename = entry.name
            if (exts.length > 0) {
                let extMatch = exts.some(e => filename.toLowerCase().endsWith(e.startsWith('.') ? e : `.${e}`))
                if (!extMatch && entry.isDirectory()) {
                    try {
                        const subEntries = await fs.readdir(path.join(dirPath, filename), { withFileTypes: true })
                        extMatch = subEntries.some(sub => sub.isFile() && exts.some(e => sub.name.toLowerCase().endsWith(e.startsWith('.') ? e : `.${e}`)))
                    } catch {
                        // Ignore read errors
                    }
                }
                if (!extMatch) continue
            }

            const fullPath = path.join(dirPath, filename)
            try {
                const stat = await fs.stat(fullPath)
                const d = new Date(stat.mtimeMs)
                const formattedDate = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                files.push({
                    filename,
                    path: fullPath,
                    sizeBytes: stat.size,
                    modifiedTime: stat.mtimeMs,
                    formattedDate
                })
            } catch {
                // Ignore inaccessible files
            }
        }

        files.sort((a, b) => b.modifiedTime - a.modifiedTime)
        return files
    } catch {
        return []
    }
}

/** Helper to get description file path for a save file */
function getDescPath(saveFilePath: string): string {
    const dir = path.dirname(saveFilePath)
    const base = path.basename(saveFilePath, path.extname(saveFilePath))
    return path.join(dir, `${base}_desc.txt`)
}

/** Upload a single file to Supabase Storage */
async function uploadFile(client: any, storagePath: string, filePath: string): Promise<void> {
    const buffer = await fs.readFile(filePath)
    const { error } = await client.storage.from('game-saves').upload(storagePath, buffer, {
        upsert: true,
        contentType: 'application/octet-stream'
    })
    if (error) throw error
}

/** Download a single file from Supabase Storage */
async function downloadFile(client: any, storagePath: string, destPath: string): Promise<void> {
    const { data: blob, error } = await client.storage.from('game-saves').download(storagePath)
    if (error || !blob) throw error || new Error('Error descargando archivo')
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await fs.writeFile(destPath, buffer)
}

/** Push the newest local save file to Supabase Storage */
export async function pushSaveToCloud(slot: HomeSlot, overrides?: { savesPath?: string; savesExtension?: string }): Promise<{ success: boolean; error?: string }> {
    const savesPath = overrides?.savesPath || slot.game?.savesPath
    if (!savesPath) return { success: false, error: 'No hay ruta de guardados configurada' }

    const userId = getUserId()
    const client = await getAuthenticatedClient()
    if (!userId || !client) {
        return { success: false, error: 'Usuario no autenticado en Supabase' }
    }

    try {
        const ext = overrides?.savesExtension || slot.game?.savesExtension
        const localFiles = await scanLocalSaves(savesPath, ext)
        if (localFiles.length === 0) {
            return { success: false, error: 'No se encontraron partidas locales para subir' }
        }

        const safeSlotId = getSafeSlotId(slot, slot.id)
        let count = 0

        for (const file of localFiles) {
            const stat = await fs.stat(file.path)
            const isDir = stat.isDirectory()
            
            let uploadPath = file.path
            let storageFilename = file.filename
            let tmpZipPath = ''

            if (isDir) {
                storageFilename = `${file.filename}.dir.zip`
                tmpZipPath = path.join(os.tmpdir(), storageFilename)
                const zip = new AdmZip()
                zip.addLocalFolder(file.path)
                zip.writeZip(tmpZipPath)
                uploadPath = tmpZipPath
            }

            const storagePath = `${userId}/${safeSlotId}/${storageFilename}`
            debugLog(`[CloudSaves] Uploading ${storageFilename} to cloud`)
            await uploadFile(client, storagePath, uploadPath)

            if (isDir && tmpZipPath) {
                try { await fs.unlink(tmpZipPath) } catch {}
            }

            // Also upload description file if it exists
            const descPath = getDescPath(file.path)
            try {
                await fs.access(descPath)
                const descStoragePath = `${userId}/${safeSlotId}/${path.basename(descPath)}`
                await uploadFile(client, descStoragePath, descPath)
            } catch {
                // No description file, that's fine
            }
            count++
        }

        debugLog(`[CloudSaves] Successfully uploaded ${count} files to cloud`)
        return { success: true }
    } catch (err: any) {
        debugError(`[CloudSaves] Push failed: ${err.message || err}`)
        return { success: false, error: err.message || 'Error al subir a la nube' }
    }
}

/** Pull save file from Supabase Storage and overwrite local disk */
export async function pullSaveFromCloud(slot: HomeSlot, force = false, overrides?: { savesPath?: string; savesExtension?: string }): Promise<{ success: boolean; error?: string }> {
    const savesPath = overrides?.savesPath || slot.game?.savesPath
    if (!savesPath) return { success: false, error: 'No hay ruta de guardados configurada' }

    const userId = getUserId()
    const client = await getAuthenticatedClient()
    if (!userId || !client) {
        return { success: false, error: 'Usuario no autenticado en Supabase' }
    }

    try {
        const safeSlotId = getSafeSlotId(slot, slot.id)
        const folderPath = `${userId}/${safeSlotId}`
        const { data: fileList, error: listError } = await client.storage.from('game-saves').list(folderPath)

        if (listError) throw listError
        if (!fileList || fileList.length === 0) {
            return { success: false, error: 'No hay partidas en la nube para este juego' }
        }

        const mainFiles = fileList.filter(f => !f.name.endsWith('_desc.txt'))
        let count = 0

        for (const remoteFile of mainFiles) {
            const remoteTimestamp = new Date(remoteFile.updated_at || remoteFile.created_at || 0).getTime()
            const isDirZip = remoteFile.name.endsWith('.dir.zip')
            
            const originalName = isDirZip ? remoteFile.name.replace('.dir.zip', '') : remoteFile.name
            const localDestPath = path.join(savesPath, originalName)

            if (!force) {
                try {
                    const stat = await fs.stat(localDestPath)
                    if (stat.mtimeMs >= remoteTimestamp - 2000) {
                        debugLog(`[CloudSaves] Local save ${originalName} is newer or equal. Skipping.`)
                        continue
                    }
                } catch {
                    // Local file doesn't exist, proceed with download
                }
            }

            await fs.mkdir(savesPath, { recursive: true })

            const storagePath = `${folderPath}/${remoteFile.name}`
            debugLog(`[CloudSaves] Downloading ${storagePath} from cloud...`)
            
            if (isDirZip) {
                const tmpZipPath = path.join(os.tmpdir(), remoteFile.name)
                await downloadFile(client, storagePath, tmpZipPath)
                const zip = new AdmZip(tmpZipPath)
                zip.extractAllTo(localDestPath, true)
                try { await fs.unlink(tmpZipPath) } catch {}
            } else {
                await downloadFile(client, storagePath, localDestPath)
            }

            // Also download description file if it exists in cloud
            const descFilename = `${path.basename(originalName, path.extname(originalName))}_desc.txt`
            const descStoragePath = `${folderPath}/${descFilename}`
            const descDestPath = path.join(savesPath, descFilename)
            try {
                await downloadFile(client, descStoragePath, descDestPath)
                debugLog(`[CloudSaves] Downloaded description ${descFilename} from cloud`)
            } catch {
                // Description file doesn't exist in cloud, that's fine
            }
            count++
        }

        debugLog(`[CloudSaves] Successfully downloaded ${count} cloud saves`)
        return { success: true }
    } catch (err: any) {
        debugError(`[CloudSaves] Pull failed: ${err.message || err}`)
        return { success: false, error: err.message || 'Error al descargar de la nube' }
    }
}

/** Delete a save file (and its description) from cloud storage */
export async function deleteSaveFromCloud(slotId: string, filename: string): Promise<{ success: boolean; error?: string }> {
    const userId = getUserId()
    const client = await getAuthenticatedClient()
    if (!userId || !client) {
        return { success: false, error: 'Usuario no autenticado en Supabase' }
    }

    try {
        const slots = loadSlots()
        const slot = slots.find(s => s.id === slotId)
        const safeSlotId = getSafeSlotId(slot, slotId)
        
        const basePath = `${userId}/${safeSlotId}`
        const pathsToDelete = [`${basePath}/${filename}`, `${basePath}/${filename}.dir.zip`]

        const base = path.basename(filename, path.extname(filename))
        pathsToDelete.push(`${basePath}/${base}_desc.txt`)

        const { error } = await client.storage.from('game-saves').remove(pathsToDelete)
        if (error) throw error

        debugLog(`[CloudSaves] Deleted ${pathsToDelete.join(', ')} from cloud`)
        return { success: true }
    } catch (err: any) {
        debugError(`[CloudSaves] Delete failed: ${err.message || err}`)
        return { success: false, error: err.message || 'Error al eliminar de la nube' }
    }
}
