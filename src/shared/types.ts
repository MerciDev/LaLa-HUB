export interface IconOption {
  id: string
  icon: string
  label: string
  onClick?: string
  onMouseEnter?: string
  onMouseLeave?: string
  extraData?: {
    username?: string
    status?: 'online' | 'idle' | 'dnd' | 'offline'
    avatar?: string
    isPlaying?: string
    playingIcon?: string
    friends?: Array<{
      id: string
      avatar?: string
      status?: 'online' | 'idle' | 'dnd' | 'offline'
      playingIcon?: string
    }>
  }
}

export type AppAction =
  | { type: 'CHANGE_INFO_ISLAND'; payload: string }
  | { type: 'EXPAND_INFO_ISLAND' }
  | { type: 'COLLAPSE_INFO_ISLAND' }
  | { type: 'ADD_SOCIAL_ICON'; payload: IconOption }
  | { type: 'ADD_PERSONAL_ICON'; payload: IconOption }
  | { type: 'TOGGLE_SOCIAL_MENU' }
  | { type: 'TOGGLE_PERSONAL_MENU' }
  // Grid Actions
  | { type: 'UPDATE_GRID_CONFIG'; payload: Partial<Omit<HomeGrid, 'items'>> }
  | { type: 'SET_GRID_ITEMS'; payload: HomeSlot[] }
  | { type: 'ADD_GRID_ITEM'; payload: HomeSlot }
  | { type: 'REMOVE_GRID_ITEM'; payload: string } // ID del item a eliminar
  | { type: 'SET_SELECTED_INDEX'; payload: { section: string; index: number } }
  | { type: 'SET_GRID_PAGE'; payload: number }
  // Context Menu Actions
  | { type: 'TOGGLE_CONTEXT_MENU'; payload: boolean } // state
  | { type: 'SET_CONTEXT_OPTIONS'; payload: ContextOption[] }
  | { type: 'ADD_CONTEXT_OPTION'; payload: ContextOption }
  | { type: 'REMOVE_CONTEXT_OPTION'; payload: string }
  // UI Panels
  | { type: 'OPEN_SETTINGS' }
  | { type: 'OPEN_SETTINGS_FRIENDS' }
  | { type: 'CLOSE_SETTINGS' }
  | { type: 'OPEN_EDIT_GAME'; payload: HomeSlot }
  | { type: 'CLOSE_ADD_GAME' }
  | { type: 'GO_HOME' }
  | { type: 'OPEN_DOWNLOADS' }
  | { type: 'OPEN_PROFILE' }
  | { type: 'OPEN_LIBRARY_PICKER' }
  // Grid Edit Modes
  | { type: 'ENTER_MOVE_MODE'; payload: HomeSlot }
  | { type: 'EXIT_MOVE_MODE' }
  | { type: 'ENTER_RESIZE_MODE'; payload: HomeSlot }
  | { type: 'EXIT_RESIZE_MODE' }
  | { type: 'OPEN_SHIFT_CONTENT'; payload: HomeSlot }
  | { type: 'EXIT_SHIFT_CONTENT' }

export interface ContextOption {
  id: string
  label: string
  icon: string
  action?: string
}

export interface Emulator {
  id: string
  name: string
  path: string
  /** Argument template, use {roms} as placeholder for the ROM path. */
  args: string
  platforms?: string[]
}

export interface RetroArchSettings {
  path?: string
  coresPath?: string
}

export interface AppSettings {
  emulators: Emulator[]
  platforms: Platform[]
  retroarch?: RetroArchSettings
}

export interface Platform {
  id: string
  name: string
  icon?: string
  image?: string
  company?: string
}

export interface Game {
  id: string
  name: string
  searchId?: string
  platform?: Platform
  emulator?: Emulator
  path?: string
  args?: string
  /** Accumulated playtime in minutes */
  playtimeMinutes?: number
  /** Keys to send after launching (e.g. for fullscreen, overlays). */
  launchKeys?: string
  /** Specific RetroArch core to use (e.g. 'snes9x_libretro.dll') */
  retroarchCore?: string
  /** Optional: specific process name to wait for on macOS/Win (e.g. 'java' for Minecraft) */
  processName?: string
  coverUrl?: string
  backgroundUrl?: string
  /** Local path where emulator saves memory cards / save states for this game */
  savesPath?: string
  /** Extension of save files (e.g. '.sav', '.srm') */
  savesExtension?: string
  /** Whether to sync saves to cloud storage */
  cloudSyncEnabled?: boolean
  images?: { home?: string; logo?: string; cover?: string; background?: string; icon?: string; v_grid?: string; h_grid?: string }
}

export interface SaveFileInfo {
  filename: string
  path: string
  sizeBytes: number
  modifiedTime: number
  formattedDate: string
  description?: string
}

export interface HomeSlot {
  id: string
  icon: string
  image?: string
  squareImage?: string
  thumbImage?: string
  backgroundImage?: string
  logoImage?: string
  coverImage?: string
  verticalImage?: string
  horizontalImage?: string
  iconImage?: string
  label: string
  iframeUrl?: string
  videoUrl?: string
  videoSettings?: { volume: number, muted?: boolean }
  onClick?: string
  onMouseEnter?: string
  onMouseLeave?: string
  game?: Game
  gameRef?: { consoleSlug: string; gameId: string }
  position?: number
  /** How many columns this slot spans (default 1) */
  colSpan?: number
  /** How many rows this slot spans (default 1) */
  rowSpan?: number
  scale?: { x: number; y: number }
  page?: number
  showLabel?: boolean
  showLogo?: boolean
  labelPosition?: 'bottom' | 'top' | 'center'
  showIcon?: boolean
  iconPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  iconSize?: number
  contentOffsets?: ContentOffsetSettings
}

export interface ContentOffsetSettings {
  image?: { x: number; y: number; scale?: number }
  label?: { x: number; y: number; scale?: number }
  icon?: { x: number; y: number; scale?: number }
}

export interface HomeGrid {
  rows: number
  cols: number
  gap: number
  aspectRatio: number
  items: HomeSlot[]
  totalPages?: number
}

export interface GridSettings {
  rows: number
  cols: number
  gap: number
  aspectRatio: number
}

export interface GameMetadata {
  title: string
  backgroundImage?: string
  coverImage?: string
  logoImage?: string
  screenshots: string[]
  description?: string
  releaseDate?: string
  platforms: string[]
  genres: string[]
  rating?: number
  metacritic?: number
  website?: string
  esrb?: string
  developers: string[]
  publishers: string[]
}

export interface AppTheme {
  id: string
  name: string
  author?: string
  description?: string
  colors: Record<string, string>
  backgroundImage?: string
  customCss?: string
}

export interface InterfaceSettings {
  showGameBackground: boolean
  sgdbApiKey?: string
  activeTheme?: string
  customThemes?: AppTheme[]
}

// ─── Auth Types ─────────────────────────────────────────────────────────────

export interface AuthState {
  isLoggedIn: boolean
  user: UserProfile | null
  session: SessionInfo | null
}

export interface UserProfile {
  id: string
  email: string
  username: string
  avatarUrl?: string
  accountType?: string
  createdAt: string
}

export interface SessionInfo {
  accessToken: string
  refreshToken: string
  expiresAt?: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  username: string
}

export interface AuthResult {
  success: boolean
  error?: string
  user?: UserProfile
}

export interface SyncStatus {
  lastSyncAt: string | null
  pendingUploads: number
  isSyncing: boolean
}

// ─── Download System Types ──────────────────────────────────────────────────

export interface DownloadEntry {
  fileSize: string
  uploadDate: string
  uris: string[]
  title: string
}

export interface DownloadSource {
  name: string
  downloads: DownloadEntry[]
}

export interface DownloadTask {
  id: string
  title: string
  source: string
  uri: string
  fileSize: string
  status: 'queued' | 'downloading' | 'completed' | 'error' | 'opened'
  progress: number
  speed: string
  error?: string
  addedAt: string
  completedAt?: string
}

export interface DownloadProgress {
  id: string
  progress: number
  speed: string
  status: DownloadTask['status']
  error?: string
}

// ─── Social & Friends Types ──────────────────────────────────────────────────

export interface FriendProfile {
  id: string
  username: string
  avatarUrl?: string
  status: 'online' | 'away' | 'offline'
  statusText: string
  friendshipStatus: 'pending' | 'accepted' | 'blocked' | 'none'
  isSender?: boolean // True if current user sent the pending request
}

export interface PresenceState {
  userId: string
  username: string
  status: 'online' | 'away' | 'offline'
  statusText: string
}

export interface UserPlaytime {
  gameName: string
  platform: string
  minutes: number
  imageUrl: string | null
}

export interface UserPublicProfile {
  id: string
  username: string
  avatarUrl?: string
  status: 'online' | 'away' | 'offline'
  statusText: string
  playtimes: UserPlaytime[]
}

