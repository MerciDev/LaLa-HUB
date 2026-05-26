import { ElectronAPI } from '@electron-toolkit/preload'
import { AppAction, HomeSlot, Emulator, RetroArchSettings, DownloadSource, DownloadEntry, DownloadTask, DownloadProgress, MetadataProvider, GameMetadata } from '../shared/types'

export interface API {
  onMainMessage: (callback: (action: AppAction) => void) => void
  offMainMessage: () => void
  
  onLoadingBg: (callback: (dataUrl: string) => void) => () => void
  onLoadingData: (callback: (item: HomeSlot) => void) => () => void

  mainOptionControl: (actionId: string) => void
  gridItemControl: (actionId: string, item: HomeSlot) => void
  
  movementControl: {
    send: (action: string, data?: any) => void
    setInputFocused: (focused: boolean) => void
    setInputCapture: (active: boolean) => void
    onAction: (callback: (section: string, action: string) => void) => () => void
  }
  
  contextMenuControl: {
    send: (action: string, data?: any) => void
    onAction: (callback: (action: string, data?: any) => void) => () => void
  }
  
  gamepadControl: {
    sendInput: (button: string) => void
  }
  
  /** Opens a native OS file picker and returns the selected path or null. */
  browseFile: (options?: Electron.OpenDialogOptions) => Promise<string | null>
  
  /** CRUD operations on persisted game slots. */
  slots: {
    add: (slot: HomeSlot) => Promise<{ success: boolean }>
    addMultiple: (slots: HomeSlot[]) => Promise<{ success: boolean }>
    remove: (slotId: string) => Promise<{ success: boolean }>
  }
  
  /** Emulator manager — used by the Settings panel. */
  emulators: {
    getAll: () => Promise<Emulator[]>
    save: (emulator: Emulator) => Promise<{ success: boolean }>
    remove: (id: string) => Promise<{ success: boolean }>
  }

  /** Platform manager — used by the Settings panel. */
  platforms: {
    getAll: () => Promise<import('../shared/types').Platform[]>
    save: (platform: import('../shared/types').Platform) => Promise<{ success: boolean }>
    remove: (id: string) => Promise<{ success: boolean }>
    sync: (options?: { overwrite?: boolean }) => Promise<{ success: boolean; count?: number; error?: string }>
  }
  
  /** Playtime queries (read-only). */
  playtime: {
    get: (slotId: string) => Promise<{ minutes: number; formatted: string }>
    getAll: () => Promise<Array<{ slotId: string; name: string; minutes: number; formatted: string }>>
  }
  
  /** Copies an image into app data and returns a media:// URL. */
  artwork: {
    import: (srcPath: string) => Promise<{ success: boolean; url: string | null; localPath?: string }>
  }
  
  /** Read and persist key/gamepad bindings. */
  keymaps: {
    getAll: () => Promise<Record<string, string | boolean>>
    save: (keymaps: Record<string, string | boolean>) => Promise<{ success: boolean }>
  }

  /** Scanner for automatic ROM discovery. */
  scanner: {
    scan: (config: { path: string, emulator: Emulator, extensions: string[], recursive: boolean }) => Promise<{ success: boolean, slots?: HomeSlot[], error?: string }>
  }

  /** RetroArch native support. */
  retroarch: {
    getSettings: () => Promise<RetroArchSettings>
    saveSettings: (settings: RetroArchSettings) => Promise<{ success: boolean }>
    getCores: () => Promise<Array<{ filename: string; name: string }>>
  }

  /** Overlay window control */
  overlayControl: {
    close: () => void
    showMain: () => void
  }

  /** Loading screen control */
  loadingControl: {
    dismiss: () => void
  }

  /** Interface settings management. */
  ui: {
    getSettings: () => Promise<import('../shared/types').InterfaceSettings>
    saveSettings: (settings: import('../shared/types').InterfaceSettings) => Promise<{ success: boolean; error?: string }>
  }

  /** Download system — browse sources, manage downloads */
  downloads: {
    getSourcesConfig: () => Promise<Array<{ name: string; url: string }>>
    fetchSource: (url: string) => Promise<{ success: boolean; data?: DownloadSource; error?: string }>
    getTasks: () => Promise<DownloadTask[]>
    start: (entry: DownloadEntry, sourceName: string) => Promise<{ success: boolean; task?: DownloadTask; error?: string }>
    cancel: (id: string) => Promise<{ success: boolean }>
    remove: (id: string) => Promise<{ success: boolean }>
    retry: (id: string) => Promise<{ success: boolean }>
    clearCompleted: () => Promise<{ success: boolean }>
    onProgress: (callback: (progress: DownloadProgress) => void) => () => void
  }

  /** Game metadata lookup (Steam / RAWG / TGDB) */
  metadata: {
    searchGame: (title: string, provider: MetadataProvider) => Promise<{ success: boolean; data?: GameMetadata | null; error?: string }>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
