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
    args: string
}

export interface Console {
    id: string
    name: string
    emulated?: boolean
    emulator?: Emulator
}

export interface Game {
    id: string
    name: string
    console?: Console
    emulator?: Emulator
    path?: string
    args?: string
}

export interface HomeSlot {
    id: string
    icon: string
    label: string
    onClick?: string
    onMouseEnter?: string
    onMouseLeave?: string
    game?: Game
    position?: number
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