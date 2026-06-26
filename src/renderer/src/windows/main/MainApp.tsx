import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppAction, HomeGrid, HomeSlot, IconOption, ContextOption, InterfaceSettings, AuthState, AuthResult, SyncStatus } from '../../../../shared/types'
import { Icon } from '@iconify/react'

import { useGamepad } from '../../hooks/useGamepad'
import { useGridNavigation } from '../../hooks/useGridNavigation'
import { useInfoIsland } from '../../hooks/useInfoIsland'
import { useInputFocus } from '../../hooks/useInputFocus'
import { sfx } from '../../utils/audioManager'

import NavigationHeader from '../../components/NavigationHeader'
import HomeGridComponent from '../../components/HomeGrid'
import { buildOccupiedCells, getSlotCells, repackItemsAfterResize, computeMinGridDimensions } from '../../utils/gridUtils'
import PageNavigator from '../../components/PageNavigator'
import ContextMenu from '../../components/ContextMenu'
import LibraryPickerModal from '../../components/LibraryPickerModal'
import AddGamePanel from '../../components/AddGameModal'
import SettingsPanel from '../../components/SettingsPanel'
import { DownloadManager } from '../../components/download/DownloadManager'
import LoginScreen from '../../components/LoginScreen'
import ProfilePage from '../../components/ProfilePage'
import BackgroundLayer from '../../components/BackgroundLayer'
import ModeHUD from '../../components/ModeHUD'

function MainApp(): React.JSX.Element {
    useGamepad()

    // --- Auth ---
    const [authState, setAuthState] = useState<AuthState>({ isLoggedIn: false, user: null, session: null })
    const [authLoading, setAuthLoading] = useState(true)
    const [, setSyncStatus] = useState<SyncStatus>({ lastSyncAt: null, pendingUploads: 0, isSyncing: false })

    useEffect(() => {
        window.api.auth.getStatus().then(state => {
            setAuthState(state)
            setAuthLoading(false)
        }).catch(() => setAuthLoading(false))

        const unsub = window.api.auth.onAuthChange((state) => {
            setAuthState(state)
        })
        return unsub
    }, [])

    useEffect(() => {
        const unsub = window.api.sync.onStatusChange((status) => {
            setSyncStatus(status)
        })
        return unsub
    }, [])

    const handleAuthSuccess = useCallback((result: AuthResult) => {
        if (result.user) {
            setAuthState({ isLoggedIn: true, user: result.user, session: null })
        } else {
            setAuthState({ isLoggedIn: false, user: null, session: null })
        }
    }, [])

    // --- Background ---
    const [interfaceSettings, setInterfaceSettings] = useState<InterfaceSettings>({ showGameBackground: true })
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null)

    // --- Icons ---
    const [socialIcons, setSocialIcons] = useState<IconOption[]>([])
    const [socialExpanded, setSocialExpanded] = useState(false)
    const [personalIcons, setPersonalIcons] = useState<IconOption[]>([])
    const [personalExpanded, setPersonalExpanded] = useState(false)

    useEffect(() => {
        setPersonalIcons(prev => prev.map(icon => {
            if (icon.id === 'profile') {
                return {
                    ...icon,
                    extraData: {
                        ...icon.extraData,
                        username: authState.isLoggedIn && authState.user ? authState.user.username : (icon.extraData?.username || 'Usuario'),
                        avatar: authState.isLoggedIn && authState.user ? (authState.user.avatarUrl || '') : ''
                    }
                }
            }
            return icon
        }))
    }, [authState])

    // --- Info Island ---
    const { displayText, islandWidth, textOpacity, setInfoText, setIslandWidth, collapse: collapseIsland } = useInfoIsland()

    // --- Grid ---
    const [homeGrid, setHomeGrid] = useState<HomeGrid>({
        rows: 4,
        cols: 6,
        aspectRatio: 1,
        gap: 10,
        items: []
    })
    const [currentPage, setCurrentPage] = useState(0)
    const [direction, setDirection] = useState<'next' | 'prev'>('next')

    const {
        selectedSlotIndex,
        setSelectedSlotIndex,
        navigate: rawGridNavigate,
        applyPendingSelection,
        clearPendingSelection
    } = useGridNavigation(homeGrid.rows, homeGrid.cols)

    const gridNavigate = (action: string, items: HomeSlot[], currentPage: number) => {
        rawGridNavigate(action, items, currentPage, totalPages)
    }

    /** Find slot that occupies selectedSlotIndex (anchor or covered cell) */
    const selectedSlotItem = React.useMemo(() => {
        if (selectedSlotIndex === null) return null
        const page = currentPage
        const cols = homeGrid.cols
        for (const item of homeGrid.items) {
            if ((item.page ?? 0) !== page) continue
            if (item.position === undefined) continue
            const cells = getSlotCells(item.position, item.colSpan ?? 1, item.rowSpan ?? 1, cols)
            if (cells.includes(selectedSlotIndex)) return item
        }
        return null
    }, [selectedSlotIndex, currentPage, homeGrid.items, homeGrid.cols])

    const totalPages = Math.max(
        3,
        Math.max(0, ...homeGrid.items.map((i) => i.page ?? 0)) + 1,
        currentPage + 1
    )

    useEffect(() => {
        window.api?.ui?.getSettings().then(setInterfaceSettings).catch(console.error)
    }, [])

    useEffect(() => {
        window.api?.movementControl?.send('SET_TOTAL_PAGES', totalPages)
    }, [totalPages])

    // --- Header Navigation ---
    const [focusedHeader, setFocusedHeader] = useState<'left' | 'right' | null>(null)
    const [focusedHeaderIndex, setFocusedHeaderIndex] = useState(0)
    const [lastGridIndex, setLastGridIndex] = useState(0)

    // --- Context Menu ---
    const [contextMenuVisible, setContextMenuVisible] = useState(false)
    const [contextOptions, setContextOptions] = useState<ContextOption[]>([])
    const [contextMenuSelectedIndex, setContextMenuSelectedIndex] = useState(0)

    // --- Add Game Panel ---
    const [addGamePanelVisible, setAddGamePanelVisible] = useState(false)
    const [addGameSelectedIndex, setAddGameSelectedIndex] = useState(0)
    const [editSlot, setEditSlot] = useState<HomeSlot | null>(null)

    // --- Settings Panel ---
    const [settingsPanelVisible, setSettingsPanelVisible] = useState(false)

    // --- Download Manager ---
    const [downloadManagerVisible, setDownloadManagerVisible] = useState(false)

    // --- Profile Page & Picker ---
    const [profilePageVisible, setProfilePageVisible] = useState(false)
    const [libraryPickerVisible, setLibraryPickerVisible] = useState(false)
    const [pickerTargetIndex, setPickerTargetIndex] = useState<number | null>(null)

    // --- Move Mode ---
    const [moveMode, setMoveMode] = useState<{ slotId: string; ghostPosition: number } | null>(null)

    // --- Resize Mode ---
    const [resizeMode, setResizeMode] = useState<{ slotId: string } | null>(null)

    // --- Route Navigation Stack ---
    const navStackRef = useRef<string[]>([])
    const currentViewRef = useRef<string>('grid')

    const pushRoute = useCallback((view: string) => {
        const current = currentViewRef.current
        if (current !== 'grid' && current !== view) {
            navStackRef.current = [...navStackRef.current, current]
        }
        currentViewRef.current = view
        const parts: string[] = []
        for (const v of navStackRef.current) {
            parts.push(viewLabels[v] || v)
        }
        if (view !== 'grid') {
            parts.push(viewLabels[view] || view)
        }
        if (parts.length > 0) {
            setInfoText(parts.join('  ›  '))
            setIslandWidth('fit-content')
        }
    }, [setInfoText, setIslandWidth])

    useEffect(() => {
        if (settingsPanelVisible) currentViewRef.current = 'settings'
        else if (addGamePanelVisible) currentViewRef.current = 'add-game'
        else if (downloadManagerVisible) currentViewRef.current = 'downloads'
        else if (profilePageVisible) currentViewRef.current = 'profile'
        else if (libraryPickerVisible) currentViewRef.current = 'library-picker'
        else currentViewRef.current = 'grid'
    }, [settingsPanelVisible, addGamePanelVisible, downloadManagerVisible, profilePageVisible, libraryPickerVisible])

    const viewLabels: Record<string, string> = {
        settings: 'Configuración',
        profile: 'Perfil',
        downloads: 'Descargas',
        'add-game': 'Añadir Juego',
        'library-picker': 'Biblioteca',
    }

    const goBack = useCallback(() => {
        sfx.close()
        const prev = navStackRef.current.pop()
        setSettingsPanelVisible(false)
        setAddGamePanelVisible(false)
        setDownloadManagerVisible(false)
        setProfilePageVisible(false)
        setLibraryPickerVisible(false)
        setFocusedHeader(null)
        setSocialExpanded(false)
        setPersonalExpanded(false)

        if (prev === 'settings' || prev === 'downloads' || prev === 'profile' || prev === 'add-game' || prev === 'library-picker') {
            currentViewRef.current = prev
            if (prev === 'settings') {
                setSettingsPanelVisible(true)
                setSelectedSlotIndex(null)
                window.api.movementControl.send('SET_SECTION', 'settings')
            } else if (prev === 'downloads') {
                setDownloadManagerVisible(true)
                setSelectedSlotIndex(null)
                window.api.movementControl.send('SET_SECTION', 'download-manager')
            } else if (prev === 'profile') {
                setProfilePageVisible(true)
                setSelectedSlotIndex(null)
                window.api.movementControl.send('SET_SECTION', 'profile')
            } else if (prev === 'add-game') {
                setAddGamePanelVisible(true)
                setSelectedSlotIndex(null)
                window.api.movementControl.send('SET_SECTION', 'add-game-modal')
            } else if (prev === 'library-picker') {
                setLibraryPickerVisible(true)
                setSelectedSlotIndex(null)
                window.api.movementControl.send('SET_SECTION', 'library-picker')
            }
            setLastGridIndex(stateRef.current.selectedSlotIndex ?? 0)
            const parts: string[] = []
            for (const v of navStackRef.current) {
                parts.push(viewLabels[v] || v)
            }
            parts.push(viewLabels[prev] || prev)
            setInfoText(parts.join('  ›  '))
            setIslandWidth('fit-content')
        } else {
            currentViewRef.current = 'grid'
            setSelectedSlotIndex(prevIdx => prevIdx === null ? (stateRef.current.selectedSlotIndex ?? 0) : prevIdx)
            setInfoText('LaLa Hub')
            setIslandWidth('56px')
            window.api.movementControl.send('SET_SECTION', 'grid')
        }
    }, [setInfoText, setIslandWidth])

    // Ref for move/resize (always fresh values in handlers)
    const stateRef = useRef({
        homeGrid, currentPage, selectedSlotIndex, moveMode, resizeMode, lastGridIndex: 0
    })
    const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isGridLoadedRef = useRef(false)
    useEffect(() => {
        stateRef.current = { homeGrid, currentPage, selectedSlotIndex, moveMode, resizeMode, lastGridIndex }
    })

    // ─── Move Mode Helpers ────────────────────────────────────────────────────────

    const persistItems = useCallback(async (items: HomeSlot[]) => {
        // Save all items to backend by calling slot-add-multiple
        await window.api?.slots?.addMultiple(items)
        setHomeGrid(prev => ({ ...prev, items }))
    }, [])

    const enterMoveMode = useCallback((slot: HomeSlot) => {
        sfx.confirm()
        setMoveMode({ slotId: slot.id, ghostPosition: slot.position ?? 0 })
        window.api.contextMenuControl.send('toggle', false)
        window.api.movementControl.send('SET_SECTION', 'move-mode')
        setInfoText(`Moviendo: ${slot.label}`)
    }, [setInfoText])

    const exitMoveMode = useCallback((save = false) => {
        const { homeGrid: grid, currentPage: page, moveMode: mm } = stateRef.current
        if (!mm) return

        if (save) {
            const slot = grid.items.find(i => i.id === mm.slotId)
            if (slot) {
                const cSpan = slot.colSpan ?? 1
                const rSpan = slot.rowSpan ?? 1
                const cols = grid.cols
                const rows = grid.rows
                const gp = mm.ghostPosition
                const gCol = gp % cols
                const gRow = Math.floor(gp / cols)
                const fits = gCol + cSpan <= cols && gRow + rSpan <= rows
                if (fits) {
                    const occupied = buildOccupiedCells(grid.items, page, cols, mm.slotId)
                    const cells = getSlotCells(gp, cSpan, rSpan, cols)
                    if (cells.every(c => !occupied.has(c))) {
                        const newItems = grid.items.map(i =>
                            i.id === mm.slotId ? { ...i, position: gp, page } : i
                        )
                        persistItems(newItems)
                        sfx.confirm()
                        setSelectedSlotIndex(gp)
                        setMoveMode(null)
                        window.api.movementControl.send('SET_SECTION', 'grid')
                        collapseIsland()
                        return
                    }
                }
                sfx.error()
                return
            }
        }
        sfx.cancel()
        setMoveMode(null)
        window.api.movementControl.send('SET_SECTION', 'grid')
        collapseIsland()
    }, [persistItems, collapseIsland, setSelectedSlotIndex])

    const enterResizeMode = useCallback((slot: HomeSlot) => {
        sfx.confirm()
        setResizeMode({ slotId: slot.id })
        window.api.contextMenuControl.send('toggle', false)
        window.api.movementControl.send('SET_SECTION', 'resize-mode')
        setInfoText(`Redimensionando: ${slot.label}`)
    }, [setInfoText])

    const exitResizeMode = useCallback((save = false) => {
        if (!save) sfx.cancel()
        setResizeMode(null)
        window.api.movementControl.send('SET_SECTION', 'grid')
        collapseIsland()
    }, [collapseIsland])

    // ─── Context Option Click ─────────────────────────────────────────────────────

    const handleContextOptionClick = (option: ContextOption) => {
        if (option.action === 'ADD_GAME' || option.label === 'Add') {
            openAddGameModal()
        } else if (option.action === 'ASSIGN_GAME_FROM_LIBRARY') {
            sfx.open()
            pushRoute('library-picker')
            setPickerTargetIndex(stateRef.current.selectedSlotIndex)
            setLibraryPickerVisible(true)
            setProfilePageVisible(false)
            setSettingsPanelVisible(false)
            setAddGamePanelVisible(false)
            setDownloadManagerVisible(false)
            window.api.contextMenuControl.send('toggle', false)
            window.api.movementControl.send('SET_SECTION', 'library-picker')
        } else if (option.action === 'EDIT_GAME' && selectedSlotItem) {
            openEditGameModal(selectedSlotItem)
        } else if (option.action === 'MOVE_GAME' && selectedSlotItem) {
            enterMoveMode(selectedSlotItem)
        } else if (option.action === 'RESIZE_GAME' && selectedSlotItem) {
            enterResizeMode(selectedSlotItem)
        } else if (option.action === 'OPEN_DOWNLOADS') {
            window.api.contextMenuControl.send('toggle', false)
            openDownloadManager()
        } else if (option.action) {
            window.api.contextMenuControl.send('execute', option.action)
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    const openAddGameModal = () => {
        sfx.open()
        pushRoute('add-game')
        setEditSlot(null)
        setAddGamePanelVisible(true)
        setAddGameSelectedIndex(0)
        window.api.contextMenuControl.send('toggle', false)
        setLastGridIndex(stateRef.current.selectedSlotIndex ?? 0)
        setSelectedSlotIndex(null)
        setInfoText('Añadir Juego')
        setIslandWidth('fit-content')
        window.api.movementControl.send('SET_SECTION', 'add-game-modal')
    }

    const openEditGameModal = (slot: HomeSlot) => {
        sfx.open()
        pushRoute('add-game')
        setEditSlot(slot)
        setAddGamePanelVisible(true)
        setAddGameSelectedIndex(0)
        window.api.contextMenuControl.send('toggle', false)
        setInfoText(`Editando: ${slot.label}`)
        setIslandWidth('fit-content')
        window.api.movementControl.send('SET_SECTION', 'add-game-modal')
    }

    const closeAddGameModal = () => {
        setEditSlot(null)
        goBack()
    }

    // ─── Download Manager ──────────────────────────────────────────────────────

    const openDownloadManager = useCallback(() => {
        sfx.open()
        pushRoute('downloads')
        setDownloadManagerVisible(true)
        setSettingsPanelVisible(false)
        setAddGamePanelVisible(false)
        setLastGridIndex(stateRef.current.selectedSlotIndex ?? 0)
        setSelectedSlotIndex(null)
        window.api.movementControl.send('SET_SECTION', 'download-manager')
        setInfoText('Descargas')
        setIslandWidth('fit-content')
    }, [setInfoText, setIslandWidth])

    const closeDownloadManager = useCallback(() => {
        goBack()
    }, [])

    // ─── Profile Page ──────────────────────────────────────────────────────────

    const closeProfile = useCallback(() => {
        goBack()
    }, [])

    // ─── Notify main process of selection changes ────────────────────────────────

    useEffect(() => {
        window.api?.movementControl?.send('SELECTION_CHANGED', selectedSlotItem ?? null)
        if (interfaceSettings.showGameBackground && selectedSlotItem?.squareImage) {
            setBackgroundImage(selectedSlotItem.squareImage)
        } else {
            setBackgroundImage(null)
        }
    }, [selectedSlotItem, interfaceSettings.showGameBackground])

    // --- Auto-select first slot on data load ---
    useEffect(() => {
        if (selectedSlotIndex === null && homeGrid.items.length > 0) {
            const sorted = [...homeGrid.items].sort((a, b) => 
                ((a.page ?? 0) * 1000 + (a.position ?? 0)) - ((b.page ?? 0) * 1000 + (b.position ?? 0))
            )
            const first = sorted[0]
            if (first.position !== undefined) {
                console.log(`[Renderer] Auto-selecting first slot: ${first.label}`)
                setSelectedSlotIndex(first.position)
                if (first.page !== undefined && first.page !== currentPage) {
                    setDirection(first.page > currentPage ? 'next' : 'prev')
                    setCurrentPage(first.page)
                }
            }
        }
    }, [homeGrid.items])

    useEffect(() => {
        window.api?.movementControl?.send('SET_SECTION', 'grid')
    }, [])

    // --- Dynamic Info Island / Route Breadcrumbs ---
    const VIEW_LABELS: Record<string, string> = {
        settings: 'Configuración',
        profile: 'Perfil',
        downloads: 'Descargas',
        'add-game': 'Añadir Juego',
        'library-picker': 'Biblioteca',
    }

    useEffect(() => {
        if (focusedHeader === 'left') {
            const icon = socialIcons[focusedHeaderIndex]
            if (icon) { setInfoText(icon.label); setIslandWidth('fit-content') }
        } else if (focusedHeader === 'right') {
            const icon = personalIcons[focusedHeaderIndex]
            if (icon) { setInfoText(icon.label); setIslandWidth('fit-content') }
        } else if (!addGamePanelVisible && !settingsPanelVisible && !downloadManagerVisible && !profilePageVisible && !libraryPickerVisible && !contextMenuVisible && !moveMode && !resizeMode) {
            if (selectedSlotIndex !== null) {
                if (selectedSlotItem) {
                    setInfoText(selectedSlotItem.label); setIslandWidth('fit-content')
                } else {
                    setInfoText('Ranura Vacía'); setIslandWidth('fit-content')
                }
            } else {
                setInfoText('LaLa Hub'); setIslandWidth('56px')
            }
        } else if (settingsPanelVisible || addGamePanelVisible || downloadManagerVisible || profilePageVisible || libraryPickerVisible) {
            const parts: string[] = []
            for (const v of navStackRef.current) {
                parts.push(VIEW_LABELS[v] || v)
            }
            const current = currentViewRef.current
            if (current !== 'grid') {
                parts.push(VIEW_LABELS[current] || current)
            }
            if (parts.length > 0) {
                setInfoText(parts.join('  ›  '))
                setIslandWidth('fit-content')
            }
        }
    }, [focusedHeader, focusedHeaderIndex, socialIcons, personalIcons, selectedSlotItem, selectedSlotIndex, addGamePanelVisible, settingsPanelVisible, downloadManagerVisible, profilePageVisible, libraryPickerVisible, contextMenuVisible, moveMode, resizeMode])

    // ─── IPC Messages from Main Process ─────────────────────────────────────────

    // Ref to handle state inside stable IPC listener
    const stateRefForIPC = useRef({ currentPage })
    const paginationLockRef = useRef(false)
    useEffect(() => { stateRefForIPC.current = { currentPage } }, [currentPage])

    useEffect(() => {
        if (!window.api?.onMainMessage) return

        window.api.onMainMessage((action: AppAction) => {
            console.log(`[Renderer] IPC Received: ${action.type}`)
            switch (action.type) {
                case 'CHANGE_INFO_ISLAND': setInfoText(action.payload); break
                case 'EXPAND_INFO_ISLAND': setIslandWidth('fit-content'); break
                case 'COLLAPSE_INFO_ISLAND': setIslandWidth('56px'); break
                case 'ADD_SOCIAL_ICON': setSocialIcons((prev) => [...prev, action.payload]); break
                case 'ADD_PERSONAL_ICON': setPersonalIcons((prev) => [...prev, action.payload]); break
                case 'TOGGLE_SOCIAL_MENU': setSocialExpanded((prev) => !prev); break
                case 'TOGGLE_PERSONAL_MENU': setPersonalExpanded((prev) => !prev); break
                case 'UPDATE_GRID_CONFIG': setHomeGrid((prev) => ({ ...prev, ...action.payload })); break
                case 'SET_GRID_ITEMS':
                    isGridLoadedRef.current = true
                    setHomeGrid((prev) => ({ ...prev, items: action.payload }))
                    break
                case 'ADD_GRID_ITEM': setHomeGrid((prev) => ({ ...prev, items: [...prev.items, action.payload] })); break
                case 'REMOVE_GRID_ITEM':
                    setHomeGrid((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== action.payload) }))
                    break
                case 'SET_SELECTED_INDEX':
                    if (action.payload.section === 'grid') setSelectedSlotIndex(action.payload.index)
                    break
                case 'SET_GRID_PAGE': {
                    const prevPage = stateRefForIPC.current.currentPage
                    if (action.payload !== prevPage) {
                        setDirection(action.payload > prevPage ? 'next' : 'prev')
                        setCurrentPage(action.payload)
                        applyPendingSelection()
                    } else {
                        clearPendingSelection()
                    }
                    break
                }
                case 'TOGGLE_CONTEXT_MENU': setContextMenuVisible(action.payload); break
                case 'SET_CONTEXT_OPTIONS': setContextOptions(action.payload); break
                case 'ADD_CONTEXT_OPTION': setContextOptions((prev) => [...prev, action.payload]); break
                case 'REMOVE_CONTEXT_OPTION': setContextOptions((prev) => prev.filter((o) => o.id !== action.payload)); break
                case 'OPEN_SETTINGS':
                    sfx.open()
                    pushRoute('settings')
                    setSettingsPanelVisible(true)
                    setAddGamePanelVisible(false)
                    setFocusedHeader(null)
                    setSocialExpanded(false)
                    setPersonalExpanded(false)
                    setIslandWidth('56px')
                    setLastGridIndex(stateRef.current.selectedSlotIndex ?? 0)
                    setSelectedSlotIndex(null)
                    window.api.movementControl.send('SET_SECTION', 'settings')
                    break
                case 'GO_HOME':
                    sfx.close()
                    navStackRef.current = []
                    setDownloadManagerVisible(false)
                    setSettingsPanelVisible(false)
                    setProfilePageVisible(false)
                    setAddGamePanelVisible(false)
                    setLibraryPickerVisible(false)
                    setPersonalExpanded(false)
                    setSocialExpanded(false)
                    setFocusedHeader(null)
                    setContextMenuVisible(false)
                    collapseIsland()
                    setSelectedSlotIndex(prev => prev === null ? (lastGridIndex || 0) : prev)
                    window.api.movementControl.send('SET_SECTION', 'grid')
                    break
                case 'OPEN_DOWNLOADS':
                    openDownloadManager()
                    break
                case 'OPEN_PROFILE':
                    sfx.open()
                    pushRoute('profile')
                    setPickerTargetIndex(null)
                    setProfilePageVisible(true)
                    setSettingsPanelVisible(false)
                    setAddGamePanelVisible(false)
                    setDownloadManagerVisible(false)
                    setFocusedHeader(null)
                    setSocialExpanded(false)
                    setPersonalExpanded(false)
                    setIslandWidth('56px')
                    setLastGridIndex(stateRef.current.selectedSlotIndex ?? 0)
                    setSelectedSlotIndex(null)
                    window.api.movementControl.send('SET_SECTION', 'profile')
                    break
                case 'OPEN_LIBRARY_PICKER':
                    sfx.open()
                    pushRoute('library-picker')
                    setPickerTargetIndex(stateRef.current.selectedSlotIndex ?? lastGridIndex)
                    setLibraryPickerVisible(true)
                    setProfilePageVisible(false)
                    setSettingsPanelVisible(false)
                    setAddGamePanelVisible(false)
                    setDownloadManagerVisible(false)
                    setFocusedHeader(null)
                    setSocialExpanded(false)
                    setPersonalExpanded(false)
                    setIslandWidth('56px')
                    setSelectedSlotIndex(null)
                    window.api.contextMenuControl.send('toggle', false)
                    window.api.movementControl.send('SET_SECTION', 'library-picker')
                    break
                case 'CLOSE_PROFILE':
                    goBack()
                    break
                case 'CLOSE_SETTINGS':
                    goBack()
                    break
                case 'CLOSE_ADD_GAME':
                    setEditSlot(null)
                    goBack()
                    break
                case 'OPEN_ADD_GAME':
                    openAddGameModal()
                    break
                case 'OPEN_EDIT_GAME':
                    openEditGameModal(action.payload)
                    break
            }
        })
        return () => window.api.offMainMessage()
    }, []) // Now stable, no dependencies

    useInputFocus()

    // ─── Navigation / Input Handling ─────────────────────────────────────────────
    const lastMovementTimeRef = useRef(0)

    useEffect(() => {
        const handleMovementAction = (section: string, action: string) => {
            console.log(`[DEBUG] Renderer Action: ${action} | Section: ${section}`)
            // Apply throttle to prevent cursor from flying too fast
            const now = Date.now()
            if (now - lastMovementTimeRef.current < 120) return
            lastMovementTimeRef.current = now

            // Blur any focused input on back/select
            if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                if (action === 'back' || action === 'select') {
                    if (action === 'back') sfx.cancel()
                    if (action === 'select') sfx.confirm()
                    ;(document.activeElement as HTMLElement).blur()
                    return
                }
            }

            // ── Move mode ─────────────────────────────────────────────────────
            if (section === 'move-mode') {
                const { homeGrid: grid, currentPage: page, moveMode: mm } = stateRef.current
                if (!mm) return
                const slot = grid.items.find(i => i.id === mm.slotId)
                if (!slot) return

                const cols = grid.cols
                const rows = grid.rows
                const cSpan = slot.colSpan ?? 1
                const rSpan = slot.rowSpan ?? 1
                const cur = mm.ghostPosition
                const curRow = Math.floor(cur / cols)
                const curCol = cur % cols

                if (action === 'back') { exitMoveMode(false); return }
                if (action === 'select') { exitMoveMode(true); return }

                let newPos = cur
                if (action === 'right' && curCol + 1 + (cSpan - 1) < cols) newPos = cur + 1
                if (action === 'left' && curCol > 0) newPos = cur - 1
                if (action === 'down' && curRow + 1 + (rSpan - 1) < rows) newPos = cur + cols
                if (action === 'up' && curRow > 0) newPos = cur - cols

                if (newPos !== cur) {
                    const newStartRow = Math.floor(newPos / cols)
                    const newStartCol = newPos % cols
                    const fitsGrid = newStartCol + cSpan <= cols && newStartRow + rSpan <= rows
                    if (fitsGrid) {
                        const occupied = buildOccupiedCells(grid.items, page, cols, mm.slotId)
                        const newCells = getSlotCells(newPos, cSpan, rSpan, cols)
                        if (newCells.every(c => !occupied.has(c))) sfx.navigate()
                        setMoveMode(prev => prev ? { ...prev, ghostPosition: newPos } : null)
                    }
                }
                return
            }

            // ── Resize mode ────────────────────────────────────────────────────
            if (section === 'resize-mode') {
                const { homeGrid: grid, currentPage: page, resizeMode: rm } = stateRef.current
                if (!rm) return
                const slot = grid.items.find(i => i.id === rm.slotId)
                if (!slot || slot.position === undefined) return

                const cols = grid.cols
                const rows = grid.rows
                const pos = slot.position
                const startRow = Math.floor(pos / cols)
                const startCol = pos % cols
                let cSpan = slot.colSpan ?? 1
                let rSpan = slot.rowSpan ?? 1

                if (action === 'back') { exitResizeMode(false); return }
                if (action === 'select') { exitResizeMode(true); return }

                let newColSpan = cSpan
                let newRowSpan = rSpan

                if (action === 'right') newColSpan = cSpan + 1
                else if (action === 'left') newColSpan = Math.max(1, cSpan - 1)
                else if (action === 'down') newRowSpan = rSpan + 1
                else if (action === 'up') newRowSpan = Math.max(1, rSpan - 1)

                // Boundary check
                if (startCol + newColSpan > cols) return
                if (startRow + newRowSpan > rows) return

                // Collision check
                const occupied = buildOccupiedCells(grid.items, page, cols, rm.slotId)
                const newCells = getSlotCells(pos, newColSpan, newRowSpan, cols)
                if (!newCells.every(c => !occupied.has(c))) { sfx.error(); return }

                sfx.navigate()
                const newItems = grid.items.map(i =>
                    i.id === rm.slotId ? { ...i, colSpan: newColSpan, rowSpan: newRowSpan } : i
                )
                setHomeGrid(prev => ({ ...prev, items: newItems }))
                // Persist immediately during resize
                persistItems(newItems)
                return
            }

            // ── Grid ─────────────────────────────────────────────────────────
            // ── Global Actions ────────────────────────────────────────────────
            if (action === 'openMain') {
                sfx.confirm()
                if (focusedHeader === 'left') {
                    setSocialExpanded(false)
                    setFocusedHeader(null)
                    setSelectedSlotIndex(lastGridIndex || 0)
                    window.api.movementControl.send('SET_SECTION', 'grid')
                } else {
                    setSocialExpanded(true)
                    setPersonalExpanded(false)
                    if (selectedSlotIndex !== null) setLastGridIndex(selectedSlotIndex)
                    setFocusedHeader('left')
                    setFocusedHeaderIndex(0)
                    setSelectedSlotIndex(null)
                    window.api.movementControl.send('SET_SECTION', 'header')
                }
                return
            }
            if (action === 'openSocial') {
                sfx.confirm()
                if (focusedHeader === 'right') {
                    setPersonalExpanded(false)
                    setFocusedHeader(null)
                    setSelectedSlotIndex(lastGridIndex || 0)
                    window.api.movementControl.send('SET_SECTION', 'grid')
                } else {
                    setPersonalExpanded(true)
                    setSocialExpanded(false)
                    if (selectedSlotIndex !== null) setLastGridIndex(selectedSlotIndex)
                    setFocusedHeader('right')
                    setFocusedHeaderIndex(0)
                    setSelectedSlotIndex(null)
                    window.api.movementControl.send('SET_SECTION', 'header')
                }
                return
            }

            // ── Section Specific ──────────────────────────────────────────────
            if (section === 'grid') {
                if (action === 'up' && selectedSlotIndex !== null && selectedSlotIndex < homeGrid.cols) {
                    sfx.navigate()
                    setLastGridIndex(selectedSlotIndex)
                    const isLeftHalf = (selectedSlotIndex % homeGrid.cols) < (homeGrid.cols / 2)
                    const side = isLeftHalf ? 'left' : 'right'
                    if (side === 'left' && socialIcons.length === 0) return
                    if (side === 'right' && personalIcons.length === 0) return
                    setFocusedHeader(side)
                    setFocusedHeaderIndex(0)
                    window.api.movementControl.send('SET_SECTION', 'header')
                    setSelectedSlotIndex(null)
                    return
                }
                sfx.navigate()
                gridNavigate(action, homeGrid.items, currentPage)
            } else if (section === 'header') {
                if (action === 'down' || action === 'back') {
                    sfx.navigate()
                    setFocusedHeader(null)
                    setSocialExpanded(false)
                    setPersonalExpanded(false)
                    if (settingsPanelVisible) {
                        window.api.movementControl.send('SET_SECTION', 'settings')
                    } else {
                        setSelectedSlotIndex(lastGridIndex)
                        window.api.movementControl.send('SET_SECTION', 'grid')
                    }
                } else if (action === 'left') {
                    if (focusedHeader === 'right') {
                        const maxLen = personalIcons.length
                        if (focusedHeaderIndex < maxLen - 1) {
                            sfx.navigate(); setFocusedHeaderIndex(p => p + 1)
                        } else if (socialIcons.length > 0) {
                            // Move from right group's leftmost to left group's rightmost
                            sfx.navigate(); setFocusedHeader('left'); setFocusedHeaderIndex(socialIcons.length - 1)
                        }
                    } else if (focusedHeader === 'left') {
                        if (focusedHeaderIndex > 0) {
                            sfx.navigate(); setFocusedHeaderIndex(p => p - 1)
                        }
                    }
                } else if (action === 'right') {
                    if (focusedHeader === 'left') {
                        const maxLen = socialIcons.length
                        if (focusedHeaderIndex < maxLen - 1) {
                            sfx.navigate(); setFocusedHeaderIndex(p => p + 1)
                        } else if (personalIcons.length > 0) {
                            // Move from left group's rightmost to right group's leftmost (highest index in row-reverse)
                            sfx.navigate(); setFocusedHeader('right'); setFocusedHeaderIndex(personalIcons.length - 1)
                        }
                    } else if (focusedHeader === 'right') {
                        if (focusedHeaderIndex > 0) {
                            sfx.navigate(); setFocusedHeaderIndex(p => p - 1)
                        }
                    }
                } else if (action === 'select') {
                    const iconList = focusedHeader === 'left' ? socialIcons : personalIcons
                    const icon = iconList[focusedHeaderIndex]
                    if (icon?.onClick) { sfx.confirm(); window.api.mainOptionControl(icon.onClick) }
                }
            } else if (section === 'context-menu') {
                if (contextOptions.length === 0) return
                switch (action) {
                    case 'right':
                    case 'down':
                        sfx.navigate(); setContextMenuSelectedIndex((prev) => (prev + 1) % contextOptions.length); break
                    case 'left':
                    case 'up':
                        sfx.navigate(); setContextMenuSelectedIndex((prev) => (prev - 1 + contextOptions.length) % contextOptions.length); break
                    case 'select': {
                        const selected = contextOptions[contextMenuSelectedIndex]
                        if (selected) { sfx.confirm(); handleContextOptionClick(selected) }
                        break
                    }
                    case 'back':
                        sfx.cancel()
                        window.api.contextMenuControl.send('toggle', false)
                        break
                }
            } else if (section === 'add-game-modal' || section === 'settings' || section === 'profile' || section === 'library-picker') {
                window.dispatchEvent(new CustomEvent('panel-move', { detail: action }))
            } else if (section === 'download-manager') {
                if (action === 'back' || action === 'escape') { goBack(); return }
            }
        }

        if (!window.api?.movementControl?.onAction) return
        const removeListener = window.api.movementControl.onAction(handleMovementAction)
        return () => removeListener()
    }, [
        homeGrid.rows, homeGrid.cols, homeGrid.items,
        currentPage, contextOptions, contextMenuSelectedIndex,
        addGameSelectedIndex, focusedHeader, focusedHeaderIndex,
        lastGridIndex, selectedSlotIndex, socialIcons, personalIcons,
        settingsPanelVisible, exitMoveMode, exitResizeMode, persistItems, goBack
    ])

    // ─── Grid Settings update helper (called from SettingsPanel) ─────────────────
    const handleGridSettingsChange = useCallback((newRows: number, newCols: number) => {
        const { minRows, minCols } = computeMinGridDimensions(homeGrid.items)
        const safeRows = Math.max(newRows, minRows)
        const safeCols = Math.max(newCols, minCols)
        const repacked = repackItemsAfterResize(homeGrid.items, safeCols, safeRows)
        setHomeGrid(prev => ({ ...prev, rows: safeRows, cols: safeCols, items: repacked }))
        persistItems(repacked)
        sfx.confirm()
    }, [homeGrid.items, persistItems])

    const handleAutoGridDimensionsChange = useCallback((newRows: number, newCols: number) => {
        setHomeGrid(prev => {
            if (prev.rows === newRows && prev.cols === newCols) return prev
            const { minRows, minCols } = computeMinGridDimensions(prev.items)
            const safeRows = Math.max(newRows, minRows)
            const safeCols = Math.max(newCols, minCols)
            if (prev.rows === safeRows && prev.cols === safeCols) return prev

            if (!isGridLoadedRef.current || prev.items.length === 0) {
                return { ...prev, rows: safeRows, cols: safeCols }
            }

            const repacked = repackItemsAfterResize(prev.items, safeCols, safeRows)

            const hasChanged = repacked.some((item, i) => item.position !== prev.items[i]?.position || item.page !== prev.items[i]?.page)
            if (hasChanged) {
                if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
                persistTimeoutRef.current = setTimeout(() => {
                    window.api?.slots?.addMultiple(repacked).catch(console.error)
                }, 500)
            }

            return { ...prev, rows: safeRows, cols: safeCols, items: repacked }
        })
    }, [])

    const handleClearGrid = useCallback(async () => {
        sfx.confirm()
        setHomeGrid(prev => ({ ...prev, items: [] }))
        setSelectedSlotIndex(0)
        await window.api?.slots?.clearAll?.()
    }, [])

    // ─── Render ───────────────────────────────────────────────────────────────────

    if (authLoading) {
        return (
            <div className="app login-loading">
                <div className="login-loading-content">
                    <Icon icon="mynaui:gamepad" width={48} />
                    <p>Cargando...</p>
                </div>
            </div>
        )
    }

    if (!authState.isLoggedIn) {
        return <LoginScreen onAuthSuccess={handleAuthSuccess} />
    }

    return (
        <div className="app">
            <BackgroundLayer backgroundImage={backgroundImage} />

            {/* ── Header ── */}
            <NavigationHeader
                socialIcons={socialIcons}
                personalIcons={personalIcons}
                socialExpanded={socialExpanded}
                personalExpanded={personalExpanded}
                displayText={displayText}
                islandWidth={islandWidth}
                textOpacity={textOpacity}
                focusedHeader={focusedHeader}
                focusedIndex={focusedHeaderIndex}
            />

            {/* ── Main content area ── */}
            <div className="main-view-area">
                <AnimatePresence mode="wait">
                    {!settingsPanelVisible && !addGamePanelVisible && !downloadManagerVisible && !profilePageVisible ? (
                        <motion.div
                            key="grid"
                            className="content"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <HomeGridComponent
                                homeGrid={homeGrid}
                                currentPage={currentPage}
                                direction={direction}
                                selectedSlotIndex={selectedSlotIndex}
                                moveMode={moveMode ?? undefined}
                                resizeMode={resizeMode ?? undefined}
                                onSlotClick={(index, item) => {
                                    if (moveMode) {
                                        // In move mode, clicking a slot moves the ghost there
                                        const slot = homeGrid.items.find(i => i.id === moveMode.slotId)
                                        if (!slot) return
                                        const occupied = buildOccupiedCells(homeGrid.items, currentPage, homeGrid.cols, moveMode.slotId)
                                        const cells = getSlotCells(index, slot.colSpan ?? 1, slot.rowSpan ?? 1, homeGrid.cols)
                                        if (cells.every(c => !occupied.has(c))) {
                                            setMoveMode(prev => prev ? { ...prev, ghostPosition: index } : null)
                                        }
                                        return
                                    }
                                    sfx.confirm()
                                    setSelectedSlotIndex(index)
                                    if (item?.onClick) window.api.gridItemControl(item.onClick, item)
                                }}
                                onSlotHoverEnter={(index, item) => {
                                    if (moveMode) {
                                        setMoveMode(prev => prev ? { ...prev, ghostPosition: index } : null)
                                        return
                                    }
                                    sfx.navigate()
                                    setSelectedSlotIndex(index)
                                    if (item?.onMouseEnter) window.api.gridItemControl(item.onMouseEnter, item)
                                }}
                                onSlotHoverLeave={(item) => {
                                    if (moveMode) return
                                    if (item?.onMouseLeave) window.api.gridItemControl(item.onMouseLeave, item)
                                }}
                                onGridDimensionsAutoChange={handleAutoGridDimensionsChange}
                            />
                        </motion.div>
                    ) : settingsPanelVisible ? (
                        <motion.div
                            key="settings"
                            className="content content--panel"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <SettingsPanel
                                visible={settingsPanelVisible}
                                onClose={async () => { 
                                    // Refresh interface settings when closing panel
                                    const settings = await window.api.ui.getSettings();
                                    setInterfaceSettings(settings);
                                    goBack();
                                }}
                                onJumpToHeader={(side) => {
                                    setFocusedHeader(side)
                                    setFocusedHeaderIndex(0)
                                    window.api.movementControl.send('SET_SECTION', 'header')
                                }}
                                gridConfig={{ rows: homeGrid.rows, cols: homeGrid.cols, gap: homeGrid.gap, aspectRatio: homeGrid.aspectRatio }}
                                onGridConfigChange={(rows, cols, gap, aspectRatio) => {
                                    handleGridSettingsChange(rows, cols)
                                    setHomeGrid(prev => ({ ...prev, gap, aspectRatio }))
                                }}
                                minGridDimensions={computeMinGridDimensions(homeGrid.items)}
                                onClearGrid={handleClearGrid}
                            />
                        </motion.div>
                    ) : addGamePanelVisible ? (
                        <motion.div
                            key="addgame"
                            className="content content--panel"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <AddGamePanel
                                visible={addGamePanelVisible}
                                selectedIndex={addGameSelectedIndex}
                                editSlot={editSlot}
                                onClose={closeAddGameModal}
                                authState={authState}
                            />
                        </motion.div>
                    ) : downloadManagerVisible ? (
                        <motion.div
                            key="downloads"
                            className="content content--panel"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <DownloadManager
                                visible={downloadManagerVisible}
                                onClose={closeDownloadManager}
                            />
                        </motion.div>
                    ) : profilePageVisible ? (
                        <motion.div
                            key="profile"
                            className="content content--panel"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ProfilePage
                                visible={profilePageVisible}
                                authState={authState}
                                onLogin={handleAuthSuccess}
                                onClose={closeProfile}
                                onOpenAddGame={(slot) => { setProfilePageVisible(false); if (slot) openEditGameModal(slot); else openAddGameModal(); }}
                            />
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            <LibraryPickerModal
                visible={libraryPickerVisible}
                onClose={() => {
                    setPickerTargetIndex(null)
                    goBack()
                }}
                onSelect={slot => {
                    if (pickerTargetIndex !== null) {
                        const otherItems = homeGrid.items.filter(i => !(i.position === pickerTargetIndex && i.page === currentPage))
                        const newGridSlot: HomeSlot = {
                            ...slot,
                            id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                            position: pickerTargetIndex,
                            page: currentPage,
                            colSpan: 1,
                            rowSpan: 1
                        }
                        const newItems = [...otherItems, newGridSlot]
                        persistItems(newItems)
                        setPickerTargetIndex(null)
                        goBack()
                    }
                }}
            />

            {/* ── Footer ── */}
            <AnimatePresence>
                {!settingsPanelVisible && !addGamePanelVisible && !downloadManagerVisible && !profilePageVisible && !moveMode && !resizeMode && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="footer"
                    >
                        <PageNavigator
                            totalPages={totalPages}
                            currentPage={currentPage}
                            onPageClick={(index) => window.api.movementControl.send('SET_GRID_PAGE', index)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <ModeHUD moveMode={moveMode} resizeMode={resizeMode} />

            {/* ── Context Menu (fixed) ── */}
            <ContextMenu
                visible={contextMenuVisible}
                options={contextOptions}
                selectedIndex={contextMenuSelectedIndex}
                onOptionClick={handleContextOptionClick}
            />
        </div>
    )
}

export default MainApp