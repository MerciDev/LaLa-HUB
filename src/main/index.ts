import { app, BrowserWindow, globalShortcut, screen } from 'electron'
import { debugLog, debugError } from '../utils/debug/debug'
import * as overlay from './windows/overlay/overlay'
import * as loading from './windows/loading/loading'
import { keymaps } from './keymaps/keymaps'

let appWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let loadingWindow: BrowserWindow | null = null

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  appWindow = new BrowserWindow({
    width: (process.env.WINDOWED_BORDERLESS === 'true' ? width : 800),
    height: (process.env.WINDOWED_BORDERLESS === 'true' ? height : 600),
    frame: process.env.WINDOWED_BORDERLESS !== 'true',
    resizable: process.env.WINDOWED_BORDERLESS !== 'true',
    autoHideMenuBar: true
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
}
main().catch((error) => {
  debugError(error)
})

