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