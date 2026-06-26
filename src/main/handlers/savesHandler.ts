import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { SaveFileInfo } from '../../shared/types'
import { debugLog, debugError } from '../utils/debug'
import { loadSlots } from '../utils/storage'
import { pushSaveToCloud, pullSaveFromCloud, deleteSaveFromCloud } from '../utils/cloudSaves'

function getDescPath(savePath: string): string {
    const dir = path.dirname(savePath)
    const base = path.basename(savePath, path.extname(savePath))
    return path.join(dir, `${base}_desc.txt`)
}

async function readDescription(savePath: string): Promise<string | undefined> {
    const descPath = getDescPath(savePath)
    try {
        const content = await fs.readFile(descPath, 'utf-8')
        return content.trim() || undefined
    } catch {
        return undefined
    }
}

export function registerSavesHandlers(): void {
    ipcMain.handle('saves-push-cloud', async (_, slotId: string, overrides?: { savesPath?: string; savesExtension?: string }) => {
        const slots = loadSlots()
        const slot = slots.find(s => s.id === slotId)
        if (!slot) return { success: false, error: 'Juego no encontrado' }
        return pushSaveToCloud(slot, overrides)
    })

    ipcMain.handle('saves-pull-cloud', async (_, slotId: string, overrides?: { savesPath?: string; savesExtension?: string }) => {
        const slots = loadSlots()
        const slot = slots.find(s => s.id === slotId)
        if (!slot) return { success: false, error: 'Juego no encontrado' }
        return pullSaveFromCloud(slot, true, overrides)
    })

    ipcMain.handle('saves-get-files', async (_, dirPath: string, extension?: string): Promise<SaveFileInfo[]> => {
        if (!dirPath) return []
        try {
            debugLog(`[SavesHandler] Scanning dir: ${dirPath} for ext: ${extension || 'ALL'}`)
            const entries = await fs.readdir(dirPath, { withFileTypes: true })
            const files: SaveFileInfo[] = []

            const exts = extension 
                ? extension.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
                : []

            for (const entry of entries) {
                if (!entry.isFile()) continue
                const filename = entry.name
                if (filename.endsWith('_desc.txt')) continue
                if (exts.length > 0) {
                    const extMatch = exts.some(e => filename.toLowerCase().endsWith(e.startsWith('.') ? e : `.${e}`))
                    if (!extMatch) continue
                }

                const fullPath = path.join(dirPath, filename)
                try {
                    const stat = await fs.stat(fullPath)
                    const d = new Date(stat.mtimeMs)
                    const formattedDate = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    const description = await readDescription(fullPath)
                    files.push({
                        filename,
                        path: fullPath,
                        sizeBytes: stat.size,
                        modifiedTime: stat.mtimeMs,
                        formattedDate,
                        description
                    })
                } catch {
                    // Ignore inaccessible files
                }
            }

            files.sort((a, b) => b.modifiedTime - a.modifiedTime)
            debugLog(`[SavesHandler] Found ${files.length} matching save files`)
            return files
        } catch (error: any) {
            debugError(`[SavesHandler] Failed to scan saves: ${error.message}`)
            return []
        }
    })

    ipcMain.handle('saves-save-description', async (_, savePath: string, description: string): Promise<{ success: boolean }> => {
        try {
            const descPath = getDescPath(savePath)
            if (description.trim()) {
                await fs.writeFile(descPath, description.trim(), 'utf-8')
            } else {
                try { await fs.unlink(descPath) } catch {}
            }
            return { success: true }
        } catch (error: any) {
            debugError(`[SavesHandler] Failed to save description: ${error.message}`)
            return { success: false }
        }
    })

    ipcMain.handle('saves-delete-file', async (_, savePath: string): Promise<{ success: boolean }> => {
        try {
            await fs.unlink(savePath)
            const descPath = getDescPath(savePath)
            try { await fs.unlink(descPath) } catch {}
            return { success: true }
        } catch (error: any) {
            debugError(`[SavesHandler] Failed to delete save: ${error.message}`)
            return { success: false }
        }
    })

    ipcMain.handle('saves-delete-cloud', async (_, slotId: string, filename: string): Promise<{ success: boolean; error?: string }> => {
        return deleteSaveFromCloud(slotId, filename)
    })
}
