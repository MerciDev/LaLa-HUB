import { appWindow } from '../../index'
import { IconOption, HomeGrid, HomeSlot } from '../../../shared/types'
import { spawn } from 'child_process'
import { debugLog } from '../../utils/debug'
import { toggleLoading } from '../loading/loading'

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
        'run-game': () => {
            let gamePath = item.game?.path
            let gameArgs = item.game?.args
            let gameName = item.game?.name
            let gameEmulator = item.game?.emulator

            // Is an emulated game
            if (gameEmulator) {
                debugLog(`Running emulated game: ${gameEmulator.path}`)
                let emulatorArgs = (gameEmulator.args || '').replace('{roms}', `"${gamePath || ''}"`)

                const gameProcess = spawn(gameEmulator.path, emulatorArgs.split(' '), {
                    shell: true,
                    detached: true,
                    stdio: 'ignore'
                });
            }
            // Is a direct game
            else {
                debugLog(`Running game: ${gamePath}`)

                const gameProcess = spawn((gamePath || ''), (gameArgs || '').split(' '), {
                    shell: true,
                    detached: true,
                    stdio: 'ignore'
                });
            }
            toggleLoading()
            appWindow?.hide()
            debugLog(`Activating window and sending keys to: ${gameName}`)
            require('child_process').exec(
                `powershell -Command "$wsh = New-Object -ComObject WScript.Shell; $result = $wsh.AppActivate('${gameEmulator ? gameEmulator.name : gameName}'); Write-Output $result; Start-Sleep -Milliseconds 500; $wsh.SendKeys('%+a')"`,
                (error: Error | null, stdout: string, stderr: string) => {
                    if (error) {
                        console.error('PowerShell error:', error)
                    }
                    debugLog(`AppActivate result: ${stdout.trim()}`)
                    if (stderr) console.error('PowerShell stderr:', stderr)
                }
            )
            setTimeout(() => {
                toggleLoading()
            }, 5000);

        },
    }

    if (actionMap[actionId]) {
        actionMap[actionId]()
    } else {
        console.log(`Grid Action received: ${actionId}`)
    }
}

// - - - Movement Control Functions - - - //

export let currentSection = 'grid'
export let selectedElement: any = null
export let currentPage = 0
export let totalPages = 0

export function setTotalPages(pages: number): void {
    totalPages = pages
    console.log(`[Main] Total pages set to: ${totalPages}`)
}

export function setCurrentPage(page: number): void {
    if (page >= 0 && page < totalPages) {
        currentPage = page
        appWindow?.webContents.send('dispatch-action', { type: 'SET_GRID_PAGE', payload: currentPage })
        console.log(`[Main] Current page set to: ${currentPage}`)
    }
}

export function handlePageChange(direction: 'next' | 'prev'): void {
    if (direction === 'next' && currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1)
    } else if (direction === 'prev' && currentPage > 0) {
        setCurrentPage(currentPage - 1)
    }
}

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

export let isContextMenuVisible = false
export let contextOptions: any[] = []

export function toggleContextMenu(show?: boolean): void {
    if (show !== undefined) {
        isContextMenuVisible = show
    } else {
        isContextMenuVisible = !isContextMenuVisible
    }

    if (isContextMenuVisible) {
        if (selectedElement && selectedElement.game) {
            setContextOptions([
                { id: 'info', label: 'Get Info', icon: 'mynaui:info-circle', action: 'get-info' }
            ])
        } else {
            setContextOptions([
                { id: 'add', label: 'Add', icon: 'mynaui:plus-square', action: 'add-game' }
            ])
        }
    }

    appWindow?.webContents.send('dispatch-action', { type: 'TOGGLE_CONTEXT_MENU', payload: isContextMenuVisible })
    console.log(`[Main] Context Menu visible: ${isContextMenuVisible}`)
}

export function executeContextAction(action: string): void {
    if (action === 'get-info') {
        debugLog(JSON.stringify(selectedElement, null, 2))
        changeInfoIsland('Info sent to debug log')
        setTimeout(() => changeInfoIsland(''), 2000)
    } else if (action === 'add-game') {
        mainOptionControl('click-add')
    }
    // Close menu after action
    toggleContextMenu(false)
    setSection('grid')
}

export function setContextOptions(options: any[]): void {
    contextOptions = options
    appWindow?.webContents.send('dispatch-action', { type: 'SET_CONTEXT_OPTIONS', payload: options })
}

export function addContextOption(option: any): void {
    contextOptions.push(option)
    appWindow?.webContents.send('dispatch-action', { type: 'ADD_CONTEXT_OPTION', payload: option })
}

export function removeContextOption(id: string): void {
    contextOptions = contextOptions.filter(o => o.id !== id)
    appWindow?.webContents.send('dispatch-action', { type: 'REMOVE_CONTEXT_OPTION', payload: id })
}

export function setSelectedSectionItem(section: string, index: number): void {
    appWindow?.webContents.send('dispatch-action', { type: 'SET_SELECTED_INDEX', payload: { section, index } })
}