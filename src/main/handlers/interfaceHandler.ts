import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import { interfaceSettings, saveInterfaceSettings } from '../settings/interfaceSettings'
import { InterfaceSettings, AppTheme } from '../../shared/types'

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

  ipcMain.handle('theme-import-file', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Seleccionar archivo de Tema (.css)',
        filters: [{ name: 'Temas LaLa Hub', extensions: ['css'] }],
        properties: ['openFile']
      })
      if (canceled || filePaths.length === 0) return null

      const content = fs.readFileSync(filePaths[0], 'utf-8')
      const theme: AppTheme = {
        id: 'theme_' + Date.now(),
        name: 'Tema Importado',
        colors: {},
        customCss: content
      }

      // Parse metadata from comments: @name: Value
      const metadataRegex = /@(\w+):\s*(.+)/g
      let match
      while ((match = metadataRegex.exec(content)) !== null) {
        const key = match[1]
        const value = match[2].trim()
        if (key === 'name') theme.name = value
        if (key === 'author') theme.author = value
        if (key === 'description') theme.description = value
        if (key === 'backgroundImage') theme.backgroundImage = value
      }

      // Parse CSS variables to populate color picker
      const varRegex = /^\s*(--[\w-]+)\s*:\s*([^;]+);/gm
      while ((match = varRegex.exec(content)) !== null) {
        const key = match[1]
        const value = match[2].trim()
        theme.colors[key] = value
      }

      return theme
    } catch (error) {
      console.error('[InterfaceHandler] Error importing theme:', error)
      return { error: String(error) }
    }
  })
}

