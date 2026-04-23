import { contextBridge, ipcRenderer } from 'electron'
import { AppAction, HomeSlot } from '../shared/types'

// Custom APIs for renderer
const api = {
  onMainMessage: (callback: (action: AppAction) => void) => {
    ipcRenderer.on('dispatch-action', (_, action) => callback(action))
  },

  offMainMessage: () => {
    ipcRenderer.removeAllListeners('dispatch-action')
  },

  onLoadingBg: (callback: (dataUrl: string) => void) => {
    const fn = (_, dataUrl) => callback(dataUrl)
    ipcRenderer.on('background-image', fn)
    return () => ipcRenderer.removeListener('background-image', fn)
  },

  onLoadingData: (callback: (item: HomeSlot) => void) => {
    const fn = (_, item) => callback(item)
    ipcRenderer.on('set-loading-data', fn)
    return () => ipcRenderer.removeListener('set-loading-data', fn)
  },

  mainOptionControl: (actionId: string) => {
    ipcRenderer.send('main-option-control', actionId)
  },

  gridItemControl: (actionId: string, item: HomeSlot) => {
    ipcRenderer.send('grid-item-control', actionId, item)
  },

  movementControl: {
    send: (action: string, data?: any) => {
      ipcRenderer.send('movement-control', action, data)
    },
    setInputFocused: (focused: boolean) => {
      ipcRenderer.send('set-input-focused', focused)
    },
    onAction: (callback: (section: string, action: string) => void) => {
      const subscription = (_, section, action) => callback(section, action)
      ipcRenderer.on('movement-action', subscription)
      return () => {
        ipcRenderer.removeListener('movement-action', subscription)
      }
    }
  },

  contextMenuControl: {
    send: (action: string, data?: any) => {
      ipcRenderer.send('context-menu-control', action, data)
    },
    onAction: (callback: (action: string, data?: any) => void) => {
      const subscription = (_, action, data) => callback(action, data)
      ipcRenderer.on('context-menu-action', subscription)
      return () => {
        ipcRenderer.removeListener('context-menu-action', subscription)
      }
    }
  },

  gamepadControl: {
    sendInput: (button: string) => {
      ipcRenderer.send('gamepad-input', button)
    }
  },

  /**
   * Opens a native file picker dialog.
   * @param options  Electron OpenDialogOptions (filters, title, etc.)
   * @returns The selected file path, or null if cancelled.
   */
  browseFile: (options: Electron.OpenDialogOptions = {}): Promise<string | null> =>
    ipcRenderer.invoke('browse-file', options),

  /** CRUD operations on persisted game slots. */
  slots: {
    add: (slot: import('../shared/types').HomeSlot): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('slot-add', slot),
    addMultiple: (slots: import('../shared/types').HomeSlot[]): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('slot-add-multiple', slots),
    remove: (slotId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('slot-remove', slotId)
  },

  /** Emulator management (used by Settings panel). */
  emulators: {
    getAll: (): Promise<import('../shared/types').Emulator[]> =>
      ipcRenderer.invoke('emulators-get'),
    save: (emulator: import('../shared/types').Emulator): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('emulator-save', emulator),
    remove: (id: string) =>
      ipcRenderer.invoke('emulator-remove', id)
  },

  /** Platform management (used by Settings panel). */
  platforms: {
    getAll: (): Promise<import('../shared/types').Platform[]> =>
      ipcRenderer.invoke('platforms-get'),
    save: (platform: import('../shared/types').Platform): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('platform-save', platform),
    remove: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('platform-remove', id),
    sync: (): Promise<{ success: boolean; count?: number; error?: string }> =>
      ipcRenderer.invoke('platforms-sync')
  },

  /** Playtime queries (read-only from renderer side). */
  playtime: {
    get: (slotId: string): Promise<{ minutes: number; formatted: string }> =>
      ipcRenderer.invoke('playtime-get', slotId),
    getAll: (): Promise<Array<{ slotId: string; name: string; minutes: number; formatted: string }>> =>
      ipcRenderer.invoke('playtime-get-all')
  },

  /** Artwork management — copies image into app data and returns a media:// URL. */
  artwork: {
    import: (srcPath: string): Promise<{ success: boolean; url: string | null; localPath?: string }> =>
      ipcRenderer.invoke('artwork-import', srcPath)
  },

  /** Keymap management — read and save key bindings. */
  keymaps: {
    getAll: (): Promise<Record<string, string>> =>
      ipcRenderer.invoke('keymaps-get'),
    save: (keymaps: Record<string, string>): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('keymaps-save', keymaps)
  },
  
  /** Scanner for automatic ROM discovery. */
  scanner: {
    scan: (config: { path: string, emulator: import('../shared/types').Emulator, extensions: string[], recursive: boolean }): Promise<{ success: boolean, slots?: HomeSlot[], error?: string }> =>
      ipcRenderer.invoke('scanner-scan', config)
  },

  /** RetroArch native support. */
  retroarch: {
    getSettings: (): Promise<import('../shared/types').RetroArchSettings> =>
      ipcRenderer.invoke('retroarch-get-settings'),
    saveSettings: (settings: import('../shared/types').RetroArchSettings): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('retroarch-save-settings', settings),
    getCores: (): Promise<Array<{ filename: string; name: string }>> =>
      ipcRenderer.invoke('retroarch-get-cores')
  },
  
  /** Overlay window control */
  overlayControl: {
    close: () => ipcRenderer.send('overlay-close'),
    showMain: () => ipcRenderer.send('overlay-show-main')
  },

  /** Loading screen control — allows the loading window to dismiss itself */
  loadingControl: {
    dismiss: () => ipcRenderer.send('loading-dismiss')
  }
}

// Use `contextBridge` APIs to expose APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
