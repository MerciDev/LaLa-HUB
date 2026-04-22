import { net } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { HomeSlot } from '../../shared/types'
import { ensureDirectory, saveSlots } from './storage'
import { debugLog, debugError } from './debug'

const API_BASE_URL = 'http://localhost:3000'

interface GameMetadata {
    id: string
    images: {
        square?: string
        cover?: string
        background?: string
    }
}
// ... (rest of file)



export async function fetchGameMetadata(gameId: string): Promise<GameMetadata | null> {
    return new Promise((resolve) => {
        const request = net.request(`${API_BASE_URL}/api/games/${gameId}`)

        request.on('response', (response) => {
            if (response.statusCode !== 200) {
                debugError(`[Metadata] API returned status ${response.statusCode} for game ${gameId}`)
                resolve(null)
                return
            }

            let data = ''
            response.on('data', (chunk) => {
                data += chunk.toString()
            })

            response.on('end', () => {
                try {
                    const json = JSON.parse(data)
                    resolve(json as GameMetadata)
                } catch (e) {
                    debugError(`[Metadata] Failed to parse JSON for game ${gameId}: ${e}`)
                    resolve(null)
                }
            })
        })

        request.on('error', (error) => {
            debugError(`[Metadata] Network error for game ${gameId}: ${error.message}`)
            resolve(null)
        })

        request.end()
    })
}

export async function downloadGameImage(urlPath: string, gameId: string): Promise<string | null> {
    const isAbsolute = urlPath.startsWith('http://') || urlPath.startsWith('https://')
    const fullUrl = isAbsolute ? urlPath : `${API_BASE_URL}${urlPath}`
    const firstLetter = gameId.charAt(0).toLowerCase()
    const fileName = path.basename(urlPath)

    // Ensure directory: resources/games/{firstLetter}
    const resourcesPath = ensureDirectory('resources')
    const gamesPath = path.join(resourcesPath, 'games')
    if (!fs.existsSync(gamesPath)) fs.mkdirSync(gamesPath)

    const letterPath = path.join(gamesPath, firstLetter)
    if (!fs.existsSync(letterPath)) fs.mkdirSync(letterPath)

    const filePath = path.join(letterPath, fileName)

    // Return existing path if file already exists
    if (fs.existsSync(filePath)) {
        // Use custom media protocol
        // filePath is userData/resources/games/z/file.webp
        // protocol expects media://games/z/file.webp which maps to userData/resources/games/z/file.webp
        // So we need relative path from 'resources'
        const relativePath = path.relative(path.join(resourcesPath), filePath)
        return `media://${relativePath.replace(/\\/g, '/')}`
    }

    return new Promise((resolve) => {
        const request = net.request(fullUrl)

        request.on('response', (response) => {
            if (response.statusCode !== 200) {
                debugError(`[Metadata] Image download failed ${response.statusCode} for ${fullUrl}`)
                resolve(null)
                return
            }

            const fileStream = fs.createWriteStream(filePath)
            // @ts-ignore: Electron IncomingMessage is a Readable stream
            response.pipe(fileStream)

            fileStream.on('finish', () => {
                fileStream.close()
                debugLog(`[Metadata] Downloaded image to ${filePath}`)
                const relativePath = path.relative(path.join(resourcesPath), filePath)
                resolve(`media://${relativePath.replace(/\\/g, '/')}`)
            })

            fileStream.on('error', (err) => {
                debugError(`[Metadata] File write error: ${err}`)
                resolve(null)
            })
        })

        request.on('error', (error) => {
            debugError(`[Metadata] Image request error: ${error.message}`)
            resolve(null)
        })

        request.end()
    })
}

export async function processGameSlots(slots: HomeSlot[]): Promise<HomeSlot[]> {
    let updated = false
    const newSlots = [...slots]

    for (let i = 0; i < newSlots.length; i++) {
        const slot = newSlots[i]

        // Only process slots with a game and without a squareImage
        // OR process even if it has one? User asked to "buscar en mi api", implying we should update.
        // But for performance, maybe check if we already have it? 
        // The user said "descargues las imagenes... guardes las imagenes en cache".
        // Let's check: if squareImage is set, we might assume it's done. 
        // BUT, if the file is missing locally, we should re-download.
        // For now, let's fetch if squareImage is missing.

        if (slot.game && slot.game.id) {
            // Only try to fetch metadata if squareImage is missing, AND if it is not a manually generated local ID
            if ((!slot.squareImage || !slot.backgroundImage) && !slot.game.id.startsWith('game-')) {
                debugLog(`[Metadata] Processing ${slot.game.id}...`)
                const metadata = await fetchGameMetadata(slot.game.id)

                if (metadata) {
                    // Update square/thumb image if missing
                    if (!slot.squareImage && (metadata.images.square || metadata.images.cover)) {
                        const imageUrl = metadata.images.square || metadata.images.cover || ''
                        const localPath = await downloadGameImage(imageUrl, slot.game.id)
                        if (localPath) {
                            slot.squareImage = localPath
                            updated = true
                            debugLog(`[Metadata] Updated slot ${slot.id} with square image`)
                        }

                        // Try to get thumbnail (convention: replace .webp with -thumb.webp)
                        const thumbUrl = imageUrl.replace('.webp', '-thumb.webp')
                        const localThumb = await downloadGameImage(thumbUrl, slot.game.id)
                        if (localThumb) {
                            slot.thumbImage = localThumb
                            updated = true
                            debugLog(`[Metadata] Updated slot ${slot.id} with thumb image`)
                        }
                    }

                    // Update background image if missing
                    if (!slot.backgroundImage && metadata.images.background) {
                        const bgUrl = metadata.images.background
                        const localBg = await downloadGameImage(bgUrl, slot.game.id + '-bg')
                        if (localBg) {
                            slot.backgroundImage = localBg
                            updated = true
                            debugLog(`[Metadata] Updated slot ${slot.id} with background image`)
                        }
                    }
                }
            }
        }
    }

    if (updated) {
        saveSlots(newSlots)
    }

    return newSlots
}
