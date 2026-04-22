import { ipcMain } from 'electron'
import { Emulator } from '../../shared/types'
import { loadEmulators, saveEmulator, removeEmulator } from '../utils/settings'
import { debugLog } from '../utils/debug'

/**
 * Registers IPC handlers for emulator management (Settings panel).
 * Call once during app initialization.
 */
export function registerEmulatorHandlers(): void {
    /** Returns all saved emulators. */
    ipcMain.handle('emulators-get', async () => {
        const emulators = loadEmulators()
        debugLog(`[Emulators] Loaded ${emulators.length} emulators`)
        return emulators
    })

    /** Adds or updates an emulator by id. */
    ipcMain.handle('emulator-save', async (_, emulator: Emulator) => {
        saveEmulator(emulator)
        return { success: true }
    })

    /** Removes an emulator by id. */
    ipcMain.handle('emulator-remove', async (_, id: string) => {
        removeEmulator(id)
        return { success: true }
    })
}
