import { IconOption, HomeGrid, HomeSlot, ContextOption } from '../../../shared/types'
import { removeSlot, loadSlots } from '../../utils/storage'
import { spawn } from 'child_process'
import { ipcMain } from 'electron'
import { debugLog } from '../../utils/debug'
import { showLoading, hideLoading } from '../loading/loading'
import { startPlaySession, formatPlaytime } from '../../utils/playtime'
import { pullSaveFromCloud } from '../../utils/cloudSaves'

let isLaunching = false

// @ts-ignore
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

// - - - Social Options Functions (Left) - - - //
export function addSocialIcon(icon: IconOption): void {
    appWindow?.webContents.send('dispatch-action', { type: 'ADD_SOCIAL_ICON', payload: icon })
}

export function toggleSocialMenu(): void {
    appWindow?.webContents.send('dispatch-action', { type: 'TOGGLE_SOCIAL_MENU' })
}

// - - - Personal Options Functions (Right) - - - //
export function addPersonalIcon(icon: IconOption): void {
    appWindow?.webContents.send('dispatch-action', { type: 'ADD_PERSONAL_ICON', payload: icon })
}

export function togglePersonalMenu(): void {
    appWindow?.webContents.send('dispatch-action', { type: 'TOGGLE_PERSONAL_MENU' })
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
            // Renderer handles info island text restoration
        },
        // Downloads
        'click-downloads': () => {
            expandInfoIsland()
            changeInfoIsland('Descargas')
            appWindow?.webContents.send('dispatch-action', { type: 'OPEN_DOWNLOADS' })
        },
        'mouse-enter-downloads': () => {
            expandInfoIsland()
            changeInfoIsland('Descargas')
        },
        'mouse-leave-downloads': () => {
            // Renderer handles info island text restoration
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
            // Renderer handles info island text restoration
        },
        // Add
        'click-add': () => {
            expandInfoIsland()
            changeInfoIsland('Agregar Juego')
            appWindow?.webContents.send('dispatch-action', { type: 'OPEN_ADD_GAME' })
        },
        'mouse-enter-add': () => {
            expandInfoIsland()
            changeInfoIsland('Agregar Juego')
        },
        'mouse-leave-add': () => {
            // Renderer handles info island text restoration
        },
        // Profile
        'click-profile': () => {
            expandInfoIsland()
            changeInfoIsland('Perfil')
            appWindow?.webContents.send('dispatch-action', { type: 'OPEN_PROFILE' })
        },
        'mouse-enter-profile': () => {
            expandInfoIsland()
            changeInfoIsland('Perfil')
        },
        'mouse-leave-profile': () => {
            // Renderer handles info island text restoration
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
            // Renderer handles info island text restoration
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
            // Renderer handles info island text restoration
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
            // Renderer handles restoring the info island text via its effect
        },
        'run-game': async () => {
            if (isLaunching) {
                debugLog(`[Launch] Duplicate call blocked`)
                return
            }
            isLaunching = true

            if (item.game?.cloudSyncEnabled && item.game?.savesPath) {
                debugLog(`[Launch] Checking cloud saves for ${item.label}...`)
                await pullSaveFromCloud(item).catch(() => {})
            }

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
            // 3. Native game (direct .exe / .app without emulator)
            else if (gamePath) {
                const { existsSync } = require('fs')

                if (!existsSync(gamePath)) {
                    console.error(`[Launch] Error: Game executable not found at "${gamePath}"`)
                    return
                }

                debugLog(`Running native game: ${gamePath}`)

                // On macOS, .app bundles must be opened with the 'open' command
                if (process.platform === 'darwin' && gamePath.endsWith('.app')) {
                    const extraArgs = (gameArgs || '').trim()
                    const openCmd = extraArgs ? `open "${gamePath}" --args ${extraArgs}` : `open "${gamePath}"`
                    gameProcess = spawn(openCmd, [], {
                        shell: true,
                        detached: true,
                        stdio: 'ignore'
                    })
                } else {
                    // On Windows, use shell: true so paths with spaces and special
                    // characters are handled correctly (same as the emulator path above).
                    const nativeArgs = gameArgs ? gameArgs.split(' ') : []
                    const useShell = process.platform === 'win32'
                    const spawnPath = useShell
                        ? `"${gamePath}"` // quote the path for shell execution
                        : gamePath
                    gameProcess = spawn(spawnPath, nativeArgs, {
                        shell: useShell,
                        detached: true,
                        stdio: 'ignore'
                    })
                    gameProcess.on('error', (err: Error) => {
                        console.error(`[Launch] Failed to start process: ${err.message}`)
                    })
                }
            }

            if (!gameProcess) {
                isLaunching = false
                return
            }

            debugLog(`[Launch] Starting launch sequence for: ${gameName}`)

            // 1. Hide the main app window IMMEDIATELY so it doesn't flash in front.
            // 2. Show loading AFTER hiding — avoids the race where loading appears but main window is still on top.
            appWindow?.hide()
            showLoading(item)

            // Safety timeout: hide loading after 90s if process detection never succeeds
            const loadingTimeout = setTimeout(() => {
                debugLog(`[Launch] Safety timeout reached — hiding loading screen`)
                hideLoading()
                isLaunching = false
            }, 90000)

            startPlaySession(item.id, gameProcess)

            // Notify index.ts to start the main-process gamepad poller
            // so RS+Select works even while the game has focus
            ipcMain.emit('game-started')

            // Stop the poller when the game process exits
            gameProcess.on('exit', () => {
                ipcMain.emit('game-ended')
            })

            import('../../utils/windowManager').then(({ focusWindowAndSendKeys }) => {
                // On macOS, use the .app bundle name as the process name (more reliable)
                let targetTitle = gameEmulator ? gameEmulator.name : (gameName || '')
                if (process.platform === 'darwin' && gamePath?.endsWith('.app')) {
                    const bundleName = gamePath.split('/').pop()?.replace(/\.app$/, '') || targetTitle
                    targetTitle = bundleName
                    debugLog(`[Launch] Mac: using bundle name "${bundleName}" as process target`)
                }
                const keysToSend = item.game?.launchKeys || '%+a'

                // On Windows, derive the process name from the exe path if not manually set.
                // e.g. "E:\Games\Cyberpunk 2077\bin\x64\Cyberpunk2077.exe" → "Cyberpunk2077"
                // This is more reliable than using the game title which may have spaces/typos.
                let winProcessName = item.game?.processName
                if (process.platform === 'win32' && !winProcessName && gamePath) {
                    const exeFile = gamePath.split(/[\\/]/).pop() || ''
                    winProcessName = exeFile.replace(/\.exe$/i, '') || undefined
                    if (winProcessName) {
                        debugLog(`[Launch] Win: auto-derived process name "${winProcessName}" from path`)
                    }
                }

                // 60 attempts × 1500ms = 90s — enough for heavy launchers like Minecraft
                focusWindowAndSendKeys(targetTitle, keysToSend, 60, 1500, (success) => {
                    clearTimeout(loadingTimeout)
                    if (success) {
                        debugLog(`[Launch] Window found — hiding loading in 1.5s`)
                        setTimeout(() => hideLoading(), 1500)
                    } else {
                        debugLog(`[Launch] Window "${targetTitle}" not found within timeout — hiding loading`)
                        hideLoading()
                    }
                    isLaunching = false
                }, gameProcess.pid, winProcessName)
            })

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

let lastPageChangeTime = 0
const PAGE_CHANGE_COOLDOWN = 250 // ms

export function handlePageChange(direction: 'next' | 'prev'): void {
    const now = Date.now()
    if (now - lastPageChangeTime < PAGE_CHANGE_COOLDOWN) {
        // Still send the current page to unstick the renderer even if we ignore the input
        appWindow?.webContents.send('dispatch-action', { type: 'SET_GRID_PAGE', payload: currentPage })
        return
    }
    lastPageChangeTime = now

    if (direction === 'next' && currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1)
    } else if (direction === 'prev' && currentPage > 0) {
        setCurrentPage(currentPage - 1)
    } else {
        // If no change occurs (e.g. at boundaries), re-send current page 
        // to unstick the renderer's pending selection state.
        appWindow?.webContents.send('dispatch-action', { type: 'SET_GRID_PAGE', payload: currentPage })
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
        if (selectedElement && (selectedElement.game || selectedElement.iframeUrl || selectedElement.videoUrl)) {
            const isIframe = !!selectedElement.iframeUrl
            const isVideo = !!selectedElement.videoUrl
            const options: ContextOption[] = []
            
            if (!isIframe && !isVideo) {
                const playtime = selectedElement.game?.playtimeMinutes ?? 0
                const playtimeStr = playtime > 0 ? formatPlaytime(playtime) : 'No jugado'
                options.push({ id: 'info', label: playtimeStr, icon: 'mdi:clock-outline', action: '' })
            }
            
            options.push(
                { id: 'edit',   label: 'Editar',      icon: 'mynaui:edit',                 action: isIframe ? 'EDIT_IFRAME' : isVideo ? 'EDIT_VIDEO' : 'EDIT_GAME' },
                { id: 'move',   label: 'Mover',       icon: 'mdi:cursor-move',                 action: 'MOVE_GAME' },
                { id: 'shift',  label: 'Desplazar Contenido', icon: 'mdi:swap-horizontal', action: 'SHIFT_CONTENT' },
                { id: 'resize', label: 'Tamaño',      icon: 'mdi:arrow-expand-all',             action: 'RESIZE_GAME' },
                { id: 'remove', label: 'Eliminar',    icon: 'mynaui:trash',                action: 'REMOVE_GAME' }
            )
            setContextOptions(options)
        } else {
            setContextOptions([
                { id: 'add', label: 'Seleccionar de la Biblioteca', icon: 'mynaui:folder', action: 'ASSIGN_GAME_FROM_LIBRARY' }
                // { id: 'add_iframe', label: 'Añadir Iframe Web', icon: 'mynaui:globe', action: 'ADD_IFRAME' },
                // { id: 'add_video', label: 'Añadir Vídeo Nativo', icon: 'mynaui:video', action: 'ADD_VIDEO' }
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
        removeSlot(selectedElement.id)
        const slots = loadSlots()
        setGridItems(slots)
        debugLog(`[Context] Removed game slot: ${selectedElement.id}`)
    } else if (action === 'get-info') {
        debugLog(JSON.stringify(selectedElement, null, 2))
        changeInfoIsland('Info enviada al debug log')
        setTimeout(() => changeInfoIsland(''), 2000)
    } else if (action === 'ASSIGN_GAME_FROM_LIBRARY') {
        appWindow?.webContents.send('dispatch-action', { type: 'OPEN_LIBRARY_PICKER' })
        toggleContextMenu(false)
        return
    } else if (action === 'SHIFT_CONTENT' || action === 'MOVE_GAME' || action === 'RESIZE_GAME') {
        toggleContextMenu(false)
        return
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