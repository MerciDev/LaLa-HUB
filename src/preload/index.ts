import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
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
    setInputCapture: (active: boolean) => {
      ipcRenderer.send('set-input-capture', active)
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

  /**
   * Opens a native directory picker dialog.
   * @param options Electron OpenDialogOptions
   * @returns The selected directory path, or null if cancelled.
   */
  browseDirectory: (options: Electron.OpenDialogOptions = {}): Promise<string | null> =>
    ipcRenderer.invoke('browse-directory', options),

  /** CRUD operations on persisted game slots. */
  slots: {
    getAll: (): Promise<import('../shared/types').HomeSlot[]> =>
      ipcRenderer.invoke('slot-get-all'),
    add: (slot: import('../shared/types').HomeSlot): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('slot-add', slot),
    addMultiple: (slots: import('../shared/types').HomeSlot[]): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('slot-add-multiple', slots),
    remove: (slotId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('slot-remove', slotId),
    clearAll: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('slot-clear-all')
  },

  /** Save files scanner & cloud sync */
  saves: {
    getFiles: (dirPath: string, extension?: string): Promise<import('../shared/types').SaveFileInfo[]> =>
      ipcRenderer.invoke('saves-get-files', dirPath, extension),
    pushCloud: (slotId: string, overrides?: { savesPath?: string; savesExtension?: string }): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('saves-push-cloud', slotId, overrides),
    pullCloud: (slotId: string, overrides?: { savesPath?: string; savesExtension?: string }): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('saves-pull-cloud', slotId, overrides),
    saveDescription: (savePath: string, description: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('saves-save-description', savePath, description),
    deleteFile: (savePath: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('saves-delete-file', savePath),
    deleteCloud: (slotId: string, filename: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('saves-delete-cloud', slotId, filename)
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
    sync: (options?: { overwrite?: boolean }): Promise<{ success: boolean; count?: number; error?: string }> =>
      ipcRenderer.invoke('platforms-sync', options)
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
    getAll: (): Promise<Record<string, string | boolean>> =>
      ipcRenderer.invoke('keymaps-get'),
    save: (keymaps: Record<string, string | boolean>): Promise<{ success: boolean }> =>
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
  },

  /** Interface settings management. */
  ui: {
    getSettings: (): Promise<import('../shared/types').InterfaceSettings> =>
      ipcRenderer.invoke('interface-settings-get'),
    saveSettings: (settings: import('../shared/types').InterfaceSettings): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('interface-settings-save', settings)
  },

  /** Download system — browse sources, manage downloads */
  downloads: {
    getSourcesConfig: (): Promise<Array<{ name: string; url: string }>> =>
      ipcRenderer.invoke('download-get-sources-config'),
    fetchSource: (url: string): Promise<{ success: boolean; data?: import('../shared/types').DownloadSource; error?: string }> =>
      ipcRenderer.invoke('download-fetch-source', url),
    getTasks: (): Promise<import('../shared/types').DownloadTask[]> =>
      ipcRenderer.invoke('download-get-tasks'),
    start: (entry: import('../shared/types').DownloadEntry, sourceName: string): Promise<{ success: boolean; task?: import('../shared/types').DownloadTask; error?: string }> =>
      ipcRenderer.invoke('download-start', entry, sourceName),
    cancel: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('download-cancel', id),
    remove: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('download-remove', id),
    retry: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('download-retry', id),
    clearCompleted: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('download-clear-completed'),
    onProgress: (callback: (progress: import('../shared/types').DownloadProgress) => void): (() => void) => {
      const fn = (_, progress) => callback(progress)
      ipcRenderer.on('download-progress', fn)
      return () => { ipcRenderer.removeListener('download-progress', fn) }
    }
  },

  /** Game metadata lookup (Steam / RAWG / TGDB) */
  metadata: {
    searchGame: (title: string, provider: import('../shared/types').MetadataProvider): Promise<{ success: boolean; data?: import('../shared/types').GameMetadata | null; error?: string }> =>
      ipcRenderer.invoke('metadata-search-game', title, provider)
  },

  /** Authentication */
  auth: {
    login: (credentials: import('../shared/types').LoginCredentials): Promise<import('../shared/types').AuthResult> =>
      ipcRenderer.invoke('auth-login', credentials),
    register: (credentials: import('../shared/types').RegisterCredentials): Promise<import('../shared/types').AuthResult> =>
      ipcRenderer.invoke('auth-register', credentials),
    logout: (): Promise<void> =>
      ipcRenderer.invoke('auth-logout'),
    getStatus: (): Promise<import('../shared/types').AuthState> =>
      ipcRenderer.invoke('auth-get-status'),
    updateProfile: (profile: Partial<import('../shared/types').UserProfile>): Promise<import('../shared/types').AuthResult> =>
      ipcRenderer.invoke('auth-update-profile', profile),
    refreshProfile: (): Promise<import('../shared/types').AuthState> =>
      ipcRenderer.invoke('auth-refresh-profile'),
    onAuthChange: (callback: (state: import('../shared/types').AuthState) => void): (() => void) => {
      const fn = (_, state) => callback(state)
      ipcRenderer.on('auth-state-changed', fn)
      return () => { ipcRenderer.removeListener('auth-state-changed', fn) }
    }
  },

  /** Game API (replaces direct LaLa-API calls) */
  gameApi: {
    getConsoles: (): Promise<any[]> =>
      ipcRenderer.invoke('gameapi-consoles'),
    getYears: (): Promise<string[]> =>
      ipcRenderer.invoke('gameapi-years'),
    searchGames: (query: string): Promise<any[]> =>
      ipcRenderer.invoke('gameapi-search', query),
    getGameById: (id: string): Promise<any | null> =>
      ipcRenderer.invoke('gameapi-get-by-id', id)
  },

  /** Sync */
  sync: {
    getStatus: (): Promise<import('../shared/types').SyncStatus> =>
      ipcRenderer.invoke('sync-get-status'),
    trigger: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('sync-trigger'),
    pushCloud: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('sync-push-cloud'),
    pullCloud: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('sync-pull-cloud'),
    onStatusChange: (callback: (status: import('../shared/types').SyncStatus) => void): (() => void) => {
      const fn = (_, status) => callback(status)
      ipcRenderer.on('sync-status-changed', fn)
      return () => { ipcRenderer.removeListener('sync-status-changed', fn) }
    }
  }
}

// Use `contextBridge` APIs to expose APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
