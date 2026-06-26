import * as fs from 'fs'
import * as path from 'path'
import { app, ipcMain } from 'electron'
import { debugLog, debugError } from '../utils/debug'

const ARTWORK_DIR_NAME = 'resources/artwork'

function ensureArtworkDir(): string {
    const artDir = path.join(app.getPath('userData'), ARTWORK_DIR_NAME)
    if (!fs.existsSync(artDir)) {
        fs.mkdirSync(artDir, { recursive: true })
    }
    return artDir
}

/**
 * Copies a user-selected image into <userData>/resources/artwork/
 * and returns a media:// URL that the renderer can use directly.
 *
 * Renderer: window.api.artwork.import(srcPath)
 */
export function registerArtworkHandlers(): void {
    ipcMain.handle('artwork-import', async (_, srcPath: string) => {
        if (!fs.existsSync(srcPath)) {
            debugError(`[Artwork] Source file not found: ${srcPath}`)
            return { success: false, url: null }
        }

        try {
            const artDir = ensureArtworkDir()
            const ext = path.extname(srcPath).toLowerCase()
            const fileName = `custom-${Date.now()}${ext}`
            const destPath = path.join(artDir, fileName)

            fs.copyFileSync(srcPath, destPath)
            debugLog(`[Artwork] Copied to: ${destPath}`)

            // Return a media:// URL consistent with the existing protocol handler
            const mediaUrl = `media://artwork/${fileName}`
            return { success: true, url: mediaUrl, localPath: destPath }
        } catch (err) {
            debugError(`[Artwork] Copy failed: ${err}`)
            return { success: false, url: null }
        }
    })
}
