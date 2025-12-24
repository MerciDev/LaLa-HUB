import { appWindow } from '../../index'
import { IconOption, HomeGrid, HomeSlot } from '../../../shared/types'

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

// - - - Grid Control Functions - - - //

export function updateGridConfig(config: Partial<Omit<HomeGrid, 'items'>>): void {
    appWindow?.webContents.send('dispatch-action', { type: 'UPDATE_GRID_CONFIG', payload: config })
}

export function setGridItems(items: HomeSlot[]): void {
    appWindow?.webContents.send('dispatch-action', { type: 'SET_GRID_ITEMS', payload: items })
}

export function addGridItem(item: HomeSlot): void {
    appWindow?.webContents.send('dispatch-action', { type: 'ADD_GRID_ITEM', payload: item })
}

export function removeGridItem(itemId: string): void {
    appWindow?.webContents.send('dispatch-action', { type: 'REMOVE_GRID_ITEM', payload: itemId })
}

export function gridItemControl(actionId: string, item: HomeSlot): void {
    const actionMap: Record<string, () => void> = {
        'mouse-enter-grid-item': () => {
            changeInfoIsland(item.label)
            expandInfoIsland()
        },
        'mouse-leave-grid-item': () => {
            changeInfoIsland('')
            collapseInfoIsland()
        },
    }

    // Si no encuentra la acción exacta, podría ser una dinámica (TODO: Implementar lógica dinámica si id contiene prefijos)
    if (actionMap[actionId]) {
        actionMap[actionId]()
    } else {
        console.log(`Grid Action received: ${actionId}`)
    }
}

// - - - Movement Control Functions - - - //

export let currentSection = 'grid'
export let selectedElement: any = null

export function setSection(section: string): void {
    currentSection = section
    console.log(`[Main] Section set to: ${currentSection}`)
}

export function getSection(): string {
    return currentSection
}

export function setSelectedElement(item: any): void {
    selectedElement = item
}

export function getSelectedItem(): any {
    return selectedElement
}

export function setSelectedSectionItem(section: string, index: number): void {
    appWindow?.webContents.send('dispatch-action', { type: 'SET_SELECTED_INDEX', payload: { section, index } })
}