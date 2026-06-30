import { ConsolePanelTab } from '../SidePanel'
import { EmulatorForm, PlatformForm } from './types'

export const KEYMAP_LABELS: Record<string, string> = {
    overlay: 'Overlay (Menú)', contextMenu: 'Menú Contextual',
    openMain: 'Menú Lateral Sistema', openSocial: 'Menú Lateral Social',
    right: 'Derecha', left: 'Izquierda', up: 'Arriba', down: 'Abajo',
    select: 'Seleccionar', back: 'Atrás', nextPage: 'Página Siguiente', prevPage: 'Página Anterior',
    gamepadA: 'Botón A', gamepadB: 'Botón B', gamepadX: 'Botón X', gamepadY: 'Botón Y',
    gamepadLB: 'Bumper Izq. (LB)', gamepadRB: 'Bumper Der. (RB)',
    gamepadLT: 'Gatillo Izq. (LT)', gamepadRT: 'Gatillo Der. (RT)',
    gamepadSelect: 'Select / View', gamepadStart: 'Start / Menu',
    gamepadLeftStick: 'Stick Izquierdo', gamepadRightStick: 'Stick Derecho',
    gamepadUp: 'D-Pad Arriba', gamepadDown: 'D-Pad Abajo',
    gamepadLeft: 'D-Pad Izquierda', gamepadRight: 'D-Pad Derecha'
}

export const KEYBOARD_KEYS = ['overlay', 'contextMenu', 'openMain', 'openSocial', 'up', 'down', 'left', 'right', 'select', 'back', 'nextPage', 'prevPage']

export const GAMEPAD_KEYS = [
    'gamepadA', 'gamepadB', 'gamepadX', 'gamepadY',
    'gamepadLB', 'gamepadRB', 'gamepadLT', 'gamepadRT',
    'gamepadSelect', 'gamepadStart', 'gamepadLeftStick', 'gamepadRightStick',
    'gamepadUp', 'gamepadDown', 'gamepadLeft', 'gamepadRight'
]

export const GAMEPAD_BUTTON_NAMES: Record<number, string> = {
    0: 'A', 1: 'B', 2: 'X', 3: 'Y',
    4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
    8: 'Select', 9: 'Start', 10: 'Left Stick', 11: 'Right Stick',
    12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right',
    20: 'Left', 21: 'Right', 22: 'Up', 23: 'Down'
}

export const TABS: ConsolePanelTab[] = [
    { id: 'platforms', label: 'Plataformas', icon: 'game-icons:platform',    description: 'Define las consolas y sistemas disponibles' },
    { id: 'emulators', label: 'Emuladores',  icon: 'mynaui:chip',         description: 'Gestiona tus emuladores y rutas de acceso' },
    { id: 'controls',  label: 'Controles',   icon: 'mdi:controller',     description: 'Reasigna los botones de tu mando o teclado' },
    { id: 'grid',      label: 'Cuadrícula',  icon: 'mynaui:grid',         description: 'Personaliza las filas, columnas y aspecto del grid' },
    { id: 'interface', label: 'Interfaz',    icon: 'mynaui:monitor',      description: 'Personaliza la pantalla de inicio y carátulas (SteamGridDB)' },
]

export const TAB_IDS = TABS.map(t => t.id)

export const EMPTY_EMU: EmulatorForm = { name: '', path: '', args: '', platforms: [] }
export const EMPTY_PLATFORM: PlatformForm = { id: '', name: '', icon: '', image: '', company: '' }
