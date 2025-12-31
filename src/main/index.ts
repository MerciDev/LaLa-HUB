import { app, BrowserWindow, globalShortcut, screen, ipcMain, Input } from 'electron'
import { join } from 'path'
import { debugLog, debugError } from './utils/debug'
import * as overlay from './windows/overlay/overlay'
import * as loading from './windows/loading/loading'
import * as mainApp from './windows/main/main'
import * as keymaps from './keymaps/keymaps'
import { HomeSlot } from '../shared/types'
import { addSlot, loadSlots } from './utils/storage'

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

  // Handle Input Events for Movement
  appWindow.webContents.on('before-input-event', (event, input: Input) => {
    if (input.type !== 'keyDown') return

    for (const [action, key] of Object.entries(keymaps.keymaps)) {
      if (key.toLowerCase() === input.key.toLowerCase()) {
        event.preventDefault()
        if (action === 'nextPage') {
          mainApp.handlePageChange('next')
        } else if (action === 'prevPage') {
          mainApp.handlePageChange('prev')
        } else if (action === 'contextMenu') {
          if (mainApp.isContextMenuVisible) {
            mainApp.toggleContextMenu(false)
            mainApp.setSection('grid')
          } else {
            // Only open if in grid section and an element is selected (optional check)
            if (mainApp.currentSection === 'grid') { // && mainApp.selectedElement
              mainApp.toggleContextMenu(true)
              mainApp.setSection('context-menu')
            }
          }
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
      }
    }
  })

  overlayWindow = overlay.createOverlay(appWindow)
  loadingWindow = loading.createLoading(appWindow)
}

// Handle interaction from renderer's context menu control
ipcMain.on('context-menu-control', (_, action: string, data?: any) => {
  if (action === 'toggle') {
    mainApp.toggleContextMenu(data)
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
export const debouncedToggleLoading = keymaps.createDebouncedToggle(loading.toggleLoading);

async function main(): Promise<void> {
  // Load Keymaps
  keymaps.loadKeymaps()

  process.env.DEBUG_MODE = 'true'
  process.env.WINDOWED_BORDERLESS = 'false'
  process.env.OVERLAY = 'false'
  process.env.LOADING = 'false'
  await app.whenReady()

  globalShortcut.register(keymaps.keymaps.overlay, () => {
    debouncedToggleOverlay();
  })
  globalShortcut.register(keymaps.keymaps.loading, () => {
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

    // Add Twilight Princess slot (will only add if not exists, or update if exists)
    addSlot({
      id: 'twilight-princess-hd-slot',
      icon: 'mdi:controller',
      label: 'The Legend of Zelda -Twilight Princess HD',
      position: 7,
      onClick: 'run-game',
      onMouseEnter: 'mouse-enter-grid-item',
      onMouseLeave: 'mouse-leave-grid-item',
      game: {
        id: 'twilight-princess-hd',
        name: 'The Legend of Zelda -Twilight Princess HD',
        path: 'E:\\Emulation\\roms\\wiiu\\Legend of Zelda, The - Twilight Princess HD (Europe) (En,Fr,De,Es,It) (Rev 2).wux',
        emulator: {
          id: 'cemu',
          name: 'Cemu',
          path: 'C:\\Users\\mercp\\Downloads\\cemu-2.6-windows-x64\\Cemu_2.6\\Cemu.exe',
          args: '-g {roms}'
        }
      }
    })

    // Load and set all slots from storage
    const savedSlots = loadSlots()
    mainApp.setGridItems(savedSlots)
    mainApp.setTotalPages(3)

    // Set default context options
    mainApp.setContextOptions([
      { id: '1', label: 'Opcion 1' },
      { id: '2', label: 'Opcion 2' },
      { id: '3', label: 'Opcion 3' }
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

}
main().catch((error) => {
  debugError(error)
})
