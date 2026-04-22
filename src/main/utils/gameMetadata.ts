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
        const url = `${API_BASE_URL}/api/games/${gameId}`
        const request = net.request(url)

        request.on('response', (response) => {
            if (response.statusCode !== 200) {
                // debugError(`[Metadata] API returned status ${response.statusCode} for game ${gameId}`)
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

export async function searchGameMetadata(query: string): Promise<GameMetadata | null> {
    return new Promise((resolve) => {
        const url = `${API_BASE_URL}/api/games/search?q=${encodeURIComponent(query)}`
        const request = net.request(url)

        request.on('response', (response) => {
            if (response.statusCode !== 200) {
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
                    if (json.results && json.results.length > 0) {
                        // Take the first result as best match
                        resolve(json.results[0] as GameMetadata)
                    } else {
                        resolve(null)
                    }
                } catch (e) {
                    resolve(null)
                }
            })
        })

        request.on('error', () => resolve(null))
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

        // Only process if missing images
        if (slot.game && (!slot.squareImage || !slot.backgroundImage)) {
            debugLog(`[Metadata] Processing ${slot.label} (ID: ${slot.game.id})...`)
            
            // 1. Try to fetch by exact ID
            let metadata = await fetchGameMetadata(slot.game.id)

            // 2. Fallback: Search by name if ID lookup failed (likely UUID or manual ID)
            if (!metadata) {
                debugLog(`[Metadata] ID not found, searching by name: "${slot.label}"`)
                metadata = await searchGameMetadata(slot.label)
                
                // If found by name, update the game ID to match API for future calls
                if (metadata && slot.game) {
                    debugLog(`[Metadata] Match found in API: ${metadata.id}. Rewriting slot ID.`)
                    slot.game.id = metadata.id
                    updated = true
                }
            }

            if (metadata) {
                // Update images if found
                const imageUrl = metadata.images.square || metadata.images.cover
                if (imageUrl && !slot.squareImage) {
                    const localPath = await downloadGameImage(imageUrl, slot.game.id)
                    if (localPath) {
                        slot.squareImage = localPath
                        updated = true
                        
                        // Try thumb
                        const thumbUrl = imageUrl.replace('.webp', '-thumb.webp')
                        const localThumb = await downloadGameImage(thumbUrl, slot.game.id)
                        if (localThumb) slot.thumbImage = localThumb
                    }
                }

                if (metadata.images.background && !slot.backgroundImage) {
                    const localBg = await downloadGameImage(metadata.images.background, slot.game.id + '-bg')
                    if (localBg) {
                        slot.backgroundImage = localBg
                        updated = true
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
