import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { debugError, debugLog } from './debug'

// 1. Obtener la ruta base (Ej: /Users/marco/Library/Application Support/LaLa-HUB)
export const USER_DATA_PATH = app.getPath('userData')

// 2. Función para asegurar que una carpeta existe
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

// 3. Guardar un archivo JSON
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

// 4. Leer un archivo JSON
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
