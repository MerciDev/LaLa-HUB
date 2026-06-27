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
    try {
        const { getGameById } = await import('./gameApi')
        const game = await getGameById(gameId)
        return game as GameMetadata
    } catch (e) {
        debugError(`[Metadata] Error fetching game by id from DB: ${e}`)
        return null
    }
}

export async function searchGameMetadata(query: string): Promise<GameMetadata | null> {
    try {
        const { searchGames } = await import('./gameApi')
        const { results } = await searchGames(query)
        if (results && results.length > 0) {
            return results[0] as GameMetadata
        }
        return null
    } catch (e) {
        debugError(`[Metadata] Error searching game from DB: ${e}`)
        return null
    }
}

function getTargetPath(gameId: string, urlPath: string): { resourcesPath: string; filePath: string; letterPath: string } {
    const firstLetter = gameId.charAt(0).toLowerCase()
    const fileName = path.basename(urlPath.split('?')[0]) // strip query params

    const resourcesPath = ensureDirectory('resources')
    const gamesPath = path.join(resourcesPath, 'games')
    if (!fs.existsSync(gamesPath)) fs.mkdirSync(gamesPath)

    const letterPath = path.join(gamesPath, firstLetter)
    if (!fs.existsSync(letterPath)) fs.mkdirSync(letterPath)

    const filePath = path.join(letterPath, fileName)
    return { resourcesPath, filePath, letterPath }
}

function toMediaUrl(resourcesPath: string, filePath: string): string {
    const relativePath = path.relative(resourcesPath, filePath)
    return `media://${relativePath.replace(/\\/g, '/')}`
}

export async function downloadGameImage(urlPath: string, gameId: string): Promise<string | null> {
    // Already cached — nothing to do
    if (urlPath.startsWith('media://')) return urlPath

    const { resourcesPath, filePath } = getTargetPath(gameId, urlPath)

    // Return existing cached file
    if (fs.existsSync(filePath)) {
        return toMediaUrl(resourcesPath, filePath)
    }

    // Handle file:/// — copy local file into cache
    if (urlPath.startsWith('file:///')) {
        try {
            const sourcePath = urlPath.startsWith('file:///')
                ? decodeURI(urlPath.slice(8)) // file:///C:/... → C:/...
                : decodeURI(urlPath.slice(7))  // file://C:/...
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, filePath)
                debugLog(`[Metadata] Copied local file to ${filePath}`)
                return toMediaUrl(resourcesPath, filePath)
            }
            debugError(`[Metadata] Local file not found: ${sourcePath}`)
        } catch (err) {
            debugError(`[Metadata] Error copying local file: ${err}`)
        }
        return null
    }

    // Build full URL
    const isAbsolute = urlPath.startsWith('http://') || urlPath.startsWith('https://')
    const fullUrl = isAbsolute ? urlPath : `${API_BASE_URL}${urlPath}`

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
                resolve(toMediaUrl(resourcesPath, filePath))
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

const SLOT_IMAGE_FIELDS: (keyof HomeSlot)[] = [
    'squareImage', 'thumbImage', 'backgroundImage', 'logoImage',
    'coverImage', 'verticalImage', 'horizontalImage', 'iconImage'
]

export async function processGameSlots(slots: HomeSlot[]): Promise<HomeSlot[]> {
    const updatedSlots: HomeSlot[] = []
    let changed = false

    for (const slot of slots) {
        const updatedSlot: HomeSlot = { ...slot }
        const rawGame: any = slot.game
        if (rawGame) {
            updatedSlot.game = { ...rawGame }
            if (rawGame.images) {
                ;(updatedSlot.game as any).images = { ...rawGame.images }
            }
        }

        // Download & cache top-level image fields
        for (const field of SLOT_IMAGE_FIELDS) {
            const url = updatedSlot[field]
            if (typeof url === 'string' && url.length > 0 && !url.startsWith('media://')) {
                const cached = await downloadGameImage(url, slot.id)
                if (cached) {
                    ;(updatedSlot as any)[field] = cached
                    changed = true
                }
            }
        }

        // Download & cache images inside game.images (added by normalizeGameForResponse)
        const gameImages: Record<string, string> | undefined = (updatedSlot.game as any)?.images
        if (gameImages) {
            const imageKeys = ['cover', 'square', 'vertical', 'horizontal', 'background', 'logo', 'icon']
            for (const key of imageKeys) {
                const url = gameImages[key]
                if (typeof url === 'string' && url.length > 0 && !url.startsWith('media://')) {
                    const cached = await downloadGameImage(url, slot.id)
                    if (cached) {
                        gameImages[key] = cached
                        changed = true
                    }
                }
            }
        }

        updatedSlots.push(updatedSlot)
    }

    if (changed) {
        saveSlots(updatedSlots)
        debugLog('[Metadata] Slots actualizados con imágenes cacheadas')
    }

    return updatedSlots
}
