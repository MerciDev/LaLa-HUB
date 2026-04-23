import { AppAction, HomeSlot, Emulator, RetroArchSettings } from '../shared/types'

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
    sync: () => Promise<{ success: boolean; count?: number; error?: string }>
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
    getAll: () => Promise<Record<string, string>>
    save: (keymaps: Record<string, string>) => Promise<{ success: boolean }>
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
}

declare global {
  interface Window {
    api: API
  }
}
