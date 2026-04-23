import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppAction, HomeGrid, HomeSlot, IconOption, ContextOption } from '../../../../shared/types'
import { Icon } from '@iconify/react'

import { useGamepad } from '../../hooks/useGamepad'
import { useGridNavigation } from '../../hooks/useGridNavigation'
import { useInfoIsland } from '../../hooks/useInfoIsland'
import { sfx } from '../../utils/audioManager'

import NavigationHeader from '../../components/NavigationHeader'
import HomeGridComponent, { buildOccupiedCells, getSlotCells } from '../../components/HomeGrid'
import PageNavigator from '../../components/PageNavigator'
import ContextMenu from '../../components/ContextMenu'
import AddGamePanel from '../../components/AddGameModal'
import SettingsPanel from '../../components/SettingsPanel'

// ─── Grid move/resize utilities ────────────────────────────────────────────────

/** Rearranges items to fill pages after a grid resize, maintaining relative order */
function repackItemsAfterResize(items: HomeSlot[], cols: number, rows: number): HomeSlot[] {
    const slotsPerPage = cols * rows
    const updated: HomeSlot[] = []
    let page = 0
    let cellCursor = 0

    // Sort by original page then position
    const sorted = [...items].sort((a, b) => {
        const pa = (a.page ?? 0) * 1000 + (a.position ?? 0)
        const pb = (b.page ?? 0) * 1000 + (b.position ?? 0)
        return pa - pb
    })

    for (const item of sorted) {
        const cSpan = item.colSpan ?? 1
        const rSpan = item.rowSpan ?? 1

        // Find a position on the current page (or next pages) that fits
        let placed = false
        while (!placed) {
            const occupied = buildOccupiedCells(updated, page, cols)
            // Search for a position on this page where it fits
            let found = false
            for (let pos = 0; pos < slotsPerPage && !found; pos++) {
                const startRow = Math.floor(pos / cols)
                const startCol = pos % cols
                if (startCol + cSpan > cols) continue  // doesn't fit horizontally
                if (startRow + rSpan > rows) continue  // doesn't fit vertically
                const cells = getSlotCells(pos, cSpan, rSpan, cols)
                if (cells.every(c => !occupied.has(c))) {
                    updated.push({ ...item, position: pos, page })
                    found = true
                    placed = true
                }
            }
            if (!found) {
                page++
                cellCursor = 0
            }
        }
        cellCursor++
    }
    return updated
}

/** Computes minimum allowed grid dimensions given current items */
function computeMinGridDimensions(items: HomeSlot[]): { minRows: number; minCols: number } {
    let maxRowSpan = 1
    let maxColSpan = 1
    for (const item of items) {
        maxRowSpan = Math.max(maxRowSpan, item.rowSpan ?? 1)
        maxColSpan = Math.max(maxColSpan, item.colSpan ?? 1)
    }
    return { minRows: maxRowSpan, minCols: maxColSpan }
}

function MainApp(): React.JSX.Element {
    useGamepad()

    // --- Background ---
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null)

    // --- Icons ---
    const [mainIcons, setMainIcons] = useState<IconOption[]>([])
    const [mainExpanded, setMainExpanded] = useState(false)
    const [socialIcons, setSocialIcons] = useState<IconOption[]>([])
    const [socialExpanded, setSocialExpanded] = useState(false)

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
        window.api.movementControl.send('SET_TOTAL_PAGES', totalPages)
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

    // --- Move Mode ---
    const [moveMode, setMoveMode] = useState<{ slotId: string; ghostPosition: number } | null>(null)

    // --- Resize Mode ---
    const [resizeMode, setResizeMode] = useState<{ slotId: string } | null>(null)

    // Ref for move/resize (always fresh values in handlers)
    const stateRef = useRef({
        homeGrid, currentPage, selectedSlotIndex, moveMode, resizeMode
    })
    useEffect(() => {
        stateRef.current = { homeGrid, currentPage, selectedSlotIndex, moveMode, resizeMode }
    })

    // ─── Move Mode Helpers ────────────────────────────────────────────────────────

    const persistItems = useCallback(async (items: HomeSlot[]) => {
        // Save all items to backend by calling slot-add-multiple
        await window.api.slots.addMultiple(items)
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
                const newItems = grid.items.map(i =>
                    i.id === mm.slotId ? { ...i, position: mm.ghostPosition, page } : i
                )
                persistItems(newItems)
                sfx.confirm()
            }
        } else {
            sfx.cancel()
        }
        setMoveMode(null)
        window.api.movementControl.send('SET_SECTION', 'grid')
        collapseIsland()
    }, [persistItems, collapseIsland])

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
        } else if (option.action === 'EDIT_GAME' && selectedSlotItem) {
            openEditGameModal(selectedSlotItem)
        } else if (option.action === 'MOVE_GAME' && selectedSlotItem) {
            enterMoveMode(selectedSlotItem)
        } else if (option.action === 'RESIZE_GAME' && selectedSlotItem) {
            enterResizeMode(selectedSlotItem)
        } else if (option.action) {
            window.api.contextMenuControl.send('execute', option.action)
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    const openAddGameModal = () => {
        sfx.open()
        setEditSlot(null)
        setAddGamePanelVisible(true)
        setAddGameSelectedIndex(0)
        window.api.contextMenuControl.send('toggle', false)
        setLastGridIndex(stateRef.current.selectedSlotIndex ?? 0)
        setSelectedSlotIndex(null)
        setInfoText('Añadir Juego')
        setIslandWidth('50%')
        window.api.movementControl.send('SET_SECTION', 'add-game-modal')
    }

    const openEditGameModal = (slot: HomeSlot) => {
        sfx.open()
        setEditSlot(slot)
        setAddGamePanelVisible(true)
        setAddGameSelectedIndex(0)
        window.api.contextMenuControl.send('toggle', false)
        setInfoText(`Editando: ${slot.label}`)
        setIslandWidth('60%')
        window.api.movementControl.send('SET_SECTION', 'add-game-modal')
    }

    const closeAddGameModal = () => {
        sfx.close()
        setAddGamePanelVisible(false)
        setEditSlot(null)
        collapseIsland()
        setSelectedSlotIndex(prev => prev === null ? (lastGridIndex || 0) : prev)
        window.api.movementControl.send('SET_SECTION', 'grid')
    }

    // ─── Notify main process of selection changes ────────────────────────────────

    useEffect(() => {
        window.api.movementControl.send('SELECTION_CHANGED', selectedSlotItem ?? null)
        if (selectedSlotItem?.squareImage) {
            setBackgroundImage(selectedSlotItem.squareImage)
        } else {
            setBackgroundImage(null)
        }
    }, [selectedSlotItem])

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
        window.api.movementControl.send('SET_SECTION', 'grid')
    }, [])

    // --- Dynamic Breadcrumbs / Header Labels ---
    useEffect(() => {
        if (focusedHeader === 'left') {
            const icon = mainIcons[focusedHeaderIndex]
            if (icon) { setInfoText(icon.label); setIslandWidth('50%') }
        } else if (focusedHeader === 'right') {
            const icon = socialIcons[focusedHeaderIndex]
            if (icon) { setInfoText(icon.label); setIslandWidth('50%') }
        } else if (!addGamePanelVisible && !settingsPanelVisible && !contextMenuVisible && !moveMode && !resizeMode) {
            if (selectedSlotIndex !== null) {
                if (selectedSlotItem) {
                    setInfoText(selectedSlotItem.label); setIslandWidth('50%')
                } else {
                    setInfoText('Ranura Vacía'); setIslandWidth('50%')
                }
            } else {
                setInfoText('LaLa Hub'); setIslandWidth('56px')
            }
        }
    }, [focusedHeader, focusedHeaderIndex, mainIcons, socialIcons, selectedSlotItem, selectedSlotIndex, addGamePanelVisible, settingsPanelVisible, contextMenuVisible, moveMode, resizeMode])

    // ─── IPC Messages from Main Process ─────────────────────────────────────────

    // Ref to handle state inside stable IPC listener
    const stateRefForIPC = useRef({ currentPage })
    const paginationLockRef = useRef(false)
    useEffect(() => { stateRefForIPC.current = { currentPage } }, [currentPage])

    useEffect(() => {
        window.api.onMainMessage((action: AppAction) => {
            console.log(`[Renderer] IPC Received: ${action.type}`)
            switch (action.type) {
                case 'CHANGE_INFO_ISLAND': setInfoText(action.payload); break
                case 'EXPAND_INFO_ISLAND': setIslandWidth('50%'); break
                case 'COLLAPSE_INFO_ISLAND': setIslandWidth('56px'); break
                case 'ADD_MAIN_ICON': setMainIcons((prev) => [...prev, action.payload]); break
                case 'ADD_SOCIAL_ICON': setSocialIcons((prev) => [...prev, action.payload]); break
                case 'TOGGLE_MAIN_OPTIONS': setMainExpanded((prev) => !prev); break
                case 'TOGGLE_SOCIAL_OPTIONS': setSocialExpanded((prev) => !prev); break
                case 'UPDATE_GRID_CONFIG': setHomeGrid((prev) => ({ ...prev, ...action.payload })); break
                case 'SET_GRID_ITEMS': setHomeGrid((prev) => ({ ...prev, items: action.payload })); break
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
                    setSettingsPanelVisible(true)
                    setAddGamePanelVisible(false)
                    setFocusedHeader(null)
                    setMainExpanded(false)
                    setSocialExpanded(false)
                    setIslandWidth('56px')
                    setLastGridIndex(stateRef.current.selectedSlotIndex ?? 0)
                    setSelectedSlotIndex(null)
                    window.api.movementControl.send('SET_SECTION', 'settings')
                    break
                case 'GO_HOME':
                    sfx.close()
                    setSettingsPanelVisible(false)
                    setAddGamePanelVisible(false)
                    setEditSlot(null)
                    setMoveMode(null)
                    setResizeMode(null)
                    setFocusedHeader(null)
                    setContextMenuVisible(false)
                    setSelectedSlotIndex(prev => prev === null ? (lastGridIndex || 0) : prev)
                    break
                case 'CLOSE_SETTINGS':
                    sfx.close()
                    setSettingsPanelVisible(false)
                    setSelectedSlotIndex(prev => prev === null ? (lastGridIndex || 0) : prev)
                    break
                case 'CLOSE_ADD_GAME':
                    sfx.close()
                    setAddGamePanelVisible(false)
                    setEditSlot(null)
                    setSelectedSlotIndex(prev => prev === null ? (lastGridIndex || 0) : prev)
                    break
                case 'OPEN_EDIT_GAME':
                    openEditGameModal(action.payload)
                    break
            }
        })
        return () => window.api.offMainMessage()
    }, []) // Now stable, no dependencies

    // ─── Input Focus Tracking ────────────────────────────────────────────────────

    useEffect(() => {
        const handleFocus = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                window.api.movementControl.setInputFocused(true)
            }
        }
        const handleBlur = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                window.api.movementControl.setInputFocused(false)
            }
        }
        window.addEventListener('focusin', handleFocus)
        window.addEventListener('focusout', handleBlur)
        return () => {
            window.removeEventListener('focusin', handleFocus)
            window.removeEventListener('focusout', handleBlur)
        }
    }, [])

    // ─── Navigation / Input Handling ─────────────────────────────────────────────
    const lastMovementTimeRef = useRef(0)

    useEffect(() => {
        const handleMovementAction = (section: string, action: string) => {
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
                    // Check if new position is valid (no collision with occupied cells)
                    const newStartRow = Math.floor(newPos / cols)
                    const newStartCol = newPos % cols
                    const fitsGrid = newStartCol + cSpan <= cols && newStartRow + rSpan <= rows
                    if (fitsGrid) {
                        const occupied = buildOccupiedCells(grid.items, page, cols, mm.slotId)
                        const newCells = getSlotCells(newPos, cSpan, rSpan, cols)
                        const canPlace = newCells.every(c => !occupied.has(c))
                        sfx.navigate()
                        setMoveMode(prev => prev ? { ...prev, ghostPosition: newPos } : null)
                        if (!canPlace) sfx.error()
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
            if (section === 'grid') {
                if (action === 'up' && selectedSlotIndex !== null && selectedSlotIndex < homeGrid.cols) {
                    sfx.navigate()
                    setLastGridIndex(selectedSlotIndex)
                    const isLeftHalf = (selectedSlotIndex % homeGrid.cols) < (homeGrid.cols / 2)
                    const side = isLeftHalf ? 'left' : 'right'
                    if (side === 'left' && mainIcons.length === 0) return
                    if (side === 'right' && socialIcons.length === 0) return
                    setFocusedHeader(side)
                    setFocusedHeaderIndex(0)
                    window.api.movementControl.send('SET_SECTION', 'header')
                    setSelectedSlotIndex(null)
                    return
                }
                sfx.navigate()
                gridNavigate(action, homeGrid.items, currentPage)
            } else if (action === 'openMain') {
                sfx.confirm(); setMainExpanded(p => !p)
            } else if (action === 'openSocial') {
                sfx.confirm(); setSocialExpanded(p => !p)
            } else if (section === 'header') {
                if (action === 'down' || action === 'back') {
                    sfx.navigate()
                    setFocusedHeader(null)
                    if (settingsPanelVisible) {
                        window.api.movementControl.send('SET_SECTION', 'settings')
                    } else {
                        setSelectedSlotIndex(lastGridIndex)
                        window.api.movementControl.send('SET_SECTION', 'grid')
                    }
                } else if (action === 'left') {
                    if (focusedHeader === 'right' && focusedHeaderIndex === 0) {
                        if (mainIcons.length > 0) {
                            sfx.navigate(); setFocusedHeader('left'); setFocusedHeaderIndex(mainIcons.length - 1)
                        }
                    } else if (focusedHeaderIndex > 0) {
                        sfx.navigate(); setFocusedHeaderIndex(p => p - 1)
                    }
                } else if (action === 'right') {
                    const maxLen = focusedHeader === 'left' ? mainIcons.length : socialIcons.length
                    if (focusedHeaderIndex < maxLen - 1) {
                        sfx.navigate(); setFocusedHeaderIndex(p => p + 1)
                    } else if (focusedHeader === 'left' && socialIcons.length > 0) {
                        sfx.navigate(); setFocusedHeader('right'); setFocusedHeaderIndex(0)
                    }
                } else if (action === 'select') {
                    const iconList = focusedHeader === 'left' ? mainIcons : socialIcons
                    const icon = iconList[focusedHeaderIndex]
                    if (icon?.onClick) { sfx.confirm(); window.api.mainOptionControl(icon.onClick) }
                }
            } else if (section === 'context-menu') {
                if (contextOptions.length === 0) return
                switch (action) {
                    case 'right': sfx.navigate(); setContextMenuSelectedIndex((prev) => (prev + 1) % contextOptions.length); break
                    case 'left': sfx.navigate(); setContextMenuSelectedIndex((prev) => (prev - 1 + contextOptions.length) % contextOptions.length); break
                    case 'select': {
                        const selected = contextOptions[contextMenuSelectedIndex]
                        if (selected) { sfx.confirm(); handleContextOptionClick(selected) }
                        break
                    }
                }
            } else if (section === 'add-game-modal') {
                window.dispatchEvent(new CustomEvent('panel-move', { detail: action }))
            } else if (section === 'settings') {
                window.dispatchEvent(new CustomEvent('panel-move', { detail: action }))
            }
        }

        const removeListener = window.api.movementControl.onAction(handleMovementAction)
        return () => removeListener()
    }, [
        homeGrid.rows, homeGrid.cols, homeGrid.items,
        currentPage, contextOptions, contextMenuSelectedIndex,
        addGameSelectedIndex, focusedHeader, focusedHeaderIndex,
        lastGridIndex, selectedSlotIndex, mainIcons, socialIcons,
        settingsPanelVisible, exitMoveMode, exitResizeMode, persistItems
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

    // ─── Render ───────────────────────────────────────────────────────────────────

    return (
        <div className="app">
            {/* ── Dynamic Background ── */}
            <div className="background-overlay" />

            <AnimatePresence mode="wait">
                {backgroundImage && (
                    <motion.div
                        key={backgroundImage}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7 }}
                        className="background-image-layer"
                        style={{ backgroundImage: `url(${backgroundImage})` }}
                    />
                )}
            </AnimatePresence>

            {/* ── Header ── */}
            <NavigationHeader
                mainIcons={mainIcons}
                socialIcons={socialIcons}
                mainExpanded={mainExpanded}
                socialExpanded={socialExpanded}
                displayText={displayText}
                islandWidth={islandWidth}
                textOpacity={textOpacity}
                focusedHeader={focusedHeader}
                focusedIndex={focusedHeaderIndex}
            />

            {/* ── Main content area ── */}
            <div className="main-view-area">
                <AnimatePresence mode="wait">
                    {!settingsPanelVisible && !addGamePanelVisible ? (
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
                                onClose={() => { sfx.close(); setSettingsPanelVisible(false); window.api.movementControl.send('SET_SECTION', 'grid') }}
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
                            />
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            <AnimatePresence>
                {!settingsPanelVisible && !addGamePanelVisible && !moveMode && !resizeMode && (
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

            {/* ── Mode HUD ── */}
            <AnimatePresence>
                {moveMode && (
                    <motion.div
                        className="grid-mode-hud"
                        initial={{ opacity: 0, y: 10, scale: 0.9, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                        exit={{ opacity: 0, y: 10, scale: 0.9, x: '-50%' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    >
                        <Icon icon="mynaui:arrow-up-down-left-right" className="grid-mode-hud__icon" />
                        <span>Selecciona la nueva posición</span>
                        <kbd>↑↓←→</kbd>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>mover</span>
                        <kbd>Enter</kbd>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>confirmar</span>
                        <kbd>Esc</kbd>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>cancelar</span>
                    </motion.div>
                )}
                {resizeMode && (
                    <motion.div
                        className="grid-mode-hud grid-mode-hud--resize"
                        initial={{ opacity: 0, y: 10, scale: 0.9, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                        exit={{ opacity: 0, y: 10, scale: 0.9, x: '-50%' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    >
                        <Icon icon="mynaui:expand" className="grid-mode-hud__icon" />
                        <span>Ajusta el tamaño</span>
                        <kbd>→/↓</kbd>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>ampliar</span>
                        <kbd>←/↑</kbd>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>reducir</span>
                        <kbd>Enter</kbd>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>confirmar</span>
                        <kbd>Esc</kbd>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>cancelar</span>
                    </motion.div>
                )}
            </AnimatePresence>

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