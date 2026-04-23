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
        if (!slot.game) continue

        // 1. First, check if any existing image fields have remote 'http' URLs and download them
        const imageFields: (keyof HomeSlot)[] = [
            'squareImage', 'backgroundImage', 'logoImage', 'coverImage', 
            'verticalImage', 'horizontalImage', 'iconImage'
        ]

        for (const field of imageFields) {
            const val = slot[field]
            if (typeof val === 'string' && val.startsWith('http')) {
                debugLog(`[Metadata] Downloading remote ${field} for ${slot.label}...`)
                const local = await downloadGameImage(val, slot.game.id)
                if (local) {
                    (slot as any)[field] = local
                    updated = true
                }
            }
        }

        // 2. If essential images (square or background) are still missing, try fetching metadata
        if (!slot.squareImage || !slot.backgroundImage) {
            debugLog(`[Metadata] Missing essential images for ${slot.label}, fetching metadata...`)
            
            // Try by ID
            let metadata = await fetchGameMetadata(slot.game.id)

            // Fallback to Search by Name
            if (!metadata) {
                metadata = await searchGameMetadata(slot.label)
                if (metadata && slot.game) {
                    slot.game.id = metadata.id
                    updated = true
                }
            }

            if (metadata) {
                const imgs = metadata.images || {}
                
                // Square/Cover
                const imageUrl = imgs.square || imgs.cover
                if (imageUrl && (!slot.squareImage || slot.squareImage.startsWith('http'))) {
                    const local = await downloadGameImage(imageUrl, slot.game.id)
                    if (local) {
                        slot.squareImage = local
                        updated = true
                        
                        // Try thumb
                        const thumbUrl = imageUrl.replace('.webp', '-thumb.webp')
                        const localThumb = await downloadGameImage(thumbUrl, slot.game.id)
                        if (localThumb) slot.thumbImage = localThumb
                    }
                }

                // Background
                if (imgs.background && (!slot.backgroundImage || slot.backgroundImage.startsWith('http'))) {
                    const localBg = await downloadGameImage(imgs.background, slot.game.id + '-bg')
                    if (localBg) {
                        slot.backgroundImage = localBg
                        updated = true
                    }
                }

                // Optionally populate other missing fields from metadata
                const mapping: Record<string, keyof HomeSlot> = {
                    logo: 'logoImage',
                    vertical: 'verticalImage',
                    horizontal: 'horizontalImage',
                    icon: 'iconImage'
                }

                for (const [metaKey, slotKey] of Object.entries(mapping)) {
                    const url = (imgs as any)[metaKey]
                    if (url && !slot[slotKey]) {
                        const local = await downloadGameImage(url, slot.game.id + '-' + metaKey)
                        if (local) {
                            (slot as any)[slotKey] = local
                            updated = true
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
