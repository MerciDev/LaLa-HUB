import { ElectronAPI } from '@electron-toolkit/preload'
import { AppAction, HomeSlot, Emulator, RetroArchSettings, DownloadSource, DownloadEntry, DownloadTask, DownloadProgress, GameMetadata, AuthState, AuthResult, LoginCredentials, RegisterCredentials, UserProfile, SyncStatus, SaveFileInfo } from '../shared/types'

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
  browseDirectory: (options?: Electron.OpenDialogOptions) => Promise<string | null>
  
  /** CRUD operations on persisted game slots. */
  slots: {
    getAll: () => Promise<HomeSlot[]>
    add: (slot: HomeSlot) => Promise<{ success: boolean }>
    addMultiple: (slots: HomeSlot[]) => Promise<{ success: boolean }>
    remove: (slotId: string) => Promise<{ success: boolean }>
    clearAll: () => Promise<{ success: boolean }>
  }

  saves: {
    getFiles: (dirPath: string, extension?: string) => Promise<SaveFileInfo[]>
    pushCloud: (slotId: string, overrides?: { savesPath?: string; savesExtension?: string }) => Promise<{ success: boolean; error?: string }>
    pullCloud: (slotId: string, overrides?: { savesPath?: string; savesExtension?: string }) => Promise<{ success: boolean; error?: string }>
    saveDescription: (savePath: string, description: string) => Promise<{ success: boolean }>
    deleteFile: (savePath: string) => Promise<{ success: boolean }>
    deleteCloud: (slotId: string, filename: string) => Promise<{ success: boolean; error?: string }>
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
    importTheme: () => Promise<import('../shared/types').AppTheme | { error: string } | null>
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

  /** Game metadata lookup via SteamGridDB */
  metadata: {
    searchGame: (title: string) => Promise<{ success: boolean; data?: GameMetadata | null; error?: string }>
  }

  /** Game API (replaces direct LaLa-API calls from renderer) */
  gameApi: {
    getConsoles: () => Promise<any[]>
    getYears: () => Promise<string[]>
    searchGames: (query: string) => Promise<any[]>
    getGameById: (id: string) => Promise<any | null>
  }

  /** Authentication */
  auth: {
    login: (credentials: LoginCredentials) => Promise<AuthResult>
    register: (credentials: RegisterCredentials) => Promise<AuthResult>
    logout: () => Promise<void>
    getStatus: () => Promise<AuthState>
    updateProfile: (profile: Partial<UserProfile>) => Promise<AuthResult>
    refreshProfile: () => Promise<AuthState>
    onAuthChange: (callback: (state: AuthState) => void) => () => void
  }

  /** Sync */
  sync: {
    getStatus: () => Promise<SyncStatus>
    trigger: () => Promise<{ success: boolean; error?: string }>
    pushCloud: () => Promise<{ success: boolean; error?: string }>
    pullCloud: () => Promise<{ success: boolean; error?: string }>
    onStatusChange: (callback: (status: SyncStatus) => void) => () => void
  }

  /** Social & Friends */
  social: {
    getFriends: () => Promise<{ success: boolean; data?: import('../shared/types').FriendProfile[]; error?: string }>
    searchUsers: (query: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
    sendFriendRequest: (friendId: string) => Promise<{ success: boolean; error?: string }>
    acceptFriendRequest: (friendId: string) => Promise<{ success: boolean; error?: string }>
    removeFriend: (friendshipId: string) => Promise<{ success: boolean; error?: string }>
    getUserProfile: (userId: string) => Promise<{ success: boolean; data?: any; error?: string }>
    renewFriendCode: () => Promise<{ success: boolean; friendCode?: string; error?: string }>
    updatePresence: (status: 'online' | 'away' | 'dnd' | 'offline', statusText: string) => Promise<{ success: boolean; error?: string }>
    onPresenceUpdate: (callback: (presence: import('../shared/types').PresenceState[]) => void) => () => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
