import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppAction, HomeGrid, HomeSlot, IconOption, ContextOption, InterfaceSettings, AuthState, AuthResult, SyncStatus } from '../../../../shared/types'
import { Icon } from '@iconify/react'

import IntroSplash from '../../components/IntroSplash'

import { useGamepad } from '../../hooks/useGamepad'
import { useGridNavigation } from '../../hooks/useGridNavigation'
import { useInfoIsland } from '../../hooks/useInfoIsland'
import { useInputFocus } from '../../hooks/useInputFocus'
import { sfx } from '../../utils/audioManager'

import NavigationHeader from '../../components/NavigationHeader'
import HomeGridComponent from '../../components/HomeGrid'
import { buildOccupiedCells, getSlotCells, repackItemsAfterResize, computeMinGridDimensions, SlotIdeal } from '../../utils/gridUtils'
import PageNavigator from '../../components/PageNavigator'
import ContextMenu from '../../components/ContextMenu'
import LibraryPickerModal from '../../components/LibraryPickerModal'
import AddIframeModal from '../../components/AddIframeModal'
import VideoSettingsModal from '../../components/VideoSettingsModal'
import { ShiftContentModal } from '../../components/ShiftContentModal'
import AddGamePanel from '../../components/AddGameModal'
import SettingsPanel from '../../components/SettingsPanel'
import { DownloadManager } from '../../components/download/DownloadManager'
import LoginScreen from '../../components/LoginScreen'
import ProfilePage from '../../components/ProfilePage'
import BackgroundLayer from '../../components/BackgroundLayer'
import ModeHUD from '../../components/ModeHUD'

function logSlots(label: string, items: HomeSlot[]) {
    console.log(`=== SLOTS ${label} ===`)
    for (const s of items) {
        console.log(`  ${s.id.slice(0, 8)}: pos=${s.position} c=${s.colSpan ?? 1} r=${s.rowSpan ?? 1} p=${s.page ?? 0}`)
    }
}

const applyThemeToDOM = (settings?: InterfaceSettings) => {
    if (!settings) return
    const activeId = settings.activeTheme || 'dark'
    if (activeId === 'dark' || activeId === 'platinum' || activeId === 'apple-glass' || activeId === 'apple-glass-light' || activeId === 'xmas' || activeId === 'halloween' || activeId === 'twilight-princess') {
        document.documentElement.setAttribute('data-theme', activeId)
        const existingStyle = document.getElementById('custom-theme-style')
        if (existingStyle) existingStyle.remove()
    } else {
        const custom = (settings.customThemes || []).find(t => t.id === activeId)
        if (custom) {
            document.documentElement.setAttribute('data-theme', 'custom')
            let cssRules = ':root, [data-theme="custom"] {\n'
            for (const [key, value] of Object.entries(custom.colors || {})) {
                cssRules += `  ${key.startsWith('--') ? key : '--' + key}: ${value};\n`
            }
            cssRules += '}\n'
            
            if (custom.customCss) {
                cssRules += `\n/* Custom CSS */\n${custom.customCss}\n`
            }
            
            let styleTag = document.getElementById('custom-theme-style') as HTMLStyleElement
            if (!styleTag) {
                styleTag = document.createElement('style')
                styleTag.id = 'custom-theme-style'
                document.head.appendChild(styleTag)
            }
            styleTag.textContent = cssRules
        }
    }
}

function MainApp(): React.JSX.Element {
    useGamepad()

    // --- Intro Splash ---
    const [showIntro, setShowIntro] = useState(true)
    const [appReady, setAppReady] = useState(false)

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
        if (!authLoading && authState.isLoggedIn) {
            const check = () => {
                if (homeGrid.items.length > 0 || isGridLoadedRef.current) {
                    setAppReady(true)
                } else {
                    setTimeout(check, 100)
                }
            }
            check()
        } else if (!authLoading && !authState.isLoggedIn) {
            setAppReady(true)
        }
    }, [authLoading, authState.isLoggedIn])

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
    const [homeGrid, setHomeGrid] = useState<HomeGrid>(() => {
        const screenW = typeof window !== 'undefined' ? window.screen.availWidth : 1920
        const canonicalCols = Math.max(3, Math.min(18, Math.floor(screenW / 210) - 1))
        return {
            rows: 4,
            cols: canonicalCols,
            aspectRatio: 1,
            gap: 10,
            items: []
        }
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
        applyThemeToDOM(interfaceSettings)
    }, [interfaceSettings])

    useEffect(() => {
        window.api?.ui?.getSettings().then(res => {
            if (res) {
                setInterfaceSettings(res)
                applyThemeToDOM(res)
            }
        }).catch(console.error)

        const handleThemeChange = (e: any) => {
            if (e.detail) {
                setInterfaceSettings(e.detail)
                applyThemeToDOM(e.detail)
            }
        }
        window.addEventListener('theme-changed', handleThemeChange)
        return () => window.removeEventListener('theme-changed', handleThemeChange)
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
    const [settingsInitialTab, setSettingsInitialTab] = useState<'platforms' | 'emulators' | 'controls' | 'grid' | 'interface' | 'friends' | 'trophies'>('platforms')

    // --- Download Manager ---
    const [downloadManagerVisible, setDownloadManagerVisible] = useState(false)

    // --- Profile Page & Picker ---
    const [profilePageVisible, setProfilePageVisible] = useState(false)
    const [libraryPickerVisible, setLibraryPickerVisible] = useState(false)
    const [pickerTargetIndex, setPickerTargetIndex] = useState<number | null>(null)

    // Iframe Modal State
    const [addIframeVisible, setAddIframeVisible] = useState(false)
    const [editIframeSlot, setEditIframeSlot] = useState<HomeSlot | null>(null)

    // Video Modal State
    const [videoModalVisible, setVideoModalVisible] = useState(false)
    const [editVideoSlot, setEditVideoSlot] = useState<HomeSlot | null>(null)

    // --- Move Mode ---
    const [moveMode, setMoveMode] = useState<{ slotId: string; ghostPosition: number } | null>(null)

    // --- Resize Mode ---
    const [resizeMode, setResizeMode] = useState<{ slotId: string } | null>(null)

    // --- Shift Content Mode ---
    const [shiftContentSlot, setShiftContentSlot] = useState<HomeSlot | null>(null)

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
        setShiftContentSlot(null)
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
    const idealSlotsRef = useRef<Map<string, SlotIdeal>>(new Map())
    const gridColsRef = useRef(6)
    const captureIdeals = useCallback((items: HomeSlot[]) => {
        const map = new Map<string, SlotIdeal>()
        const cols = gridColsRef.current
        for (const item of items) {
            if (item.position !== undefined && item.page !== undefined) {
                map.set(item.id, {
                    colSpan: item.colSpan ?? 1,
                    rowSpan: item.rowSpan ?? 1,
                    col: item.position % cols,
                    row: Math.floor(item.position / cols),
                    page: item.page,
                })
            }
        }
        idealSlotsRef.current = map
    }, [])

    const stateRef = useRef({
        homeGrid, currentPage, selectedSlotIndex, moveMode, resizeMode, lastGridIndex: 0
    })
    
    const isGridLoadedRef = useRef(false)
    useEffect(() => {
        stateRef.current = { homeGrid, currentPage, selectedSlotIndex, moveMode, resizeMode, lastGridIndex }
    })

    useEffect(() => { gridColsRef.current = homeGrid.cols }, [homeGrid.cols])

    useEffect(() => {
        const onClose = () => logSlots('CLOSE', homeGrid.items)
        window.addEventListener('beforeunload', onClose)
        return () => window.removeEventListener('beforeunload', onClose)
    }, [homeGrid.items])

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
                        captureIdeals(newItems)
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
    }, [persistItems, collapseIsland, setSelectedSlotIndex, captureIdeals])

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

    const enterShiftContentMode = useCallback((slot: HomeSlot) => {
        sfx.confirm()
        setShiftContentSlot(slot)
        window.api.contextMenuControl.send('toggle', false)
        window.api.movementControl.send('SET_SECTION', 'shift-content-modal')
        setInfoText(`Encuadrando: ${slot.label}`)
    }, [setInfoText])

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
        } else if (option.action === 'SHIFT_CONTENT' && selectedSlotItem) {
            enterShiftContentMode(selectedSlotItem)
        } else if (option.action === 'OPEN_DOWNLOADS') {
            window.api.contextMenuControl.send('toggle', false)
            openDownloadManager()
        } else if (option.action === 'ADD_IFRAME') {
            sfx.confirm()
            setEditIframeSlot(null)
            setAddIframeVisible(true)
            window.api.contextMenuControl.send('toggle', false)
            window.api.movementControl.send('SET_SECTION', 'add-iframe-modal')
        } else if (option.action === 'EDIT_IFRAME' && selectedSlotItem) {
            sfx.confirm()
            setEditIframeSlot(selectedSlotItem)
            setAddIframeVisible(true)
            window.api.contextMenuControl.send('toggle', false)
            window.api.movementControl.send('SET_SECTION', 'add-iframe-modal')
        } else if (option.action === 'ADD_VIDEO') {
            sfx.confirm()
            setEditVideoSlot(null)
            setVideoModalVisible(true)
            window.api.contextMenuControl.send('toggle', false)
            window.api.movementControl.send('SET_SECTION', 'video-settings-modal')
        } else if (option.action === 'EDIT_VIDEO' && selectedSlotItem) {
            sfx.confirm()
            setEditVideoSlot(selectedSlotItem)
            setVideoModalVisible(true)
            window.api.contextMenuControl.send('toggle', false)
            window.api.movementControl.send('SET_SECTION', 'video-settings-modal')
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

    const closeProfile = useCallback(async () => {
        const settings = await window.api?.ui?.getSettings()
        if (settings) {
            setInterfaceSettings(settings)
            applyThemeToDOM(settings)
        }
        goBack()
    }, [])

    // ─── Notify main process of selection changes ────────────────────────────────

    useEffect(() => {
        window.api?.movementControl?.send('SELECTION_CHANGED', selectedSlotItem ?? null)
        
        let themeBg: string | null = null
        if (interfaceSettings.activeTheme && interfaceSettings.activeTheme !== 'dark' && interfaceSettings.activeTheme !== 'platinum') {
            const currentTheme = interfaceSettings.customThemes?.find(t => t.id === interfaceSettings.activeTheme)
            if (currentTheme?.backgroundImage) {
                themeBg = currentTheme.backgroundImage
            }
        }
        
        let gameImg = null
        if (selectedSlotItem) {
            const gameImgs = (selectedSlotItem.game as any)?.data?.images || (selectedSlotItem.game as any)?.images || {}
            gameImg = selectedSlotItem.backgroundImage || gameImgs.background || selectedSlotItem.horizontalImage || gameImgs.h_grid || selectedSlotItem.coverImage || gameImgs.cover || selectedSlotItem.verticalImage || gameImgs.v_grid || (selectedSlotItem as any).image || selectedSlotItem.squareImage || gameImgs.home || gameImgs.icon || selectedSlotItem.thumbImage || null
        }
        if (interfaceSettings.showGameBackground && gameImg) {
            setBackgroundImage(gameImg)
        } else {
            setBackgroundImage(themeBg)
        }
    }, [selectedSlotItem, interfaceSettings])

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
    
    useEffect(() => { stateRefForIPC.current = { currentPage } }, [currentPage])

    useEffect(() => {
        if (!window.api?.onMainMessage) return

        window.api.onMainMessage((action: AppAction) => {
            const a = action as any
            console.log(`[Renderer] IPC Received: ${a.type}`)
            switch (a.type) {
                case 'CHANGE_INFO_ISLAND': setInfoText(a.payload); break
                case 'EXPAND_INFO_ISLAND': setIslandWidth('fit-content'); break
                case 'COLLAPSE_INFO_ISLAND': setIslandWidth('56px'); break
                case 'ADD_SOCIAL_ICON': setSocialIcons((prev) => [...prev, a.payload]); break
                case 'ADD_PERSONAL_ICON': setPersonalIcons((prev) => [...prev, a.payload]); break
                case 'TOGGLE_SOCIAL_MENU': setSocialExpanded((prev) => !prev); break
                case 'TOGGLE_PERSONAL_MENU': setPersonalExpanded((prev) => !prev); break
                case 'UPDATE_GRID_CONFIG': setHomeGrid((prev) => ({ ...prev, ...a.payload })); break
                case 'SET_GRID_ITEMS': {
                    isGridLoadedRef.current = true
                    logSlots('INIT', a.payload)
                    setHomeGrid((prev) => {
                        // Estimate canonical columns based on the full screen width
                        // since users most likely edit their grid while the app is maximized.
                        // This prevents corrupting ideal positions if the app boots in a small window.
                        const screenW = window.screen.availWidth
                        const TARGET_W = 200
                        const gapVal = 10
                        const idealCols = Math.floor(screenW / (TARGET_W + gapVal)) - 1
                        const canonicalCols = Math.max(3, Math.min(18, idealCols))
                        
                        // Use prev.cols if it's large enough, otherwise fallback to canonicalCols
                        const useCols = prev.cols >= 4 ? prev.cols : canonicalCols
                        const useRows = prev.rows >= 3 ? prev.rows : 4

                        const map = new Map<string, SlotIdeal>()
                        for (const item of a.payload) {
                            if (item.position !== undefined && item.page !== undefined) {
                                map.set(item.id, {
                                    colSpan: item.colSpan ?? 1,
                                    rowSpan: item.rowSpan ?? 1,
                                    col: item.position % useCols,
                                    row: Math.floor(item.position / useCols),
                                    page: item.page,
                                })
                            }
                        }
                        idealSlotsRef.current = map
                        const repackedItems = (prev.cols !== useCols || prev.rows !== useRows)
                            ? repackItemsAfterResize(a.payload, prev.cols, prev.rows, map)
                            : a.payload
                        return { ...prev, items: repackedItems }
                    })
                    break
                }
                case 'ADD_GRID_ITEM': setHomeGrid((prev) => ({ ...prev, items: [...prev.items, a.payload] })); break
                case 'REMOVE_GRID_ITEM':
                    setHomeGrid((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== a.payload) }))
                    break
                case 'SET_SELECTED_INDEX':
                    if (a.payload.section === 'grid') setSelectedSlotIndex(a.payload.index)
                    break
                case 'SET_GRID_PAGE': {
                    const prevPage = stateRefForIPC.current.currentPage
                    if (a.payload !== prevPage) {
                        setDirection(a.payload > prevPage ? 'next' : 'prev')
                        setCurrentPage(a.payload)
                        applyPendingSelection()
                    } else {
                        clearPendingSelection()
                    }
                    break
                }
                case 'TOGGLE_CONTEXT_MENU': setContextMenuVisible(a.payload); break
                case 'SET_CONTEXT_OPTIONS': setContextOptions(a.payload); break
                case 'ADD_CONTEXT_OPTION': setContextOptions((prev) => [...prev, a.payload]); break
                case 'REMOVE_CONTEXT_OPTION': setContextOptions((prev) => prev.filter((o) => o.id !== a.payload)); break
                case 'OPEN_SETTINGS':
                    sfx.open()
                    setSettingsInitialTab('platforms')
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
                case 'OPEN_SETTINGS_FRIENDS':
                    sfx.open()
                    setSettingsInitialTab('friends')
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
                    setShiftContentSlot(null)
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
                    openEditGameModal(a.payload)
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
                captureIdeals(newItems)
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
            } else if (section === 'add-game-modal' || section === 'settings' || section === 'profile' || section === 'library-picker' || section === 'shift-content-modal') {
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
        console.log(`GRID SETTINGS CHANGE: ${homeGrid.cols}x${homeGrid.rows} → ${safeCols}x${safeRows}`)
        logSlots('BEFORE REPACK', homeGrid.items)
        const repacked = repackItemsAfterResize(homeGrid.items, safeCols, safeRows, idealSlotsRef.current)
        logSlots('AFTER REPACK', repacked)
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

            console.log(`AUTO GRID: ${prev.cols}x${prev.rows} → ${safeCols}x${safeRows}`)
            logSlots('BEFORE REPACK', prev.items)
            const repacked = repackItemsAfterResize(prev.items, safeCols, safeRows, idealSlotsRef.current)
            logSlots('AFTER REPACK', repacked)

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

    const appContent = authLoading ? (
        <div className="app login-loading">
            <div className="login-loading-content">
                <Icon icon="mynaui:gamepad" width={48} />
                <p>Cargando...</p>
            </div>
        </div>
    ) : !authState.isLoggedIn ? (
        <LoginScreen onAuthSuccess={handleAuthSuccess} />
    ) : (
        <div className="app">
            <BackgroundLayer
                backgroundImage={backgroundImage}
                isWallpaper={true}
            />

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
                                initialTab={settingsInitialTab}
                                onClose={async () => { 
                                    // Refresh interface settings when closing panel
                                    const settings = await window.api.ui.getSettings();
                                    setInterfaceSettings(settings);
                                    applyThemeToDOM(settings);
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
                        captureIdeals(newItems)
                        setPickerTargetIndex(null)
                        goBack()
                    }
                }}
            />

            <AddIframeModal
                visible={addIframeVisible}
                initialUrl={editIframeSlot?.iframeUrl || ''}
                onClose={() => {
                    setAddIframeVisible(false)
                    setEditIframeSlot(null)
                    goBack()
                }}
                onSave={(url) => {
                    const targetPos = editIframeSlot ? editIframeSlot.position : (stateRef.current.selectedSlotIndex ?? 0)
                    const newGridSlot: HomeSlot = editIframeSlot ? {
                        ...editIframeSlot,
                        iframeUrl: url
                    } : {
                        id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        position: targetPos,
                        page: currentPage,
                        colSpan: 1,
                        rowSpan: 1,
                        label: 'Widget Web',
                        icon: 'mynaui:globe',
                        iframeUrl: url
                    }
                    const otherItems = homeGrid.items.filter(i => i.id !== newGridSlot.id && !(i.position === newGridSlot.position && i.page === newGridSlot.page))
                    const newItems = [...otherItems, newGridSlot]
                    persistItems(newItems)
                    captureIdeals(newItems)
                    setAddIframeVisible(false)
                    setEditIframeSlot(null)
                    goBack()
                }}
            />

            <VideoSettingsModal
                visible={videoModalVisible}
                initialUrl={editVideoSlot?.videoUrl || ''}
                initialVolume={editVideoSlot?.videoSettings?.volume ?? 0.5}
                onClose={() => {
                    setVideoModalVisible(false)
                    setEditVideoSlot(null)
                    goBack()
                }}
                onSave={(url, volume) => {
                    const targetPos = editVideoSlot ? editVideoSlot.position : (stateRef.current.selectedSlotIndex ?? 0)
                    const newGridSlot: HomeSlot = editVideoSlot ? {
                        ...editVideoSlot,
                        videoUrl: url,
                        videoSettings: { volume }
                    } : {
                        id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        position: targetPos,
                        page: currentPage,
                        colSpan: 1,
                        rowSpan: 1,
                        label: 'Vídeo Nativo',
                        icon: 'mynaui:video',
                        videoUrl: url,
                        videoSettings: { volume }
                    }
                    const otherItems = homeGrid.items.filter(i => i.id !== newGridSlot.id && !(i.position === newGridSlot.position && i.page === newGridSlot.page))
                    const newItems = [...otherItems, newGridSlot]
                    persistItems(newItems)
                    captureIdeals(newItems)
                    setVideoModalVisible(false)
                    setEditVideoSlot(null)
                    goBack()
                }}
            />

            {shiftContentSlot && (
                <ShiftContentModal
                    slot={shiftContentSlot}
                    onLiveUpdate={(offsets) => {
                        setHomeGrid(prev => ({
                            ...prev,
                            items: prev.items.map(it => ((it.id && it.id === shiftContentSlot.id) || (it.page === shiftContentSlot.page && it.position === shiftContentSlot.position)) ? { ...it, contentOffsets: offsets } : it)
                        }))
                    }}
                    onSave={(offsets) => {
                        const newItems = homeGrid.items.map(it => ((it.id && it.id === shiftContentSlot.id) || (it.page === shiftContentSlot.page && it.position === shiftContentSlot.position)) ? { ...it, contentOffsets: offsets } : it)
                        persistItems(newItems)
                        setShiftContentSlot(null)
                        window.api.movementControl.send('SET_SECTION', 'grid')
                        collapseIsland()
                    }}
                    onClose={() => {
                        window.api?.slots?.getAll?.().then(items => items && setHomeGrid(p => ({ ...p, items })))
                        setShiftContentSlot(null)
                        window.api.movementControl.send('SET_SECTION', 'grid')
                        collapseIsland()
                    }}
                />
            )}

            {/* ── Footer ── */}
            <AnimatePresence>
                {!settingsPanelVisible && !addGamePanelVisible && !downloadManagerVisible && !profilePageVisible && !moveMode && !resizeMode && !shiftContentSlot && (
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

    return (
        <>
            <IntroSplash
                visible={showIntro}
                ready={appReady}
                onReady={() => setShowIntro(false)}
            />
            {appContent}
        </>
    )
}

export default MainApp