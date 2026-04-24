import { app, BrowserWindow, globalShortcut, screen, ipcMain, Input, protocol } from 'electron'

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
])

import { join } from 'path'
import { debugLog, debugError } from './utils/debug'
import * as overlay from './windows/overlay/overlay'
import * as loading from './windows/loading/loading'
import * as mainApp from './windows/main/main'
import * as keymaps from './keymaps/keymaps'
import { saveJoyToKeyProfile, loadJoyToKeyProfile } from './utils/joyToKey'
import { HomeSlot } from '../shared/types'
import { loadSlots } from './utils/storage'
import { processGameSlots } from './utils/gameMetadata'
import { registerFileDialogHandlers } from './handlers/fileDialogHandler'
import { registerSlotHandlers } from './handlers/slotHandler'
import { registerEmulatorHandlers } from './handlers/emulatorHandler'
import { registerPlatformHandlers } from './handlers/platformHandler'
import { registerPlaytimeHandlers } from './handlers/playtimeHandler'
import { registerArtworkHandlers } from './handlers/artworkHandler'
import { registerScannerHandlers } from './handlers/scannerHandler'
import { registerRetroArchHandlers } from './handlers/retroarchHandler'
import { registerKeymapHandlers } from './handlers/keymapHandler'
import { initDiscordRPC, setActivity } from './utils/discord'

export let appWindow: BrowserWindow | null = null
export let overlayWindow: BrowserWindow | null = null
export let loadingWindow: BrowserWindow | null = null

let isRendererInputFocused = false

/** Checks if an Electron input event matches a keymap string (e.g. 'Control+X', 'ArrowUp', etc.) */
function isKeyMatch(input: Input, target: string): boolean {
  if (!target) return false
  
  // Soporte para múltiples teclas separadas por | (ej: "ArrowUp | W")
  const options = target.split('|').map(opt => opt.trim())
  
  return options.some(option => {
    const parts = option.split('+').map(p => p.trim().toLowerCase())
    const keyPart = parts.pop()
    if (!keyPart) return false

    let matchKey = input.key.toLowerCase()
    if (matchKey === ' ') matchKey = 'space'
    if (keyPart !== matchKey) return false

    let hasControl = parts.includes('control') || parts.includes('ctrl')
    let hasAlt = parts.includes('alt')
    let hasShift = parts.includes('shift')
    let hasMeta = parts.includes('meta') || parts.includes('cmd')

    if (keyPart === 'shift') hasShift = true
    if (keyPart === 'control' || keyPart === 'ctrl') hasControl = true
    if (keyPart === 'alt') hasAlt = true
    if (keyPart === 'meta' || keyPart === 'cmd') hasMeta = true
    
    return hasControl === input.control && hasAlt === input.alt && 
           hasShift === input.shift && hasMeta === input.meta
  })
}

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

  mainApp.setAppWindow(appWindow)

  debugLog('Main Window created.')

  appWindow.loadURL(
    `${process.env['ELECTRON_RENDERER_URL']}/src/windows/main/main.html`
  );

  // Handle Input Events for Movement
  appWindow.webContents.on('before-input-event', (event, input: Input) => {
    if (input.type !== 'keyDown') return

    for (const [action, key] of Object.entries(keymaps.keymaps)) {
      if (typeof key === 'string' && isKeyMatch(input, key)) {
        debugLog(`[DEBUG] Key match found: ${input.key} (${input.type}) -> Action: ${action}`)

        // If the user focuses an input in the renderer, DO NOT preempt navigation keystrokes like 'e' or 'q'
        // that are standard typed keys, EXCEPT for 'back'/'Escape' to unfocus or basic enter
        if (isRendererInputFocused) {
          if (action !== 'back' && action !== 'select') break
        }

        event.preventDefault()
        if (action === 'nextPage') {
          mainApp.handlePageChange('next')
        } else if (action === 'prevPage') {
          mainApp.handlePageChange('prev')
        } else if (action === 'contextMenu') {
          debouncedToggleContextMenu()
        } else if (action === 'back') {
          if (mainApp.isContextMenuVisible) {
            mainApp.toggleContextMenu(false)
            mainApp.setSection('grid')
          } else {
            appWindow?.webContents.send('movement-action', mainApp.currentSection, action)
          }
        } else {
          appWindow?.webContents.send('movement-action', mainApp.currentSection, action)
        }
        break // ← stop processing other keymaps for the same keypress
      }
    }
  })


  overlayWindow = overlay.createOverlay(appWindow)
  loadingWindow = loading.createLoading(appWindow)
}

// Handle interaction from renderer's context menu control
ipcMain.on('context-menu-control', (_, action: string, data?: any) => {
  if (action === 'toggle') {
    debouncedToggleContextMenu() // Let it toggle; usually data is undefined for toggle from renderer anyway
  } else if (action === 'add') {
    mainApp.addContextOption(data)
  } else if (action === 'remove') {
    mainApp.removeContextOption(data)
  } else if (action === 'set') {
    mainApp.setContextOptions(data)
  } else if (action === 'execute') {
    mainApp.executeContextAction(data)
  }
})

export const debouncedToggleOverlay = keymaps.createDebouncedToggle(overlay.toggleOverlay);

// Sync overlay state when closed from renderer (background click)
ipcMain.on('overlay-close', () => {
  if (overlayWindow?.isVisible()) {
    overlay.toggleOverlay()
  }
})

ipcMain.on('overlay-show-main', () => {
  mainApp.showMainWindow()
  if (overlayWindow?.isVisible()) {
    overlay.toggleOverlay()
  }
})

const performToggleContextMenu = (show?: boolean) => {
  if (show !== undefined) {
    if (show) {
      if (mainApp.currentSection !== 'grid' && !mainApp.isContextMenuVisible) return
      mainApp.toggleContextMenu(true)
      mainApp.setSection('context-menu')
    } else {
      mainApp.toggleContextMenu(false)
      mainApp.setSection('grid')
    }
  } else {
    if (mainApp.isContextMenuVisible) {
      mainApp.toggleContextMenu(false)
      mainApp.setSection('grid')
    } else {
      if (mainApp.currentSection !== 'grid') return
      mainApp.toggleContextMenu(true)
      mainApp.setSection('context-menu')
    }
  }
}
const debouncedToggleContextMenu = keymaps.createDebouncedToggle(performToggleContextMenu)

/**
 * Unregisters all current shortcuts and re-registers them from the live keymaps object.
 * Used to ensure control changes are applied immediately without restarting the app.
 */
export function refreshGlobalShortcuts(): void {
  globalShortcut.unregisterAll()
  
  const currentKeymaps = keymaps.keymaps
  
  if (currentKeymaps.overlay) {
    globalShortcut.register(currentKeymaps.overlay, () => {
      debouncedToggleOverlay()
    })
    debugLog(`[Shortcuts] Overlay key registered: ${currentKeymaps.overlay}`)
  }


  saveJoyToKeyProfile('LaLa-HUB')
  if (currentKeymaps.joyToKeyPath) {
    loadJoyToKeyProfile(currentKeymaps.joyToKeyPath, 'LaLa-HUB')
  }
  debugLog('[Shortcuts] Global shortcuts refreshed and JoyToKey profile updated.')
}

async function main(): Promise<void> {
  // Load Keymaps
  keymaps.loadKeymaps()

  // Start Discord RPC
  initDiscordRPC()

  // Default env flags (overridden by .env or external configuration in production)
  process.env.DEBUG_MODE ??= 'true'
  process.env.WINDOWED_BORDERLESS ??= 'false'
  process.env.OVERLAY ??= 'false'
  process.env.LOADING ??= 'false'

  // Register IPC handler modules
  registerFileDialogHandlers()
  registerSlotHandlers()
  registerEmulatorHandlers()
  registerPlatformHandlers()
  registerPlaytimeHandlers()
  registerArtworkHandlers()
  registerScannerHandlers()
  registerRetroArchHandlers()
  registerKeymapHandlers(refreshGlobalShortcuts)

  await app.whenReady()

  // Register 'media://' protocol to serve locally cached game images
  protocol.registerFileProtocol('media', (request, callback) => {
    const url = request.url.replace('media://', '')
    const decodedUrl = decodeURI(url)
    try {
      // media://games/z/file.webp  ─>  <userData>/resources/games/z/file.webp
      const resourcePath = join(app.getPath('userData'), 'resources', decodedUrl)
      return callback({ path: resourcePath })
    } catch (error) {
      console.error('[Protocol] Failed to resolve media URL:', error)
      return callback({ error: -6 })
    }
  })

  refreshGlobalShortcuts()
  createWindow()

  appWindow?.webContents.on('did-finish-load', () => {
    // Force reset state on boot
    mainApp.toggleContextMenu(false)
    mainApp.setSection('grid')

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

    // Load and set all slots from storage
    const savedSlots = loadSlots()
    mainApp.setGridItems(savedSlots)
    
    // Calculate total pages based on the items' page index
    const maxPage = savedSlots.reduce((max, slot) => Math.max(max, slot.page ?? 0), 0)
    mainApp.setTotalPages(maxPage + 1)
    
    // Force reset page to 0 on renderer load to prevent dev-mode HMR desync
    mainApp.setCurrentPage(0)

    // Fetch metadata & images in the background; update the grid when ready
    processGameSlots(savedSlots).then((updatedSlots) => {
      mainApp.setGridItems(updatedSlots)
    })

    // Set default context options
    mainApp.setContextOptions([
      { id: '1', label: 'Opcion 1', icon: 'mynaui:circle' },
      { id: '2', label: 'Opcion 2', icon: 'mynaui:circle' },
      { id: '3', label: 'Opcion 3', icon: 'mynaui:circle' }
    ])
  })

  // Handle icon actions from renderer
  ipcMain.on('main-option-control', (_, actionId: string) => {
    mainApp.mainOptionControl(actionId)
  })

  // Handle grid item interactions from renderer
  ipcMain.on('grid-item-control', (_, actionId: string, item: HomeSlot) => {
    mainApp.gridItemControl(actionId, item)
  })

  // Handle movement control from renderer (selection updates)
  ipcMain.on('movement-control', (_, action: string, data?: any) => {
    if (action === 'SELECTION_CHANGED') {
      mainApp.setSelectedElement(data)
      debugLog(`New Selection: ${data ? data.label : 'None'}, Section: ${mainApp.getSection()}`)
    } else if (action === 'SET_SECTION') {
      mainApp.setSection(data)
      debugLog(`New Section: ${data}, Item: ${mainApp.getSelectedItem()}`)
    } else if (action === 'SET_TOTAL_PAGES') {
      mainApp.setTotalPages(data)
    } else if (action === 'PAGE_ACTION') {
      mainApp.handlePageChange(data)
    }
  })

  // Handle focus state from renderer
  ipcMain.on('set-input-focused', (_, focused: boolean) => {
    isRendererInputFocused = focused
  })

  // Handle gamepad input

  ipcMain.on('gamepad-input', (_, button: string) => {
    if (keymaps.keymaps.useJoyToKey) return // JoyToKey will handle this via keyboard events
    debugLog(`Received gamepad input: ${button}`)
    const action = Object.entries(keymaps.keymaps).find(([_, value]) => value === button)?.[0]
    if (!action) return

    let logicAction = action
    switch (action) {
      case 'gamepadA': logicAction = 'select'; break
      case 'gamepadB': logicAction = 'back'; break
      case 'gamepadLB': logicAction = 'prevPage'; break
      case 'gamepadRB': logicAction = 'nextPage'; break
      case 'gamepadUp': logicAction = 'up'; break
      case 'gamepadDown': logicAction = 'down'; break
      case 'gamepadLeft': logicAction = 'left'; break
      case 'gamepadRight': logicAction = 'right'; break
      case 'gamepadStart': logicAction = 'contextMenu'; break
      case 'gamepadX': logicAction = 'overlay'; break
      case 'gamepadOverlayCombo': logicAction = 'overlay'; break
    }

    if (logicAction === 'overlay') {
      debouncedToggleOverlay()
      return
    }

    if (logicAction === 'nextPage') {
      mainApp.handlePageChange('next')
    } else if (logicAction === 'prevPage') {
      mainApp.handlePageChange('prev')
    } else if (logicAction === 'contextMenu') {
      debouncedToggleContextMenu()
    } else if (logicAction === 'back') {
      if (mainApp.isContextMenuVisible) {
        mainApp.toggleContextMenu(false)
        mainApp.setSection('grid')
      } else {
        const targetWin = overlayWindow?.isVisible() ? overlayWindow : appWindow
        targetWin?.webContents.send('movement-action', mainApp.currentSection, logicAction)
      }
    } else {
      const targetWin = overlayWindow?.isVisible() ? overlayWindow : appWindow
      targetWin?.webContents.send('movement-action', mainApp.currentSection, logicAction)
    }
  })
}
main().catch((error) => {
  debugError(error)
})
