import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { debugError, debugLog } from './debug'
import { HomeSlot } from '../../shared/types'

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

export function saveSlots(slots: HomeSlot[]): void {
    saveJson(SLOTS_FOLDER, SLOTS_FILE, slots)
    debugLog(`[Storage] ${slots.length} slots guardados`)
}

export function loadSlots(): HomeSlot[] {
    const slots = readJson<HomeSlot[]>(SLOTS_FOLDER, SLOTS_FILE)
    if (slots) {
        debugLog(`[Storage] ${slots.length} slots cargados`)
        return slots
    }
    debugLog('[Storage] No se encontraron slots guardados, retornando array vacío')
    return []
}

export function addSlot(slot: HomeSlot): void {
    addMultipleSlots([slot])
}

export function addMultipleSlots(newSlots: HomeSlot[]): void {
    const slots = loadSlots()
    
    for (const slot of newSlots) {
        const existingIndex = slots.findIndex(s => s.id === slot.id)
        if (existingIndex >= 0) {
            slots[existingIndex] = slot
        } else {
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
