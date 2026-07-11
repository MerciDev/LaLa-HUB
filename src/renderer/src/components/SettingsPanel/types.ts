export type Tab = 'platforms' | 'emulators' | 'controls' | 'grid' | 'interface'
export type FocusArea = 'nav' | 'nav_save' | 'nav_close' | 'content' | 'footer'
export type ControlsSubTab = 'menu' | 'keyboard' | 'gamepad'

export interface EmulatorForm {
    name: string
    path: string
    args: string
    platforms: string[]
}

export interface AppConfig {
    id: string
    name: string
    executablePath: string
    args: string
    downloadUrl?: string
    useRetroarch?: boolean
}

export interface PlatformForm {
    id: string
    name: string
    icon: string
    image: string
    company: string
    releaseDate: string
    consoleImage: string
    abbreviation: string
    nameImage: string
    iconImage: string
    romPath: string
    biosPath: string
    enableRichPresence: boolean
    defaultAppId: string
    apps: any[]
}

export interface SettingsPanelProps {
    visible: boolean
    onClose: () => void
    onJumpToHeader: (side: 'left' | 'right') => void
    gridConfig?: { rows: number; cols: number; gap: number; aspectRatio: number }
    onGridConfigChange?: (rows: number, cols: number, gap: number, aspectRatio: number) => void
    minGridDimensions?: { minRows: number; minCols: number }
    onClearGrid?: () => void
    initialTab?: Tab
}
