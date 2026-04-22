import { IconOption, HomeGrid, HomeSlot, ContextOption } from '../../../shared/types'
import { spawn } from 'child_process'
import { debugLog } from '../../utils/debug'
import { toggleLoading } from '../loading/loading'
import { startPlaySession, formatPlaytime } from '../../utils/playtime'

let isLaunching = false

function parseArgs(input: string): string[] {
    const args: string[] = []
    let current = ''
    let inQuote = false
    let quoteChar = ''

    for (const char of input) {
        if ((char === '"' || char === "'") && !inQuote) {
            inQuote = true
            quoteChar = char
        } else if (char === quoteChar && inQuote) {
            inQuote = false
            quoteChar = ''
        } else if (char === ' ' && !inQuote) {
            if (current) {
                args.push(current)
                current = ''
            }
        } else {
            current += char
        }
    }
    if (current) args.push(current)
    return args
}

let appWindow: any = null // Local reference to avoid circular import issues

export function setAppWindow(win: any): void {
    appWindow = win
}

export function showMainWindow(): void {
    if (appWindow) {
        appWindow.show()
        appWindow.focus()
    }
}

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
            debugLog('[Main] Home icon clicked, sending GO_HOME to renderer')
            expandInfoIsland()
            changeInfoIsland('Inicio')
            
            // Dispatch consolidated reset to renderer
            appWindow?.webContents.send('dispatch-action', { type: 'GO_HOME' })
            
            setSection('grid')
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
            appWindow?.webContents.send('dispatch-action', { type: 'OPEN_SETTINGS' })
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
            const minutes = item.game?.playtimeMinutes ?? 0
            const label = minutes > 0
                ? `${item.label}  ·  ${formatPlaytime(minutes)}`
                : item.label
            changeInfoIsland(label)
            expandInfoIsland()
        },
        'mouse-leave-grid-item': () => {
            changeInfoIsland('')
            collapseInfoIsland()
        },
        'run-game': () => {
            if (isLaunching) {
                debugLog(`[Launch] Duplicate call blocked`)
                return
            }
            isLaunching = true

            let gamePath = item.game?.path
            let gameArgs = item.game?.args
            let gameName = item.game?.name
            let gameEmulator = item.game?.emulator
            let retroarchCore = item.game?.retroarchCore

            let gameProcess: any = null

            // 1. Is a RetroArch game (using specific Core)
            if (retroarchCore) {
                const { loadRetroArchSettings } = require('../../utils/settings')
                const raSettings = loadRetroArchSettings()

                if (raSettings && raSettings.path && raSettings.coresPath) {
                    const { join } = require('path')
                    const fullCorePath = join(raSettings.coresPath, retroarchCore)
                    debugLog(`Launching via RetroArch: ${raSettings.path} with core: ${retroarchCore}`)

                    // RetroArch command: -L [core_path] [rom_path]
                    gameProcess = spawn(raSettings.path, ['-L', `"${fullCorePath}"`, `"${gamePath || ''}"`], {
                        shell: true,
                        detached: true,
                        stdio: 'ignore'
                    })
                } else {
                    console.error('[Launch] RetroArch path not configured or settings missing')
                }
            }
            // 2. Is an emulated game (External Emulator)
            else if (gameEmulator) {
                const { existsSync } = require('fs')

                if (!gameEmulator?.path) {
                    console.error(`[Launch] Error: No emulator configured for "${gameName}"`)
                    return
                }
                if (!existsSync(gameEmulator.path)) {
                    console.error(`[Launch] Error: Emulator not found at "${gameEmulator.path}"`)
                    return
                }
                if (!gamePath || !existsSync(gamePath)) {
                    console.error(`[Launch] Error: Game file not found at "${gamePath}"`)
                    return
                }

                debugLog(`Running game: ${gamePath} with emulator: ${gameEmulator.path}`)
                const quotedPath = gamePath.includes(' ') ? `"${gamePath}"` : gamePath
                const emulatorArgs = (gameArgs || '-f -g {roms}').replace(/{roms}/g, quotedPath).replace(/{rom}/g, quotedPath)
                debugLog(`Emulator args: ${emulatorArgs}`)

                const fullCommand = `"${gameEmulator.path}" ${emulatorArgs}`
                gameProcess = spawn(fullCommand, [], {
                    shell: true,
                    detached: true,
                    stdio: 'ignore'
                })
            }
            // 3. Native game (direct .exe without emulator)
            else if (gamePath) {
                const { existsSync } = require('fs')

                if (!existsSync(gamePath)) {
                    console.error(`[Launch] Error: Game executable not found at "${gamePath}"`)
                    return
                }

                debugLog(`Running native game: ${gamePath}`)
                gameProcess = spawn(gamePath, (gameArgs || '').split(' '), {
                    shell: true,
                    detached: true,
                    stdio: 'ignore'
                })
            }

            if (!gameProcess) {
                isLaunching = false
                return
            }

            debugLog(`[Launch] Starting launch sequence for: ${gameName}`)
            toggleLoading(item)

            setTimeout(() => {
                appWindow?.hide()

                const loadingTimeout = setTimeout(() => toggleLoading(), 10000)

                startPlaySession(item.id, gameProcess)

                import('../../utils/windowManager').then(({ focusWindowAndSendKeys }) => {
                    const targetTitle = gameEmulator ? gameEmulator.name : (gameName || '')
                    const keysToSend = item.game?.launchKeys || '%+a'

                    focusWindowAndSendKeys(targetTitle, keysToSend, 30, 1000, (success) => {
                        clearTimeout(loadingTimeout)
                        if (success) {
                            debugLog(`[Launch] Window found, closing loading in 1s`)
                            setTimeout(() => toggleLoading(), 1000)
                        } else {
                            debugLog(`[Launch] Window "${targetTitle}" was not found, closing loading anyway`)
                            toggleLoading()
                        }
                        isLaunching = false
                    }, gameProcess.pid)
                })
            }, 500)

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
export let contextOptions: ContextOption[] = []

export function toggleContextMenu(show?: boolean): void {
    if (show !== undefined) {
        isContextMenuVisible = show
    } else {
        isContextMenuVisible = !isContextMenuVisible
    }

    if (isContextMenuVisible) {
        if (selectedElement && selectedElement.game) {
            const playtime = selectedElement.game.playtimeMinutes ?? 0
            const playtimeStr = playtime > 0 ? formatPlaytime(playtime) : 'No jugado'
            setContextOptions([
                { id: 'info',   label: playtimeStr,  icon: 'mynaui:clock',                action: '' },
                { id: 'edit',   label: 'Editar',      icon: 'mynaui:edit',                 action: 'EDIT_GAME' },
                { id: 'move',   label: 'Mover',       icon: 'mynaui:arrow-up-down-left-right', action: 'MOVE_GAME' },
                { id: 'resize', label: 'Tamaño',      icon: 'mynaui:expand',               action: 'RESIZE_GAME' },
                { id: 'remove', label: 'Eliminar',    icon: 'mynaui:trash',                action: 'REMOVE_GAME' }
            ])
        } else {
            setContextOptions([
                { id: 'add', label: 'Add Game', icon: 'mynaui:plus-square', action: 'ADD_GAME' }
            ])
        }
    }

    appWindow?.webContents.send('dispatch-action', { type: 'TOGGLE_CONTEXT_MENU', payload: isContextMenuVisible })
    console.log(`[Main] Context Menu visible: ${isContextMenuVisible}`)
}

export function executeContextAction(action: string): void {
    if (action === 'EDIT_GAME' && selectedElement) {
        // Dispatch to renderer — it will open AddGameModal in edit mode
        appWindow?.webContents.send('dispatch-action', { type: 'OPEN_EDIT_GAME', payload: selectedElement })
        toggleContextMenu(false)
        return // Do NOT call setSection('grid'); let OPEN_EDIT_GAME handle the new section
    } else if (action === 'REMOVE_GAME' && selectedElement) {
        const { removeSlot, loadSlots } = require('../../utils/storage')
        removeSlot(selectedElement.id)
        const slots = loadSlots()
        setGridItems(slots)
        debugLog(`[Context] Removed game slot: ${selectedElement.id}`)
    } else if (action === 'get-info') {
        debugLog(JSON.stringify(selectedElement, null, 2))
        changeInfoIsland('Info enviada al debug log')
        setTimeout(() => changeInfoIsland(''), 2000)
    }
    // Close menu after action and return to grid for standard actions
    toggleContextMenu(false)
    setSection('grid')
}

export function setContextOptions(options: ContextOption[]): void {
    contextOptions = options
    appWindow?.webContents.send('dispatch-action', { type: 'SET_CONTEXT_OPTIONS', payload: options })
}

export function addContextOption(option: ContextOption): void {
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