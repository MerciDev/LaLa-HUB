import { app, BrowserWindow, globalShortcut, screen, ipcMain } from 'electron'
import { join } from 'path'
import { debugLog, debugError } from './debug/debug'
import * as overlay from './windows/overlay/overlay'
import * as loading from './windows/loading/loading'
import * as mainApp from './windows/main/main'
import { keymaps, createDebouncedToggle } from './keymaps/keymaps'

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
    autoHideMenuBar: process.env.DEBUG_MODE !== 'true',
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

export const debouncedToggleOverlay = createDebouncedToggle(overlay.toggleOverlay);
export const debouncedToggleLoading = createDebouncedToggle(loading.toggleLoading);

async function main(): Promise<void> {
  process.env.DEBUG_MODE = 'true'
  process.env.WINDOWED_BORDERLESS = 'false'
  process.env.OVERLAY = 'false'
  process.env.LOADING = 'false'
  await app.whenReady()

  globalShortcut.register(keymaps.overlay, () => {
    debouncedToggleOverlay();
  })
  globalShortcut.register(keymaps.loading, () => {
    debouncedToggleLoading();
  })
  createWindow()

  appWindow?.webContents.on('did-finish-load', () => {
    mainApp.addMainIcon({
      id: 'home',
      icon: 'mynaui:home-solid',
      label: 'Inicio',
      onClick: 'click-home',
      onMouseEnter: 'mouse-enter-home',
      onMouseLeave: 'mouse-leave-home'
    })
    mainApp.addMainIcon({
      id: 'settings',
      icon: 'mynaui:cog-four',
      label: 'Configuración',
      onClick: 'click-settings',
      onMouseEnter: 'mouse-enter-settings',
      onMouseLeave: 'mouse-leave-settings'
    })
    mainApp.addMainIcon({
      id: 'add',
      icon: 'mynaui:plus-square',
      label: 'Agregar Juego',
      onClick: 'click-add',
      onMouseEnter: 'mouse-enter-add',
      onMouseLeave: 'mouse-leave-add'
    })

    mainApp.addSocialIcon({
      id: 'profile',
      icon: 'mynaui:user',
      label: 'Perfil',
      onClick: 'click-profile',
      onMouseEnter: 'mouse-enter-profile',
      onMouseLeave: 'mouse-leave-profile'
    })
    mainApp.addSocialIcon({
      id: 'friends',
      icon: 'mynaui:users-group',
      label: 'Amigos',
      onClick: 'click-friends',
      onMouseEnter: 'mouse-enter-friends',
      onMouseLeave: 'mouse-leave-friends'
    })
    mainApp.addSocialIcon({
      id: 'trophies',
      icon: 'mynaui:star',
      label: 'Trofeos',
      onClick: 'click-trophies',
      onMouseEnter: 'mouse-enter-trophies',
      onMouseLeave: 'mouse-leave-trophies'
    })
  })

  // Handle icon click actions from renderer
  ipcMain.on('main-option-control', (_, actionId: string) => {
    mainApp.mainOptionControl(actionId)
  })

}
main().catch((error) => {
  debugError(error)
})
