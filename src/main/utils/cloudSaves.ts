import fs from 'fs/promises'
import path from 'path'
import { HomeSlot, SaveFileInfo } from '../../shared/types'
import { getAuthenticatedClient, getUserId } from './supabase'
import { debugLog, debugError } from './debug'

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
            if (!entry.isFile()) continue
            const filename = entry.name
            if (exts.length > 0) {
                const extMatch = exts.some(e => filename.toLowerCase().endsWith(e.startsWith('.') ? e : `.${e}`))
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

        // Upload the newest file
        const newestFile = localFiles[0]
        const storagePath = `${userId}/${slot.id}/${newestFile.filename}`
        debugLog(`[CloudSaves] Uploading ${newestFile.filename} to cloud`)
        await uploadFile(client, storagePath, newestFile.path)

        // Also upload description file if it exists
        const descPath = getDescPath(newestFile.path)
        try {
            await fs.access(descPath)
            const descStoragePath = `${userId}/${slot.id}/${path.basename(descPath)}`
            debugLog(`[CloudSaves] Uploading description ${path.basename(descPath)} to cloud`)
            await uploadFile(client, descStoragePath, descPath)
        } catch {
            // No description file, that's fine
        }

        debugLog(`[CloudSaves] Successfully uploaded ${newestFile.filename} to cloud`)
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
        const folderPath = `${userId}/${slot.id}`
        const { data: fileList, error: listError } = await client.storage.from('game-saves').list(folderPath)

        if (listError) throw listError
        if (!fileList || fileList.length === 0) {
            return { success: false, error: 'No hay partidas en la nube para este juego' }
        }

        // Sort remote files by updated_at or created_at (newest first)
        fileList.sort((a, b) => {
            const timeA = new Date(a.updated_at || a.created_at || 0).getTime()
            const timeB = new Date(b.updated_at || b.created_at || 0).getTime()
            return timeB - timeA
        })

        const remoteFile = fileList[0]
        const remoteTimestamp = new Date(remoteFile.updated_at || remoteFile.created_at || 0).getTime()
        const localDestPath = path.join(savesPath, remoteFile.name)

        // Check local timestamp unless forced
        if (!force) {
            try {
                const stat = await fs.stat(localDestPath)
                if (stat.mtimeMs >= remoteTimestamp - 2000) {
                    debugLog(`[CloudSaves] Local save is newer or equal to remote save. Skipping download.`)
                    return { success: true }
                }
            } catch {
                // Local file doesn't exist, proceed with download
            }
        }

        await fs.mkdir(savesPath, { recursive: true })

        const storagePath = `${folderPath}/${remoteFile.name}`
        debugLog(`[CloudSaves] Downloading ${storagePath} from cloud...`)
        await downloadFile(client, storagePath, localDestPath)

        // Also download description file if it exists in cloud
        const descFilename = `${path.basename(remoteFile.name, path.extname(remoteFile.name))}_desc.txt`
        const descStoragePath = `${folderPath}/${descFilename}`
        const descDestPath = path.join(savesPath, descFilename)
        try {
            await downloadFile(client, descStoragePath, descDestPath)
            debugLog(`[CloudSaves] Downloaded description ${descFilename} from cloud`)
        } catch {
            // Description file doesn't exist in cloud, that's fine
        }

        debugLog(`[CloudSaves] Successfully downloaded cloud save to ${localDestPath}`)
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
        const basePath = `${userId}/${slotId}`
        const pathsToDelete = [`${basePath}/${filename}`]

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
