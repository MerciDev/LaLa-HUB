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
    const filteredSlots = slots.filter(s => s.id !== slotId)

    if (filteredSlots.length < slots.length) {
        saveSlots(filteredSlots)
        debugLog(`[Storage] Slot eliminado: ${slotId}`)
    } else {
        debugLog(`[Storage] Slot no encontrado: ${slotId}`)
    }
}
