import { ipcMain } from 'electron'
import { interfaceSettings, saveInterfaceSettings } from '../settings/interfaceSettings'
import { InterfaceSettings } from '../../shared/types'

export function registerInterfaceHandlers(): void {
  ipcMain.handle('interface-settings-get', async () => {
    return interfaceSettings
  })

  ipcMain.handle('interface-settings-save', async (_, settings: InterfaceSettings) => {
    try {
      saveInterfaceSettings(settings)
      return { success: true }
    } catch (error) {
      console.error('[InterfaceHandler] Error saving settings:', error)
      return { success: false, error: String(error) }
    }
  })
}
