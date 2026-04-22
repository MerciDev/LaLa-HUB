import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { AppSettings, Emulator } from '../../shared/types'
import { debugLog, debugError } from './debug'

const SETTINGS_FOLDER = 'config'
const SETTINGS_FILE = 'settings.json'

const DEFAULT_SETTINGS: AppSettings = {
    emulators: []
}

function getSettingsPath(): string {
    return path.join(app.getPath('userData'), SETTINGS_FOLDER, SETTINGS_FILE)
}

/**
 * Loads the full settings object from disk.
 * Returns default settings if the file doesn't exist or is invalid.
 */
export function loadSettings(): AppSettings {
    const filePath = getSettingsPath()
    if (!fs.existsSync(filePath)) {
        debugLog('[Settings] No settings file found, returning defaults')
        return { ...DEFAULT_SETTINGS }
    }
    try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as AppSettings
    } catch (err) {
        debugError(`[Settings] Failed to parse settings: ${err}`)
        return { ...DEFAULT_SETTINGS }
    }
}

/**
 * Persists the full settings object to disk.
 */
export function saveSettings(settings: AppSettings): void {
    const filePath = getSettingsPath()
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    try {
        fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8')
        debugLog('[Settings] Settings saved')
    } catch (err) {
        debugError(`[Settings] Failed to save settings: ${err}`)
    }
}

// ─── Emulator helpers ──────────────────────────────────────────────────────────

export function loadEmulators(): Emulator[] {
    return loadSettings().emulators
}

export function saveEmulator(emulator: Emulator): void {
    const settings = loadSettings()
    const idx = settings.emulators.findIndex(e => e.id === emulator.id)
    if (idx >= 0) {
        settings.emulators[idx] = emulator
        debugLog(`[Settings] Emulator updated: ${emulator.name}`)
    } else {
        settings.emulators.push(emulator)
        debugLog(`[Settings] Emulator added: ${emulator.name}`)
    }
    saveSettings(settings)
}

export function removeEmulator(id: string): void {
    const settings = loadSettings()
    settings.emulators = settings.emulators.filter(e => e.id !== id)
    saveSettings(settings)
    debugLog(`[Settings] Emulator removed: ${id}`)
}

// ─── RetroArch helpers ──────────────────────────────────────────────────────────

export function loadRetroArchSettings() {
    return loadSettings().retroarch
}

export function saveRetroArchSettings(retroarch: import('../../shared/types').RetroArchSettings): void {
    const settings = loadSettings()
    settings.retroarch = retroarch
    saveSettings(settings)
    debugLog('[Settings] RetroArch settings updated')
}
