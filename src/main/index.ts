import { app, BrowserWindow, globalShortcut, screen } from 'electron'
import { join } from 'path'
import { debugLog, debugError } from './debug/debug'
import * as overlay from './windows/overlay/overlay'
import * as loading from './windows/loading/loading'
import * as mainApp from './windows/main/main'
import { keymaps } from './keymaps/keymaps'

export let appWindow: BrowserWindow | null = null
export let overlayWindow: BrowserWindow | null = null
export let loadingWindow: BrowserWindow | null = null

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  appWindow = new BrowserWindow({
    width: (process.env.WINDOWED_BORDERLESS === 'true' ? width : 800),
    height: (process.env.WINDOWED_BORDERLESS === 'true' ? height : 600),
    frame: process.env.WINDOWED_BORDERLESS !== 'true',
    resizable: process.env.WINDOWED_BORDERLESS !== 'true',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  debugLog('Main Window created.')

  appWindow.loadURL(
    `${process.env['ELECTRON_RENDERER_URL']}/src/windows/main/main.html`
  );
  overlayWindow = overlay.createOverlay(appWindow)
  loadingWindow = loading.createLoading(appWindow)
}

async function main(): Promise<void> {
  process.env.DEBUG_MODE = 'true'
  process.env.WINDOWED_BORDERLESS = 'false'
  process.env.OVERLAY = 'false'
  process.env.LOADING = 'false'
  await app.whenReady()

  globalShortcut.register(keymaps.overlay, () => {
    overlay.toggleOverlay()
  })
  globalShortcut.register(keymaps.loading, () => {
    loading.toggleLoading()
  })
  createWindow()

  // Ejemplo: Añadir iconos a mainOptions
  setTimeout(() => {
    mainApp.addMainIcon({ id: 'settings', icon: 'mdi:cog', label: 'Configuración' })
    debugLog('Icono añadido: Configuración')
  }, 2000)

  setTimeout(() => {
    mainApp.addMainIcon({ id: 'folder', icon: 'mdi:folder', label: 'Carpetas' })
    debugLog('Icono añadido: Carpetas')
  }, 3000)

  setTimeout(() => {
    mainApp.addMainIcon({ id: 'notifications', icon: 'mdi:bell', label: 'Notificaciones' })
    debugLog('Icono añadido: Notificaciones')
  }, 4000)

  // Ejemplo: Añadir iconos a socialOptions
  setTimeout(() => {
    mainApp.addSocialIcon({ id: 'friends', icon: 'mdi:account-group', label: 'Amigos' })
    debugLog('Icono añadido: Amigos')
  }, 5000)

  setTimeout(() => {
    mainApp.addSocialIcon({ id: 'messages', icon: 'mdi:message', label: 'Mensajes' })
    debugLog('Icono añadido: Mensajes')
  }, 6000)
}
main().catch((error) => {
  debugError(error)
})
