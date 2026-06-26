import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { debugError, debugLog } from './debug'
import { HomeSlot, Game } from '../../shared/types'

export const USER_DATA_PATH = app.getPath('userData')

export function ensureDirectory(dirName: string): string {
    const dirPath = path.join(USER_DATA_PATH, dirName)

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
        debugLog(`[Storage] Carpeta creada: ${dirPath}`)
    }

    return dirPath
}

export function checkFileExists(folder: string, fileName: string): boolean {
    const filePath = path.join(USER_DATA_PATH, folder, `${fileName}.json`)
    return fs.existsSync(filePath)
}

export function saveJson(folder: string, fileName: string, data: any): void {
    const dirPath = ensureDirectory(folder)
    const filePath = path.join(dirPath, `${fileName}.json`)

    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
        debugLog(`[Storage] Archivo guardado: ${filePath}`)
    } catch (error) {
        debugError(`[Storage] Error guardando ${fileName}: ${error}`)
    }
}

export function readJson<T>(folder: string, fileName: string): T | null {
    const filePath = path.join(USER_DATA_PATH, folder, `${fileName}.json`)

    if (!fs.existsSync(filePath)) {
        return null
    }

    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        return JSON.parse(fileContent) as T
    } catch (error) {
        debugError(`[Storage] Error leyendo ${fileName}: ${error}`)
        return null
    }
}

const SLOTS_FOLDER = 'data'
const SLOTS_FILE = 'slots'
const CONSOLES_FOLDER = 'data/consoles'

function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || 'pc'
}

export function getConsoleSlug(game?: Game): string {
    if (!game) return 'pc'
    if (game.platform?.name) return slugify(game.platform.name)
    if (game.emulator?.name) return slugify(game.emulator.name)
    return 'pc'
}

export function saveSlots(slots: HomeSlot[]): void {
    const consoleGamesMap = new Map<string, Record<string, Game>>()
    const slotsToSave: HomeSlot[] = []

    for (const slot of slots) {
        const cleanSlot: HomeSlot = { ...slot }
        if (cleanSlot.game) {
            const slug = getConsoleSlug(cleanSlot.game)
            if (!consoleGamesMap.has(slug)) {
                const existing = readJson<{ console: string, games: Record<string, Game> }>(CONSOLES_FOLDER, slug)
                consoleGamesMap.set(slug, existing?.games || {})
            }
            const gamesRecord = consoleGamesMap.get(slug)!
            gamesRecord[cleanSlot.game.id] = cleanSlot.game

            cleanSlot.gameRef = { consoleSlug: slug, gameId: cleanSlot.game.id }
            delete cleanSlot.game
        }
        slotsToSave.push(cleanSlot)
    }

    for (const [slug, games] of consoleGamesMap.entries()) {
        saveJson(CONSOLES_FOLDER, slug, { console: slug, games })
    }

    saveJson(SLOTS_FOLDER, SLOTS_FILE, slotsToSave)
    debugLog(`[Storage] ${slots.length} slots guardados (con segregación por consola)`)
}

export function loadSlots(): HomeSlot[] {
    const rawSlots = readJson<HomeSlot[]>(SLOTS_FOLDER, SLOTS_FILE)
    if (!rawSlots) {
        debugLog('[Storage] No se encontraron slots guardados, retornando array vacío')
        return []
    }

    const consoleCache = new Map<string, Record<string, Game>>()
    const hydratedSlots: HomeSlot[] = []
    let needsMigrationSave = false

    for (const slot of rawSlots) {
        if (slot.game && !slot.gameRef) {
            needsMigrationSave = true
        } else if (slot.gameRef && !slot.game) {
            const slug = slot.gameRef.consoleSlug
            if (!consoleCache.has(slug)) {
                const consoleData = readJson<{ console: string, games: Record<string, Game> }>(CONSOLES_FOLDER, slug)
                consoleCache.set(slug, consoleData?.games || {})
            }
            const games = consoleCache.get(slug)!
            const game = games[slot.gameRef.gameId]
            if (game) {
                slot.game = game
            }
        }
        hydratedSlots.push(slot)
    }

    if (needsMigrationSave) {
        debugLog('[Storage] Detectados items con formato antiguo, ejecutando migración automática...')
        saveSlots(hydratedSlots)
    }

    debugLog(`[Storage] ${hydratedSlots.length} slots cargados e hidratados`)
    return hydratedSlots
}

export function loadAllLibrarySlots(): HomeSlot[] {
    const consolesDir = path.join(USER_DATA_PATH, CONSOLES_FOLDER)
    if (!fs.existsSync(consolesDir)) return []

    const librarySlots: HomeSlot[] = []
    const gridSlots = loadSlots()
    const gridMap = new Map<string, HomeSlot>()
    for (const s of gridSlots) {
        if (s.gameRef) gridMap.set(s.gameRef.gameId, s)
        else if (s.game) gridMap.set(s.game.id, s)
    }

    try {
        const files = fs.readdirSync(consolesDir)
        for (const file of files) {
            if (!file.endsWith('.json')) continue
            const slug = file.replace('.json', '')
            const consoleData = readJson<{ console: string, games: Record<string, Game> }>(CONSOLES_FOLDER, slug)
            if (consoleData && consoleData.games) {
                for (const [gameId, game] of Object.entries(consoleData.games)) {
                    const existingGridSlot = gridMap.get(gameId)
                    if (existingGridSlot) {
                        librarySlots.push(existingGridSlot)
                    } else {
                        const imgs = (game as any).data?.images || (game as any).images || {}
                        const sqImg = imgs.home || imgs.icon || game.coverUrl
                        const vImg = imgs.v_grid || imgs.home || game.coverUrl
                        const hImg = imgs.h_grid || imgs.home || game.backgroundUrl || game.coverUrl

                        librarySlots.push({
                            id: `lib-${slug}-${gameId}`,
                            label: game.name,
                            game: game,
                            gameRef: { consoleSlug: slug, gameId },
                            image: hImg || vImg || sqImg,
                            squareImage: sqImg,
                            verticalImage: vImg,
                            horizontalImage: hImg
                        })
                    }
                }
            }
        }
    } catch (err) {
        debugError(`[Storage] Error loading console library files: ${err}`)
    }

    return librarySlots
}

export function addSlot(slot: HomeSlot): void {
    addMultipleSlots([slot])
}

function findNextAvailablePosition(slots: HomeSlot[], cols = 6, rows = 4): { position: number, page: number } {
    let page = 0
    while (true) {
        const occupied = new Set<number>()
        for (const s of slots) {
            if (s.page === page && s.position !== undefined) {
                const cs = s.colSpan || 1
                const rs = s.rowSpan || 1
                for (let r = 0; r < rs; r++) {
                    for (let c = 0; c < cs; c++) {
                        occupied.add(s.position + r * cols + c)
                    }
                }
            }
        }
        for (let i = 0; i < (cols * rows); i++) {
            if (!occupied.has(i)) return { position: i, page }
        }
        page++ // All cells full on this page, try next one
    }
}

export function addMultipleSlots(newSlots: HomeSlot[]): void {
    const slots = loadSlots()
    
    for (const slot of newSlots) {
        const existingIndex = slots.findIndex(s => s.id === slot.id)
        if (existingIndex >= 0) {
            slots[existingIndex] = slot
        } else {
            // Assign position if missing (new slots)
            if (slot.position === undefined || slot.page === undefined) {
                const nextPos = findNextAvailablePosition(slots)
                slot.position = nextPos.position
                slot.page = nextPos.page
                debugLog(`[Storage] Auto-posicionado slot '${slot.label}' en Pag:${slot.page} Pos:${slot.position}`)
            }
            slots.push(slot)
        }
    }

    saveSlots(slots)
    debugLog(`[Storage] Procesados ${newSlots.length} slots (batch)`)
}

export function removeSlot(slotId: string): void {
    const slots = loadSlots()

    // Si se elimina desde la página de Biblioteca (id: lib-<console>-<gameId>)
    if (slotId.startsWith('lib-')) {
        const parts = slotId.split('-')
        const slug = parts[1]
        const targetGameId = parts.slice(2).join('-')

        const consolesDir = path.join(USER_DATA_PATH, CONSOLES_FOLDER)
        if (fs.existsSync(consolesDir)) {
            const consoleData = readJson<{ console: string, games: Record<string, Game> }>(CONSOLES_FOLDER, slug)
            if (consoleData && consoleData.games && consoleData.games[targetGameId]) {
                delete consoleData.games[targetGameId]
                saveJson(CONSOLES_FOLDER, slug, consoleData)
                debugLog(`[Storage] Juego eliminado de consola JSON (${slug}): ${targetGameId}`)
            }
        }

        // También eliminamos del grid los slots que hacían referencia a este juego de la biblioteca
        const filteredSlots = slots.filter(s => !(s.gameRef && s.gameRef.consoleSlug === slug && s.gameRef.gameId === targetGameId))
        saveSlots(filteredSlots)
        debugLog(`[Storage] Juego y sus referencias eliminados de la biblioteca: ${slotId}`)
        return
    }

    // Si se elimina un slot concreto de la cuadrícula principal (grid)
    const filteredSlots = slots.filter(s => s.id !== slotId)
    saveSlots(filteredSlots)
    debugLog(`[Storage] Slot eliminado exclusivamente del grid: ${slotId}`)
}
