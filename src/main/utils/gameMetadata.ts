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
    return slots
}
