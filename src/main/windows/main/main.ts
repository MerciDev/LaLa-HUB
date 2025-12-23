import { appWindow } from '../../index'
import { IconOption } from '../../../shared/types'
import { BrowserWindow } from 'electron'

export function changeInfoIsland(text: string): void {
    appWindow?.webContents.send('dispatch-action', { type: 'CHANGE_INFO_ISLAND', payload: text })
}

export function expandInfoIsland(): void {
    appWindow?.webContents.send('dispatch-action', { type: 'EXPAND_INFO_ISLAND' })
}

export function collapseInfoIsland(): void {
    appWindow?.webContents.send('dispatch-action', { type: 'COLLAPSE_INFO_ISLAND' })
}

// - - - Main Options Functions - - - //
export function addMainIcon(icon: IconOption): void {
    appWindow?.webContents.send('dispatch-action', { type: 'ADD_MAIN_ICON', payload: icon })
}

export function toggleMainOptions(): void {
    appWindow?.webContents.send('dispatch-action', { type: 'TOGGLE_MAIN_OPTIONS' })
}

// - - - Social Options Functions - - - //
export function addSocialIcon(icon: IconOption): void {
    appWindow?.webContents.send('dispatch-action', { type: 'ADD_SOCIAL_ICON', payload: icon })
}

export function toggleSocialOptions(): void {
    appWindow?.webContents.send('dispatch-action', { type: 'TOGGLE_SOCIAL_OPTIONS' })
}


// - - - Icon Click Functions - - - //
export function mainOptionControl(actionId: string): void {
    const actionMap: Record<string, () => void> = {
        // Home
        'click-home': () => {
            expandInfoIsland()
            changeInfoIsland('Inicio')
        },
        'mouse-enter-home': () => {
            expandInfoIsland()
            changeInfoIsland('Inicio')
        },
        'mouse-leave-home': () => {
            changeInfoIsland('')
            collapseInfoIsland()
        },
        // Settings
        'click-settings': () => {
            expandInfoIsland()
            changeInfoIsland('Configuración')
        },
        'mouse-enter-settings': () => {
            expandInfoIsland()
            changeInfoIsland('Configuración')
        },
        'mouse-leave-settings': () => {
            changeInfoIsland('')
            collapseInfoIsland()
        },
        // Add
        'click-add': () => {
            expandInfoIsland()
            changeInfoIsland('Agregar Juego')
        },
        'mouse-enter-add': () => {
            expandInfoIsland()
            changeInfoIsland('Agregar Juego')
        },
        'mouse-leave-add': () => {
            changeInfoIsland('')
            collapseInfoIsland()
        },
        // Profile
        'click-profile': () => {
            expandInfoIsland()
            changeInfoIsland('Perfil')
        },
        'mouse-enter-profile': () => {
            expandInfoIsland()
            changeInfoIsland('Perfil')
        },
        'mouse-leave-profile': () => {
            changeInfoIsland('')
            collapseInfoIsland()
        },
        // Friends
        'click-friends': () => {
            expandInfoIsland()
            changeInfoIsland('Amigos')
        },
        'mouse-enter-friends': () => {
            expandInfoIsland()
            changeInfoIsland('Amigos')
        },
        'mouse-leave-friends': () => {
            changeInfoIsland('')
            collapseInfoIsland()
        },
        // Trophies
        'click-trophies': () => {
            expandInfoIsland()
            changeInfoIsland('Trofeos')
        },
        'mouse-enter-trophies': () => {
            expandInfoIsland()
            changeInfoIsland('Trofeos')
        },
        'mouse-leave-trophies': () => {
            changeInfoIsland('')
            collapseInfoIsland()
        },
    }
    actionMap[actionId]?.()
}