export interface IconOption {
    id: string
    icon: string
    label: string
    onClick?: string
    onMouseEnter?: string
    onMouseLeave?: string
}

export type AppAction =
    | { type: 'CHANGE_INFO_ISLAND'; payload: string }
    | { type: 'EXPAND_INFO_ISLAND' }
    | { type: 'COLLAPSE_INFO_ISLAND' }
    | { type: 'ADD_MAIN_ICON'; payload: IconOption }
    | { type: 'ADD_SOCIAL_ICON'; payload: IconOption }
    | { type: 'TOGGLE_MAIN_OPTIONS' }
    | { type: 'TOGGLE_SOCIAL_OPTIONS' }
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
    | { type: 'CLOSE_SETTINGS' }
    | { type: 'OPEN_EDIT_GAME'; payload: HomeSlot }
    | { type: 'CLOSE_ADD_GAME' }
    | { type: 'GO_HOME' }
    // Grid Edit Modes
    | { type: 'ENTER_MOVE_MODE'; payload: HomeSlot }
    | { type: 'EXIT_MOVE_MODE' }
    | { type: 'ENTER_RESIZE_MODE'; payload: HomeSlot }
    | { type: 'EXIT_RESIZE_MODE' }

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
}

export interface HomeSlot {
    id: string
    icon: string
    squareImage?: string
    thumbImage?: string
    backgroundImage?: string
    logoImage?: string
    coverImage?: string
    verticalImage?: string
    horizontalImage?: string
    iconImage?: string
    label: string
    onClick?: string
    onMouseEnter?: string
    onMouseLeave?: string
    game?: Game
    position?: number
    /** How many columns this slot spans (default 1) */
    colSpan?: number
    /** How many rows this slot spans (default 1) */
    rowSpan?: number
    scale?: { x: number, y: number }
    page?: number
}

export interface HomeGrid {
    rows: number
    cols: number
    gap: number
    aspectRatio: number
    items: HomeSlot[]
}

export interface GridSettings {
    rows: number
    cols: number
    gap: number
    aspectRatio: number
}