import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import { Emulator, Platform } from '../../../shared/types'
import { sfx } from '../utils/audioManager'
import SidePanel, { ConsolePanelTab } from './SidePanel'
import { useDialog } from '../hooks/useDialog'
import { useToast } from '../hooks/useToast'

// ─── Keymap labels ────────────────────────────────────────────────────────────
const KEYMAP_LABELS: Record<string, string> = {
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

const KEYBOARD_KEYS = ['overlay', 'contextMenu', 'openMain', 'openSocial', 'up', 'down', 'left', 'right', 'select', 'back', 'nextPage', 'prevPage']
const GAMEPAD_KEYS = [
    'gamepadA', 'gamepadB', 'gamepadX', 'gamepadY', 
    'gamepadLB', 'gamepadRB', 'gamepadLT', 'gamepadRT', 
    'gamepadSelect', 'gamepadStart', 'gamepadLeftStick', 'gamepadRightStick',
    'gamepadUp', 'gamepadDown', 'gamepadLeft', 'gamepadRight'
]

type Tab = 'platforms' | 'emulators' | 'controls' | 'grid' | 'friends' | 'trophies'
type FocusArea = 'nav' | 'nav_close' | 'content' | 'footer'

interface EmulatorForm { name: string; path: string; args: string; platforms: string[] }
const EMPTY_EMU: EmulatorForm = { name: '', path: '', args: '', platforms: [] }

interface PlatformForm { id: string; name: string; icon: string; image: string; company: string }
const EMPTY_PLATFORM: PlatformForm = { id: '', name: '', icon: '', image: '', company: '' }

interface SettingsPanelProps {
    visible: boolean
    onClose: () => void
    onJumpToHeader: (side: 'left' | 'right') => void
    gridConfig?: { rows: number; cols: number; gap: number; aspectRatio: number }
    onGridConfigChange?: (rows: number, cols: number, gap: number, aspectRatio: number) => void
    minGridDimensions?: { minRows: number; minCols: number }
}

const TABS: ConsolePanelTab[] = [
    { id: 'platforms', label: 'Plataformas', icon: 'mynaui:grid-nine',    description: 'Define las consolas y sistemas disponibles' },
    { id: 'emulators', label: 'Emuladores',  icon: 'mynaui:chip',         description: 'Gestiona tus emuladores y rutas de acceso' },
    { id: 'controls',  label: 'Controles',   icon: 'mynaui:joystick',     description: 'Reasigna los botones de tu mando o teclado' },
    { id: 'grid',      label: 'Cuadrícula',  icon: 'mynaui:grid',         description: 'Personaliza las filas, columnas y aspecto del grid' },
    { id: 'friends',   label: 'Amigos',      icon: 'mynaui:users',        description: 'Próximamente — Lista de amigos y estado' },
    { id: 'trophies',  label: 'Logros',      icon: 'mynaui:award',        description: 'Próximamente — Logros desbloqueados' },
]

const TAB_IDS = TABS.map(t => t.id) as Tab[]

function SettingsPanel({ visible, onClose, onJumpToHeader, gridConfig, onGridConfigChange, minGridDimensions }: SettingsPanelProps): React.JSX.Element {
    const [tab, setTab]                     = useState<Tab>('platforms')
    const { showDialog } = useDialog()
    const { showToast } = useToast()
    const [controlsSubTab, setControlsSubTab] = useState<'menu' | 'keyboard' | 'gamepad'>('menu')
    const [focusArea, setFocusArea]         = useState<FocusArea>('nav')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [isDeleteFocused, setIsDeleteFocused] = useState(false)
    const [footerIndex, setFooterIndex]     = useState(0)

    const [emulators, setEmulators]         = useState<Emulator[]>([])
    const [emuForm, setEmuForm]             = useState<EmulatorForm>(EMPTY_EMU)
    const [editingEmuId, setEditingEmuId]   = useState<string | null>(null)
    const [emuError, setEmuError]           = useState<string | null>(null)
    const [emuSaving, setEmuSaving]         = useState(false)

    const [platforms, setPlatforms]         = useState<Platform[]>([])
    const [platForm, setPlatForm]           = useState<PlatformForm>(EMPTY_PLATFORM)
    const [editingPlatId, setEditingPlatId] = useState<string | null>(null)
    const [platError, setPlatError]         = useState<string | null>(null)
    const [platSaving, setPlatSaving]       = useState(false)
    const [isPlatFormExpanded, setIsPlatFormExpanded] = useState(false)

    const [keymaps, setKeymaps]             = useState<Record<string, string>>({})
    const [listeningKey, setListeningKey]   = useState<string | null>(null)
    const [keymapDirty, setKeymapDirty]     = useState(false)
    const [keymapSaving, setKeymapSaving]   = useState(false)

    // Grid settings local state
    const [gridRows, setGridRows]           = useState(gridConfig?.rows ?? 4)
    const [gridCols, setGridCols]           = useState(gridConfig?.cols ?? 6)
    const [gridGap, setGridGap]             = useState(gridConfig?.gap ?? 10)
    const [gridAspect, setGridAspect]       = useState(gridConfig?.aspectRatio ?? 1)
    const [gridDirty, setGridDirty]         = useState(false)
    const [isInputEditing, setIsInputEditing] = useState(false)
    const [focusedPlatIdx, setFocusedPlatIdx] = useState(0)
    const [isEmuPlatMenuOpen, setIsEmuPlatMenuOpen] = useState(false)
    const [emuPlatMenuHoverIndex, setEmuPlatMenuHoverIndex] = useState(0)

    const hasUnsavedChanges = keymapDirty || gridDirty

    const sortedPlatforms = React.useMemo(() => {
        return [...platforms].sort((a, b) => {
            const nameA = a.name || ''
            const nameB = b.name || ''
            return nameA.localeCompare(nameB)
        })
    }, [platforms])

    // ── Refs: always-fresh snapshots used inside the event handler ────────────
    const r = useRef({
        tab, controlsSubTab, focusArea, selectedIndex, footerIndex,
        emulators, platforms, keymaps, listeningKey, visible, onJumpToHeader,
        gridRows, gridCols, gridGap, gridAspect, hasUnsavedChanges,
        isInputEditing, platForm
    })
    useEffect(() => {
        r.current = { tab, controlsSubTab, focusArea, selectedIndex, isDeleteFocused, footerIndex, emulators, platforms: sortedPlatforms, keymaps, listeningKey, visible, onJumpToHeader, gridRows, gridCols, gridGap, gridAspect, hasUnsavedChanges, isInputEditing, isPlatFormExpanded, editingPlatId, editingEmuId, platForm, emuForm, focusedPlatIdx, isEmuPlatMenuOpen, emuPlatMenuHoverIndex }
    })

    // ── Load / reset when panel opens ─────────────────────────────────────────
    useEffect(() => {
        if (!visible) return
        window.api.platforms.getAll().then(setPlatforms)
        window.api.emulators.getAll().then(setEmulators)
        window.api.keymaps.getAll().then(setKeymaps)
        setFocusArea('nav')
        setTab('platforms')
        setSelectedIndex(0)
        setIsDeleteFocused(false)
        setFooterIndex(0)
        setListeningKey(null)
        setIsPlatFormExpanded(false)
        // Sync grid from parent
        if (gridConfig) {
            setGridRows(gridConfig.rows)
            setGridCols(gridConfig.cols)
            setGridGap(gridConfig.gap)
            setGridAspect(gridConfig.aspectRatio)
        }
        setGridDirty(false)
    }, [visible])

    // ── Consolidate scroll resets on tab switch ──────────────────────────────
    useEffect(() => {
        const container = document.querySelector('.console-panel__content-body')
        if (container) container.scrollTop = 0
        setSelectedIndex(0)
        setIsDeleteFocused(false)
        setFooterIndex(0)
        setListeningKey(null)
        setControlsSubTab('menu')
    }, [tab])

    useEffect(() => {
        const container = document.querySelector('.console-panel__content-body')
        if (container) container.scrollTop = 0
    }, [controlsSubTab])


    // ── Reset footerIndex when navigating away from footer ────────────────────
    useEffect(() => {
        if (focusArea !== 'footer') setFooterIndex(0)
    }, [focusArea])

    const handleSaveEmulator = async () => {
        const { emuForm: currentForm, editingEmuId: currentId } = r.current
        if (!currentForm.name.trim()) { setEmuError('El nombre es obligatorio'); return }
        setEmuSaving(true)
        try {
            const res = await window.api.emulators.save({
                id: currentId || crypto.randomUUID(),
                ...currentForm
            })
            if (res.success) {
                const updated = await window.api.emulators.getAll()
                setEmulators(updated)
                resetEmuForm()
                sfx.confirm()
            }
        } catch (e) { setEmuError('Error al guardar') } finally { setEmuSaving(false) }
    }

    const resetEmuForm = () => {
        setEmuForm(EMPTY_EMU); setEditingEmuId(null); setEmuError(null); setFocusedPlatIdx(0)
    }

    const handleEditEmulator = (emu: Emulator) => {
        setEmuForm({ name: emu.name, path: emu.path, args: emu.args, platforms: emu.platforms || [] })
        setEditingEmuId(emu.id); setEmuError(null); sfx.confirm()
    }

    const handleRemoveEmulator = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (await window.api.emulators.remove(id)) {
            setEmulators(prev => prev.filter(emu => emu.id !== id))
            if (editingEmuId === id) resetEmuForm()
            sfx.cancel()
        }
    }

    const handleBrowseEmulator = async () => {
        const path = await window.api.browseFile({ filters: [{ name: 'Ejecutables', extensions: ['exe', 'bat', 'cmd', 'sh', 'app'] }] })
        if (path) setEmuForm(p => ({ ...p, path }))
    }

    // ─── Platform Handlers ──────────────────────────────────────────────────
    const handleSavePlatform = async () => {
        const currentForm = r.current.platForm
        if (!currentForm.name.trim()) { setPlatError('El nombre es obligatorio'); return }
        
        setPlatSaving(true)
        try {
            const newId = currentForm.id.trim() || crypto.randomUUID()
            const originalId = r.current.editingPlatId
            
            // If ID changed during edit, remove the old one first
            if (originalId && originalId !== newId) {
                await window.api.platforms.remove(originalId)
            }

            const res = await window.api.platforms.save({
                ...currentForm,
                id: newId
            })
            
            if (res.success) {
                setPlatforms(await window.api.platforms.getAll())
                resetPlatForm()
                sfx.confirm()
                
                // Reset scroll to top and focus first item
                setTimeout(() => {
                    const container = document.querySelector('.console-panel__content-body')
                    if (container) container.scrollTo({ top: 0, behavior: 'instant' })
                    setSelectedIndex(0)
                }, 10)
            }
        } catch (e) { 
            setPlatError('Error al guardar') 
        } finally { 
            setPlatSaving(false) 
        }
    }

    const resetPlatForm = () => {
        setPlatForm(EMPTY_PLATFORM); setEditingPlatId(null); setPlatError(null); setIsPlatFormExpanded(false)
    }

    const handleEditPlatform = (plat: Platform) => {
        setPlatForm({ id: plat.id, name: plat.name, icon: plat.icon || '', image: plat.image || '', company: plat.company || '' })
        setEditingPlatId(plat.id); setPlatError(null); sfx.confirm()
        setIsPlatFormExpanded(true)
    }

    const handleRemovePlatform = async (e: React.MouseEvent | undefined, id: string) => {
        if (e) e.stopPropagation()
        const currentIndex = sortedPlatforms.findIndex(p => p.id === id)
        if (currentIndex === -1) return

        if (await window.api.platforms.remove(id)) {
            const updatedPlatforms = platforms.filter(p => p.id !== id)
            setPlatforms(updatedPlatforms)
            if (editingPlatId === id) resetPlatForm()
            sfx.cancel()
            setIsDeleteFocused(false)

            const offset = isPlatFormExpanded ? 11 : 2
            if (updatedPlatforms.length === 0) {
                setSelectedIndex(0)
            } else {
                const newRelIdx = currentIndex > 0 ? currentIndex - 1 : 0
                setSelectedIndex(offset + newRelIdx)
            }
        }
    }

    const handleBrowsePlatIcon = async () => {
        const path = await window.api.browseFile({ filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] }] })
        if (path) {
            const res = await window.api.artwork.import(path)
            if (res.success && res.url) setPlatForm(p => ({ ...p, icon: res.url! }))
        }
    }

    const handleBrowsePlatImage = async () => {
        const path = await window.api.browseFile({ filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] })
        if (path) {
            const res = await window.api.artwork.import(path)
            if (res.success && res.url) setPlatForm(p => ({ ...p, image: res.url! }))
        }
    }

    const [platSyncing, setPlatSyncing] = useState(false)

    const executeSync = async (overwrite: boolean) => {
        resetPlatForm()
        setPlatSyncing(true)
        try {
            const res = await window.api.platforms.sync({ overwrite })
            if (res.success) {
                const updated = await window.api.platforms.getAll()
                setPlatforms(updated)
                // sfx.confirm() // Removed as requested
                setSelectedIndex(0)
            } else {
                setPlatError(res.error || 'Error al sincronizar')
                sfx.error()
            }
        } catch (err) {
            setPlatError('Error de red')
            sfx.error()
        } finally {
            setPlatSyncing(false)
        }
    }

    const handleSyncPlatforms = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        
        showDialog({
            title: 'Sincronizar Plataformas',
            message: '¿Cómo quieres importar las plataformas? Puedes sobreescribir las existentes o solo añadir las nuevas.',
            icon: 'mynaui:cloud-download',
            actions: [
                { label: 'Fusionar', variant: 'secondary', onClick: () => executeSync(false) },
                { label: 'Sobreescribir', variant: 'danger', onClick: () => executeSync(true) },
                { label: 'Cancelar', variant: 'ghost', onClick: () => {} }
            ]
        })
    }

    useEffect(() => {
        if (!listeningKey) {
            window.api.movementControl.setInputCapture(false)
            return
        }

        window.api.movementControl.setInputCapture(true)
        
        const handleKey = (e: KeyboardEvent) => {
            e.preventDefault()
            setKeymaps(prev => ({ ...prev, [listeningKey]: e.key === ' ' ? 'Space' : e.key }))
            setKeymapDirty(true)
            setListeningKey(null)
            window.api.movementControl.setInputCapture(false)
            sfx.confirm()
        }
        window.addEventListener('keydown', handleKey, { once: true })
        return () => {
            window.removeEventListener('keydown', handleKey)
            // Safety cleanup
            window.api.movementControl.setInputCapture(false)
        }
    }, [listeningKey])

    // ── Platform Dropdown Scrolling ───────────────────────────────────────────
    useEffect(() => {
        if (isEmuPlatMenuOpen) {
            const el = document.getElementById(`ag-emu-plat-opt-${emuPlatMenuHoverIndex}`)
            const parent = el?.parentElement
            if (el && parent) {
                const targetScroll = el.offsetTop - (parent.offsetHeight / 2) + (el.offsetHeight / 2)
                parent.scrollTo({ top: targetScroll, behavior: 'smooth' })
            }
        }
    }, [emuPlatMenuHoverIndex, isEmuPlatMenuOpen])

    // ── Consolidated Auto-scroll: keep the focused row visible ────────────────
    useEffect(() => {
        if (focusArea !== 'content') return
        const container = document.querySelector<HTMLElement>('.console-panel__content-body')
        if (!container) return

        if (selectedIndex === 0) {
            container.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        // Small delay to ensure DOM is updated (especially after accordion transitions)
        const timeoutId = setTimeout(() => {
            const el = container.querySelector<HTMLElement>('[data-focused="true"]')
            if (!el) return

            const crect = container.getBoundingClientRect()
            const erect = el.getBoundingClientRect()
            const currentScroll = container.scrollTop
            const targetScroll = currentScroll + (erect.top - crect.top) - (container.offsetHeight / 2) + (erect.height / 2)
            container.scrollTo({ top: targetScroll, behavior: 'smooth' })
        }, 40) // Much lower delay for immediate, fluid response
        
        return () => clearTimeout(timeoutId)
    }, [selectedIndex, focusArea, tab, isPlatFormExpanded, editingEmuId, editingPlatId])

    // ── Focus tracking for editing mode ──────────────────────────────────────
    useEffect(() => {
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && target.id.startsWith('emu-')) {
                setIsInputEditing(true)
            }
        }
        const handleFocusOut = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && target.id.startsWith('emu-')) {
                setIsInputEditing(false)
            }
        }
        window.addEventListener('focusin', handleFocusIn)
        window.addEventListener('focusout', handleFocusOut)
        return () => {
            window.removeEventListener('focusin', handleFocusIn)
            window.removeEventListener('focusout', handleFocusOut)
        }
    }, [])

    // ── Navigation handler — registered ONCE, reads state via `r.current` ─────
    useEffect(() => {
        const handler = (e: Event) => {
            const { visible: vis, tab: ct, controlsSubTab: cSub, focusArea: area, selectedIndex: idx,
                    footerIndex: fIdx, emulators: emus, keymaps: kms,
                    listeningKey: lKey } = r.current

            if (!vis) return
            // If a dropdown is open, handle it first
            if (r.current.isEmuPlatMenuOpen) {
                e.stopImmediatePropagation()
                const action = (e as CustomEvent<string>).detail
                const platOptions = r.current.platforms
                const currentHover = r.current.emuPlatMenuHoverIndex

                if (action === 'up') {
                    if (currentHover > 0) { sfx.navigate(); setEmuPlatMenuHoverIndex(currentHover - 1) }
                } else if (action === 'down') {
                    if (currentHover < platOptions.length - 1) { sfx.navigate(); setEmuPlatMenuHoverIndex(currentHover + 1) }
                } else if (action === 'select') {
                    const plat = platOptions[currentHover]
                    if (plat) {
                        sfx.confirm()
                        setEmuForm(prev => {
                            const isSelected = prev.platforms.includes(plat.id)
                            const next = isSelected 
                                ? prev.platforms.filter(id => id !== plat.id)
                                : [...prev.platforms, plat.id]
                            return { ...prev, platforms: next }
                        })
                    }
                } else if (action === 'back' || action === 'escape') {
                    sfx.cancel(); setIsEmuPlatMenuOpen(false)
                }
                return
            }

            // If a dialog is open, let it handle the events exclusively
            if (document.querySelector('.ag-dialog-overlay')) return
            // While remapping or typing, ignore navigation
            if (lKey || r.current.isInputEditing) return

            const action = (e as CustomEvent<string>).detail

            // ── Nav rail ──────────────────────────────────────────────────────
            if (area === 'nav') {
                const tabIdx = TAB_IDS.indexOf(ct)
                if (action === 'up') {
                    if (tabIdx > 0) { sfx.navigate(); setTab(TAB_IDS[tabIdx - 1]) }
                } else if (action === 'down') {
                    if (tabIdx < TAB_IDS.length - 1) { sfx.navigate(); setTab(TAB_IDS[tabIdx + 1]) }
                    else { 
                        sfx.navigate()
                        if (r.current.hasUnsavedChanges) setFocusArea('nav_save')
                        else setFocusArea('nav_close')
                    }
                } else if (action === 'select') {
                    sfx.navigate(); setFocusArea('content')
                } else if (action === 'right') {
                    // Ignorar derecha para entrar en secciones (solo aceptar)
                } else if (action === 'back') {
                    sfx.cancel(); onClose()
                }
                return
            }

            // ── Save button ───────────────────────────────────────────────────
            if (area === 'nav_save') {
                if (action === 'up') {
                    sfx.navigate(); setFocusArea('nav'); setTab(TAB_IDS[TAB_IDS.length - 1])
                } else if (action === 'down') {
                    sfx.navigate(); setFocusArea('nav_close')
                } else if (action === 'select') {
                    // Trigger appropriate save based on current tab
                    if (ct === 'controls') handleSaveKeymaps()
                    if (ct === 'grid') {
                        onGridConfigChange?.(gridRows, gridCols, gridGap, gridAspect)
                        setGridDirty(false)
                        sfx.confirm()
                    }
                } else if (action === 'back') {
                    sfx.navigate(); setFocusArea('nav')
                } else if (action === 'left') {
                    // Ignorar izquierda en botones de sidebar
                }
                return
            }

            // ── Close button ──────────────────────────────────────────────────
            if (area === 'nav_close') {
                if (action === 'up') {
                    sfx.navigate()
                    if (r.current.hasUnsavedChanges) setFocusArea('nav_save')
                    else { setFocusArea('nav'); setTab(TAB_IDS[TAB_IDS.length - 1]) }
                } else if (action === 'down') {
                    // Limitar desplazamiento: no hacer nada hacia abajo desde cerrar
                } else if (action === 'right') {
                    // Ignorar derecha en botones de sidebar
                } else if (action === 'select') {
                    sfx.cancel(); onClose()
                } else if (action === 'back' || action === 'escape') {
                    sfx.navigate(); setFocusArea('nav')
                }
                return
            }

            // ── Content list ──────────────────────────────────────────────────
            if (area === 'content') {
                let count = 0
                const hasFooter = ct === 'controls'

                if (ct === 'platforms') {
                    const formItems = r.current.isPlatFormExpanded ? 10 : 2
                    count = formItems + r.current.platforms.length
                } else if (ct === 'emulators') {
                    const formItems = r.current.editingEmuId ? 6 : 5 // name, path, browse, args, save, [cancel]
                    count = formItems + r.current.emulators.length
                } else if (ct === 'controls') {
                    if (cSub === 'menu') count = 2
                    else if (cSub === 'keyboard') count = KEYBOARD_KEYS.length + 1
                    else if (cSub === 'gamepad') count = 1
                }

                if (action === 'up') {
                    if (ct === 'platforms') {
                        if (idx === 0) return
                        else if (idx === 1) { sfx.navigate(); setSelectedIndex(0); setIsDeleteFocused(false) }
                        else if (r.current.isPlatFormExpanded) {
                            if (idx === 2) { sfx.navigate(); setSelectedIndex(1); setIsDeleteFocused(false) }
                            else if (idx === 3) { sfx.navigate(); setSelectedIndex(2); setIsDeleteFocused(false) }
                            else if (idx === 4) { sfx.navigate(); setSelectedIndex(3); setIsDeleteFocused(false) }
                            else if (idx === 6) { sfx.navigate(); setSelectedIndex(4); setIsDeleteFocused(false) }
                            else if (idx === 8) { sfx.navigate(); setSelectedIndex(6); setIsDeleteFocused(false) }
                            else if (idx === 9 || idx === 10) { sfx.navigate(); setSelectedIndex(8); setIsDeleteFocused(false) }
                            else if (idx === 11) { sfx.navigate(); setSelectedIndex(9); setIsDeleteFocused(false) }
                            else { sfx.navigate(); setSelectedIndex(idx - 1); setIsDeleteFocused(false) }
                        } else {
                            if (idx === 2) { sfx.navigate(); setSelectedIndex(1); setIsDeleteFocused(false) }
                            else { sfx.navigate(); setSelectedIndex(idx - 1); setIsDeleteFocused(false) }
                        }
                    } else if (ct === 'emulators') {
                        const firstEmuIdx = r.current.editingEmuId ? 6 : 5
                        if (idx === 5) {
                            sfx.navigate(); setSelectedIndex(r.current.editingEmuId ? 3 : 4)
                        } else if (idx === firstEmuIdx) { 
                            sfx.navigate(); setSelectedIndex(r.current.editingEmuId ? 5 : 4)
                        } else if (idx > 0) {
                            sfx.navigate(); setSelectedIndex(idx - 1)
                        }
                    } else if (idx > 0) {
                        sfx.navigate(); setSelectedIndex(idx - 1)
                    }
                } else if (action === 'down') {
                    if (ct === 'platforms') {
                        if (idx === 0) { sfx.navigate(); setSelectedIndex(1); setIsDeleteFocused(false) }
                        else if (idx === 1) {
                            sfx.navigate()
                            if (r.current.isPlatFormExpanded) setSelectedIndex(2)
                            else setSelectedIndex(2)
                            setIsDeleteFocused(false)
                        } else if (r.current.isPlatFormExpanded) {
                            if (idx === 2) { sfx.navigate(); setSelectedIndex(3); setIsDeleteFocused(false) }
                            else if (idx === 3) { sfx.navigate(); setSelectedIndex(4); setIsDeleteFocused(false) }
                            else if (idx === 4) { sfx.navigate(); setSelectedIndex(6); setIsDeleteFocused(false) }
                            else if (idx === 6) { sfx.navigate(); setSelectedIndex(8); setIsDeleteFocused(false) }
                            else if (idx === 8) { sfx.navigate(); setSelectedIndex(9); setIsDeleteFocused(false) }
                            else if (idx === 9 || idx === 10) { sfx.navigate(); setSelectedIndex(11); setIsDeleteFocused(false) }
                            else if (idx < count - 1) { sfx.navigate(); setSelectedIndex(idx + 1); setIsDeleteFocused(false) }
                            else if (hasFooter) { sfx.navigate(); setFocusArea('footer'); setIsDeleteFocused(false) }
                        } else {
                            if (idx < count - 1) { sfx.navigate(); setSelectedIndex(idx + 1); setIsDeleteFocused(false) }
                            else if (hasFooter) { sfx.navigate(); setFocusArea('footer'); setIsDeleteFocused(false) }
                        }
                    } else if (ct === 'emulators') {
                        if (idx === 3 && r.current.editingEmuId) {
                            sfx.navigate(); setSelectedIndex(5)
                        } else if (idx === 5 && r.current.editingEmuId) {
                            const firstEmuIdx = 6
                            if (r.current.emulators.length > 0) { sfx.navigate(); setSelectedIndex(firstEmuIdx) }
                            else if (hasFooter) sfx.navigate(), setFocusArea('footer')
                        } else if (idx === 4 && !r.current.editingEmuId) {
                            const firstEmuIdx = 5
                            if (r.current.emulators.length > 0) { sfx.navigate(); setSelectedIndex(firstEmuIdx) }
                            else if (hasFooter) sfx.navigate(), setFocusArea('footer')
                        } else if (idx < count - 1) {
                            sfx.navigate(); setSelectedIndex(idx + 1)
                        } else if (hasFooter) sfx.navigate(), setFocusArea('footer')
                    } else if (idx < count - 1) {
                        sfx.navigate(); setSelectedIndex(idx + 1)
                    } else if (hasFooter) {
                        sfx.navigate(), setFocusArea('footer')
                    }
                } else if (action === 'right') {
                    if (ct === 'platforms') {
                        if (idx === 10) sfx.navigate(), setSelectedIndex(9)
                        else if (idx >= (r.current.isPlatFormExpanded ? 11 : 2)) {
                            sfx.navigate()
                            setIsDeleteFocused(true)
                        }
                    } else if (ct === 'emulators') {
                        if (idx === 4 && r.current.editingEmuId) { // Cancel -> Update
                            sfx.navigate(); setSelectedIndex(5)
                        }
                    }
                } else if (action === 'left') {
                    if (ct === 'platforms') {
                        if (idx === 9) sfx.navigate(), setSelectedIndex(10)
                        else if (r.current.isDeleteFocused) {
                            sfx.navigate()
                            setIsDeleteFocused(false)
                        }
                    } else if (ct === 'emulators') {
                        if (idx === 5) { // Update -> Cancel
                            sfx.navigate(); setSelectedIndex(4)
                        }
                    }
                } else if (action === 'back' || action === 'escape') {
                    if (ct === 'platforms' && r.current.editingPlatId) {
                        sfx.cancel()
                        resetPlatForm()
                        return
                    }
                    if (ct === 'emulators' && r.current.editingEmuId) {
                        sfx.cancel()
                        resetEmuForm()
                        return
                    }
                    sfx.navigate()
                    if (ct === 'controls' && cSub !== 'menu') setControlsSubTab('menu')
                    else setFocusArea('nav')
                } else if (action === 'select') {
                    if (ct === 'platforms') {
                        if (idx === 0) handleSyncPlatforms()
                        else if (idx === 1) {
                            sfx.confirm()
                            setIsPlatFormExpanded(!r.current.isPlatFormExpanded)
                        } else if (r.current.isPlatFormExpanded && idx < 11) {
                            if (idx === 3) { sfx.confirm(); document.getElementById('plat-name')?.focus() }
                            else if (idx === 4) { sfx.confirm(); document.getElementById('plat-icon')?.focus() }
                            else if (idx === 6) { handleBrowsePlatImage() }
                            else if (idx === 8) { sfx.confirm(); document.getElementById('plat-company')?.focus() }
                            else if (idx === 9) { handleSavePlatform() }
                            else if (idx === 10) { resetPlatForm() }
                        } else {
                            const offset = r.current.isPlatFormExpanded ? 11 : 2
                            const pIdx = idx - offset
                            const plat = r.current.platforms[pIdx]
                            if (plat) {
                                if (r.current.isDeleteFocused) {
                                    handleRemovePlatform(undefined, plat.id)
                                    setIsDeleteFocused(false)
                                } else {
                                    handleEditPlatform(plat)
                                    setSelectedIndex(2)
                                }
                            }
                        }
                    } else if (ct === 'emulators') {
                        const formItemsCount = r.current.editingEmuId ? 6 : 5
                        if (idx < formItemsCount) {
                            if (idx === 0) { sfx.confirm(); document.getElementById('emu-name')?.focus() }
                            else if (idx === 1) { handleBrowseEmulator() }
                            else if (idx === 2) {
                                sfx.open()
                                setIsEmuPlatMenuOpen(true)
                                setEmuPlatMenuHoverIndex(0)
                            }
                            else if (idx === 3) { sfx.confirm(); document.getElementById('emu-args')?.focus() }
                            else if (idx === 4) {
                                if (r.current.editingEmuId) resetEmuForm()
                                else handleSaveEmulator()
                            }
                            else if (idx === 5 && r.current.editingEmuId) { handleSaveEmulator() }
                        } else {
                            const emuIdx = idx - formItemsCount
                            const emu = r.current.emulators[emuIdx]
                            if (emu) {
                                handleEditEmulator(emu)
                                setSelectedIndex(0)
                            }
                        }
                    } else if (ct === 'controls') {
                        if (cSub === 'menu') {
                            sfx.confirm()
                            setControlsSubTab(idx === 0 ? 'keyboard' : 'gamepad')
                            setSelectedIndex(0)
                        } else if (cSub === 'keyboard') {
                            if (idx === 0) {
                                setControlsSubTab('menu')
                                setSelectedIndex(0)
                            } else {
                                setListeningKey(KEYBOARD_KEYS[idx - 1])
                            }
                        } else if (cSub === 'gamepad') {
                            setControlsSubTab('menu')
                            setSelectedIndex(1)
                        }
                    }
                }
                return
            }

            // ── Footer buttons ────────────────────────────────────────────────
            if (area === 'footer') {
                let count = 0
                if (ct === 'emulators') {
                    count = emus.length + 1
                } else if (ct === 'controls') {
                    if (cSub === 'menu') count = 2
                    else if (cSub === 'keyboard') count = KEYBOARD_KEYS.length + 1
                    else if (cSub === 'gamepad') count = 1
                }

                if (action === 'up') {
                    sfx.navigate(); setFocusArea('content'); setSelectedIndex(count > 0 ? count - 1 : 0)
                } else if (action === 'down') {
                    // Limitar: no salir del footer hacia abajo
                } else if (action === 'left') {
                    if (fIdx > 0) { sfx.navigate(); setFooterIndex(fIdx - 1) }
                } else if (action === 'right') {
                    if (fIdx < 1) { sfx.navigate(); setFooterIndex(fIdx + 1) }
                } else if (action === 'select') {
                    if (fIdx === 0) { sfx.confirm(); document.getElementById('btn-reset-keymaps')?.click() }
                    else { sfx.confirm(); document.getElementById('btn-save-keymaps')?.click() }
                } else if (action === 'back') {
                    sfx.navigate(); setFocusArea('content'); setSelectedIndex(count > 0 ? count - 1 : 0)
                }
            }
        }

        window.addEventListener('panel-move', handler)
        return () => window.removeEventListener('panel-move', handler)
    }, [onClose]) // eslint-disable-line react-hooks/exhaustive-deps


    const handleSaveKeymaps  = async () => {
        setKeymapSaving(true)
        try { await window.api.keymaps.save(keymaps); sfx.confirm(); setKeymapDirty(false) }
        catch { sfx.error() } finally { setKeymapSaving(false) }
    }
    const handleResetKeymaps = async () => {
        setKeymaps(await window.api.keymaps.getAll()); setKeymapDirty(false); sfx.cancel()
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <SidePanel
            visible={visible}
            tabs={TABS}
            activeTab={tab}
            focusArea={focusArea}
            onTabChange={id => { setTab(id as Tab); setFocusArea('content'); setSelectedIndex(0) }}
            onClose={onClose}
            hasUnsavedChanges={hasUnsavedChanges}
            onSave={() => {
                if (tab === 'controls') handleSaveKeymaps()
                if (tab === 'grid') {
                    onGridConfigChange?.(gridRows, gridCols, gridGap, gridAspect)
                    setGridDirty(false)
                    sfx.confirm()
                }
            }}
            footer={tab === 'controls' ? (
                <div className="cp-footer-actions">
                    <button
                        id="btn-reset-keymaps"
                        className={`cp-btn cp-btn--secondary ${focusArea === 'footer' && footerIndex === 0 ? 'cp-btn--focused' : ''}`}
                        onClick={handleResetKeymaps}
                        disabled={keymapSaving}
                    >
                        <Icon icon="mynaui:refresh" /> Recargar
                    </button>
                    <button
                        id="btn-save-keymaps"
                        className={`cp-btn cp-btn--primary ${focusArea === 'footer' && footerIndex === 1 ? 'cp-btn--focused' : ''}`}
                        onClick={handleSaveKeymaps}
                        disabled={!keymapDirty || keymapSaving}
                    >
                        <Icon icon="mynaui:check" /> {keymapSaving ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            ) : null}
        >

            {/* ══ Plataformas ══ */}
            {tab === 'platforms' && (
                <div className="cp-section">
                    <div style={{ marginBottom: '24px', paddingLeft: '4px' }}>
                        <button className={`cp-btn cp-btn--secondary ${focusArea === 'content' && selectedIndex === 0 ? 'cp-btn--focused' : ''}`}
                                data-focused={focusArea === 'content' && selectedIndex === 0 ? 'true' : undefined}
                                style={{ width: 'auto' }}
                                onClick={(e) => handleSyncPlatforms(e)} disabled={platSyncing}>
                            <Icon icon={platSyncing ? 'mynaui:refresh' : 'mynaui:api'} className={platSyncing ? 'ag-spin' : ''} />
                            {platSyncing ? 'Sincronizando…' : 'Refrescar API'}
                        </button>
                    </div>

                    <div className={`cp-accordion ${isPlatFormExpanded ? 'cp-accordion--expanded' : ''}`}>
                        <button 
                            className={`cp-accordion__header ${focusArea === 'content' && selectedIndex === 1 ? 'cp-accordion__header--focused' : ''}`}
                            data-focused={focusArea === 'content' && selectedIndex === 1 ? 'true' : undefined}
                            onClick={() => {
                                setFocusArea('content');
                                setSelectedIndex(1);
                                setIsPlatFormExpanded(!isPlatFormExpanded);
                            }}
                        >
                            <Icon icon={editingPlatId ? 'mynaui:edit' : 'mynaui:plus'} className="cp-accordion__icon" />
                            <div className="cp-accordion__title">
                                {editingPlatId ? 'Editar plataforma' : 'Añadir plataforma'}
                            </div>
                            <Icon icon="mynaui:chevron-down" className="cp-accordion__arrow" />
                        </button>

                        <div className="cp-accordion__content">
                            <div className="cp-form" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                                {platError && <div className="cp-form__error" style={{ marginBottom: '12px' }}><Icon icon="mynaui:info-circle" />{platError}</div>}

                                {/* ID */}
                                <div className={`ag-field-row ${focusArea === 'content' && isPlatFormExpanded && selectedIndex === 2 ? 'ag-field-row--focused' : ''}`}
                                     data-focused={focusArea === 'content' && isPlatFormExpanded && selectedIndex === 2 ? 'true' : undefined}
                                     onClick={() => { setFocusArea('content'); setSelectedIndex(2); document.getElementById('plat-id')?.focus() }}>
                                    <Icon icon="mynaui:id" className="ag-field-icon" />
                                    <div className="ag-field-body">
                                        <div className="ag-field-label">ID de la Plataforma (Identificador único)</div>
                                        <input id="plat-id" className="ag-field-input" type="text" placeholder="Ej. ps2, n64, custom-system..."
                                               value={platForm.id} onChange={e => setPlatForm(p => ({ ...p, id: e.target.value }))} disabled={platSaving} />
                                    </div>
                                </div>

                                {/* Name */}
                                <div className={`ag-field-row ${focusArea === 'content' && isPlatFormExpanded && selectedIndex === 3 ? 'ag-field-row--focused' : ''}`}
                                     data-focused={focusArea === 'content' && isPlatFormExpanded && selectedIndex === 3 ? 'true' : undefined}
                                     onClick={() => { setFocusArea('content'); setSelectedIndex(3); document.getElementById('plat-name')?.focus() }}>
                                    <Icon icon="mynaui:tag" className="ag-field-icon" />
                                    <div className="ag-field-body">
                                        <div className="ag-field-label">Nombre de la Plataforma</div>
                                        <input id="plat-name" className="ag-field-input" type="text" placeholder="Ej. PlayStation 2, Nintendo 64..."
                                               value={platForm.name} onChange={e => setPlatForm(p => ({ ...p, name: e.target.value }))} disabled={platSaving} />
                                    </div>
                                </div>

                                {/* Icon */}
                                <div className={`ag-field-row ${focusArea === 'content' && isPlatFormExpanded && selectedIndex === 4 ? 'ag-field-row--focused' : ''}`}
                                     data-focused={focusArea === 'content' && isPlatFormExpanded && selectedIndex === 4 ? 'true' : undefined}
                                     onClick={() => { setFocusArea('content'); setSelectedIndex(4); document.getElementById('plat-icon')?.focus() }}>
                                <Icon icon="mynaui:grid" className="ag-field-icon" />
                                    <div className="ag-field-body">
                                        <div className="ag-field-label">Icono (Iconify)</div>
                                        <input id="plat-icon" className="ag-field-input" type="text" placeholder="Ej. mdi:nintendo-switch, logos:playstation..."
                                               value={platForm.icon} onChange={e => setPlatForm(p => ({ ...p, icon: e.target.value }))} disabled={platSaving} />
                                    </div>
                                </div>

                                {/* Image */}
                                <div className={`ag-field-row ${focusArea === 'content' && isPlatFormExpanded && selectedIndex === 6 ? 'ag-field-row--focused' : ''}`}
                                     data-focused={focusArea === 'content' && isPlatFormExpanded && selectedIndex === 6 ? 'true' : undefined}
                                     onClick={() => { setFocusArea('content'); setSelectedIndex(6); handleBrowsePlatImage() }}>
                                <Icon icon="mynaui:image" className="ag-field-icon" />
                                    <div className="ag-field-body">
                                        <div className="ag-field-label">Imagen de Fondo / Logo</div>
                                        <input id="plat-image" className="ag-field-input" type="text" placeholder="Seleccionar archivo..."
                                               value={platForm.image} readOnly disabled />
                                    </div>
                                </div>

                                {/* Company */}
                                <div className={`ag-field-row ${focusArea === 'content' && isPlatFormExpanded && selectedIndex === 8 ? 'ag-field-row--focused' : ''}`}
                                     data-focused={focusArea === 'content' && isPlatFormExpanded && selectedIndex === 8 ? 'true' : undefined}
                                     onClick={() => { setFocusArea('content'); setSelectedIndex(8); document.getElementById('plat-company')?.focus() }}>
                                    <Icon icon="mynaui:briefcase" className="ag-field-icon" />
                                    <div className="ag-field-body">
                                        <div className="ag-field-label">Empresa / Fabricante</div>
                                        <input id="plat-company" className="ag-field-input" type="text" placeholder="Ej. Sony, Nintendo, Sega..."
                                               value={platForm.company} onChange={e => setPlatForm(p => ({ ...p, company: e.target.value }))} disabled={platSaving} />
                                    </div>
                                </div>

                                <div className="cp-form__actions">
                                    {editingPlatId ? (
                                        <>
                                            <button className={`cp-btn cp-btn--ghost ${focusArea === 'content' && isPlatFormExpanded && selectedIndex === 10 ? 'cp-btn--focused' : ''}`}
                                                    data-focused={focusArea === 'content' && isPlatFormExpanded && selectedIndex === 10 ? 'true' : undefined}
                                                    data-last={platforms.length === 0 ? 'true' : undefined}
                                                    onClick={resetPlatForm} disabled={platSaving}>Cancelar</button>
                                            <button className={`cp-btn cp-btn--primary ${focusArea === 'content' && isPlatFormExpanded && selectedIndex === 9 ? 'cp-btn--focused' : ''}`}
                                                    data-focused={focusArea === 'content' && isPlatFormExpanded && selectedIndex === 9 ? 'true' : undefined}
                                                    onClick={handleSavePlatform} disabled={platSaving}>
                                                <Icon icon="mynaui:check" />
                                                {platSaving ? 'Guardando…' : 'Actualizar'}
                                            </button>
                                        </>
                                    ) : (
                                        <button className={`cp-btn cp-btn--primary ${focusArea === 'content' && isPlatFormExpanded && selectedIndex === 9 ? 'cp-btn--focused' : ''}`}
                                                data-focused={focusArea === 'content' && isPlatFormExpanded && selectedIndex === 9 ? 'true' : undefined}
                                                data-last={platforms.length === 0 && !editingPlatId ? 'true' : undefined}
                                                onClick={handleSavePlatform} disabled={platSaving}>
                                            <Icon icon="mynaui:plus" />
                                            {platSaving ? 'Añadiendo…' : 'Añadir'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="cp-divider" style={{ margin: '10px 0 30px' }} />

                    {platforms.length === 0 ? (
                        <div className="cp-empty">
                            <Icon icon="mynaui:ghost" className="cp-empty__icon" />
                            <p>No hay plataformas registradas todavía.</p>
                        </div>
                    ) : (
                        <ul className="cp-list">
                            {sortedPlatforms.map((plat, idx) => {
                                const offset = isPlatFormExpanded ? 11 : 2
                                const fl = focusArea === 'content' && selectedIndex === offset + idx
                                return (
                                    <li key={plat.id} className="cp-list-row">
                                        <div className={`cp-list__item ${fl && !isDeleteFocused ? 'cp-list__item--focused' : ''}`}
                                            data-focused={fl ? 'true' : undefined}
                                            data-last={idx === sortedPlatforms.length - 1 ? 'true' : undefined}
                                            onClick={() => {
                                                setFocusArea('content');
                                                setSelectedIndex(2);
                                                handleEditPlatform(plat);
                                            }}>
                                            <div className="cp-list__item-icon">
                                                {plat.icon && plat.icon.trim() !== '' ? (
                                                    (plat.icon.includes(':') && !plat.icon.includes('/') && !plat.icon.includes('\\')) 
                                                    ? <Icon icon={plat.icon} />
                                                    : <img src={plat.icon} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} alt="" />
                                                ) : <Icon icon="mynaui:ghost" />}
                                            </div>
                                            <div className="cp-list__item-info">
                                                <div className="cp-list__item-name">{plat.name}</div>
                                                <div className="cp-list__item-sub">{plat.company || 'Sin fabricante'}</div>
                                            </div>
                                        </div>
                                        <button 
                                            className={`cp-list-delete-btn ${fl && isDeleteFocused ? 'focused' : ''}`}
                                            onClick={(e) => handleRemovePlatform(e, plat.id)}
                                        >
                                            <Icon icon="mynaui:trash" />
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            )}


            {/* ══ Emuladores ══ */}
            {tab === 'emulators' && (
                <div className="cp-section">
                    <div className="cp-form" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                        <div className="cp-form__title" style={{ marginBottom: '16px', paddingLeft: '4px' }}>
                            <Icon icon={editingEmuId ? 'mynaui:edit' : 'mynaui:plus'} />
                            {editingEmuId ? 'Editar emulador' : 'Añadir emulador'}
                        </div>
                        
                        {emuError && <div className="cp-form__error" style={{ marginBottom: '12px' }}><Icon icon="mynaui:info-circle" />{emuError}</div>}

                        {/* Name Field */}
                        <div 
                            className={`ag-field-row ${focusArea === 'content' && selectedIndex === 0 ? 'ag-field-row--focused' : ''}`}
                            data-focused={focusArea === 'content' && selectedIndex === 0 ? 'true' : undefined}
                            onClick={() => { setFocusArea('content'); setSelectedIndex(0); document.getElementById('emu-name')?.focus() }}
                        >
                            <Icon icon="mynaui:edit-one" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Nombre del Emulador</div>
                                <input 
                                    id="emu-name"
                                    className="ag-field-input" 
                                    type="text" 
                                    placeholder="Ej. PCSX2, Dolphin..."
                                    value={emuForm.name} 
                                    onChange={e => setEmuForm(p => ({ ...p, name: e.target.value }))} 
                                    disabled={emuSaving} 
                                />
                            </div>
                        </div>

                        {/* Path Field */}
                        <div className={`ag-field-row ${focusArea === 'content' && selectedIndex === 1 ? 'ag-field-row--focused' : ''}`}
                             data-focused={focusArea === 'content' && selectedIndex === 1 ? 'true' : undefined}
                             onClick={() => { setFocusArea('content'); setSelectedIndex(1); handleBrowseEmulator() }}>
                            <Icon icon="mynaui:file" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Ruta al ejecutable (.exe)</div>
                                <input id="emu-path" className="ag-field-input" type="text" placeholder="Seleccionar archivo..."
                                       value={emuForm.path} readOnly disabled />
                            </div>
                        </div>

                        {/* Platforms Selection Field */}
                        <div 
                            className={`ag-field-row ${focusArea === 'content' && selectedIndex === 2 ? 'ag-field-row--focused' : ''} ${isEmuPlatMenuOpen ? 'ag-field-row--menu-open' : ''}`}
                            data-focused={focusArea === 'content' && selectedIndex === 2 ? 'true' : undefined}
                            onClick={() => { sfx.open(); setIsEmuPlatMenuOpen(true); setEmuPlatMenuHoverIndex(0) }}
                        >
                            <Icon icon="mynaui:grid-nine" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Plataformas compatibles</div>
                                <div className="ag-custom-select">
                                    <div className="ag-custom-select__value" style={{ justifyContent: 'flex-start', gap: '12px' }}>
                                        <Icon icon="mynaui:chevron-down" className={`ag-custom-select__arrow ${isEmuPlatMenuOpen ? 'open' : ''}`} />
                                        {emuForm.platforms.length > 0 ? (
                                            <div className="ag-platform-chips ag-platform-chips--mini">
                                                {emuForm.platforms.map(id => {
                                                    const p = platforms.find(p => p.id === id)
                                                    if (!p) return null
                                                    return (
                                                        <div key={id} className="ag-platform-chip active">
                                                            {p.icon && (p.icon.includes(':') ? <Icon icon={p.icon} /> : <img src={p.icon} alt="" />)}
                                                            <span>{p.name}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>Seleccionar plataformas…</span>
                                        )}
                                    </div>
                                    
                                    {isEmuPlatMenuOpen && (
                                        <div className="ag-custom-select__dropdown" onClick={e => e.stopPropagation()}>
                                            {sortedPlatforms.length > 0 ? (
                                                sortedPlatforms.map((p, pIdx) => {
                                                    const isSelected = emuForm.platforms.includes(p.id)
                                                    const isFocused = emuPlatMenuHoverIndex === pIdx
                                                    return (
                                                        <div 
                                                            key={p.id}
                                                            id={`ag-emu-plat-opt-${pIdx}`}
                                                            className={`ag-custom-select__option ${isSelected ? 'selected' : ''} ${isFocused ? 'active' : ''}`}
                                                            onMouseEnter={() => setEmuPlatMenuHoverIndex(pIdx)}
                                                            onClick={() => {
                                                                sfx.confirm()
                                                                setEmuForm(prev => {
                                                                    const next = isSelected 
                                                                        ? prev.platforms.filter(id => id !== p.id)
                                                                        : [...prev.platforms, p.id]
                                                                    return { ...prev, platforms: next }
                                                                })
                                                            }}
                                                        >
                                                            <div className="ag-custom-select__option-icon">
                                                                {p.icon && (p.icon.includes(':') ? <Icon icon={p.icon} /> : <img src={p.icon} alt="" />)}
                                                            </div>
                                                            <span style={{ flex: 1 }}>{p.name}</span>
                                                            <div className="ag-custom-select__option-check">
                                                                <Icon icon={isSelected ? 'mynaui:check-circle-solid' : 'mynaui:circle'} />
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <div className="ag-custom-select__empty">No hay plataformas</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Args Field */}
                        <div 
                            className={`ag-field-row ${focusArea === 'content' && selectedIndex === 3 ? 'ag-field-row--focused' : ''}`}
                            data-focused={focusArea === 'content' && selectedIndex === 3 ? 'true' : undefined}
                            onClick={() => { setFocusArea('content'); setSelectedIndex(3); document.getElementById('emu-args')?.focus() }}
                        >
                            <Icon icon="mynaui:terminal" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Argumentos de ejecución</div>
                                <input 
                                    id="emu-args"
                                    className="ag-field-input" 
                                    style={{ fontFamily: 'monospace' }}
                                    type="text" 
                                    placeholder="Usa {roms} para indicar la posición de la ROM"
                                    value={emuForm.args} 
                                    onChange={e => setEmuForm(p => ({ ...p, args: e.target.value }))} 
                                    disabled={emuSaving} 
                                />
                            </div>
                        </div>

                        <div className="cp-form__actions">
                            {editingEmuId && (
                                <button 
                                    className={`cp-btn cp-btn--ghost ${focusArea === 'content' && selectedIndex === 4 ? 'cp-btn--focused' : ''}`}
                                    data-focused={focusArea === 'content' && selectedIndex === 4 ? 'true' : undefined}
                                    onClick={resetEmuForm} 
                                    disabled={emuSaving}
                                >
                                    Cancelar
                                </button>
                            )}
                            <button 
                                className={`cp-btn cp-btn--primary ${focusArea === 'content' && selectedIndex === (editingEmuId ? 5 : 4) ? 'cp-btn--focused' : ''}`}
                                data-focused={focusArea === 'content' && selectedIndex === (editingEmuId ? 5 : 4) ? 'true' : undefined}
                                data-last={emulators.length === 0 ? 'true' : undefined}
                                onClick={handleSaveEmulator} 
                                disabled={emuSaving}
                            >
                                <Icon icon={editingEmuId ? 'mynaui:check' : 'mynaui:plus'} />
                                {emuSaving ? 'Guardando…' : editingEmuId ? 'Actualizar' : 'Añadir'}
                            </button>
                        </div>
                    </div>

                    <div className="cp-divider" style={{ margin: '30px 0' }} />

                    {emulators.length > 0 ? (
                        <ul className="cp-list">
                            {emulators.map((emu, idx) => {
                                const fl = focusArea === 'content' && selectedIndex === (editingEmuId ? 6 : 5) + idx
                                return (
                                    <li
                                        key={emu.id}
                                        data-focused={fl ? 'true' : undefined}
                                        data-last={idx === emulators.length - 1 ? 'true' : undefined}
                                        className={`cp-list__item ${fl ? 'cp-list__item--focused' : ''}`}
                                        onClick={() => {
                                            setFocusArea('content');
                                            setSelectedIndex(0);
                                            handleEditEmulator(emu);
                                        }}
                                    >
                                        <div className="cp-list__item-icon"><Icon icon="mynaui:chip" /></div>
                                        <div className="cp-list__item-info">
                                            <span className="cp-list__item-name">{emu.name}</span>
                                            <span className="cp-list__item-sub" title={emu.path}>{emu.path}</span>
                                        </div>
                                        <div className="cp-list__item-actions">
                                            <button className="cp-icon-btn" title="Editar" onClick={e => { e.stopPropagation(); handleEditEmulator(emu) }}>
                                                <Icon icon="mynaui:edit" />
                                            </button>
                                            <button className="cp-icon-btn cp-icon-btn--danger" title="Eliminar" onClick={e => { e.stopPropagation(); handleRemoveEmulator(e, emu.id) }}>
                                                <Icon icon="mynaui:trash" />
                                            </button>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    ) : (
                        <div className="cp-empty">
                            <Icon icon="mynaui:chip" className="cp-empty__icon" />
                            <p>No hay emuladores registrados todavía.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ══ Controles ══ */}
            {tab === 'controls' && (
                <div className="cp-section">
                    {controlsSubTab === 'menu' && (
                        <div className="cp-choice-stack">
                            <button
                                className={`cp-choice-row ${focusArea === 'content' && selectedIndex === 0 ? 'focused' : ''}`}
                                onClick={() => { setControlsSubTab('keyboard'); setSelectedIndex(0) }}
                            >
                                <div className="cp-choice-row__icon-wrap">
                                    <Icon icon="mynaui:keyboard" />
                                </div>
                                <div className="cp-choice-row__content">
                                    <span className="cp-choice-row__label">Asignación de Teclas</span>
                                    <span className="cp-choice-row__desc">Configura tu teclado y accesos rápidos del sistema</span>
                                </div>
                                <Icon icon="mynaui:chevron-right" className="cp-choice-row__arrow" />
                            </button>
                            <button
                                className={`cp-choice-row ${focusArea === 'content' && selectedIndex === 1 ? 'focused' : ''}`}
                                onClick={() => { setControlsSubTab('gamepad'); setSelectedIndex(0) }}
                            >
                                <div className="cp-choice-row__icon-wrap">
                                    <Icon icon="mynaui:gamepad" />
                                </div>
                                <div className="cp-choice-row__content">
                                    <span className="cp-choice-row__label">Controles de Mando</span>
                                    <span className="cp-choice-row__desc">Configura tu joystick o gamepad externo</span>
                                </div>
                                <Icon icon="mynaui:chevron-right" className="cp-choice-row__arrow" />
                            </button>
                        </div>
                    )}

                    {controlsSubTab === 'keyboard' && (
                        <>
                            <ul className="cp-list cp-list--compact cp-list--controls-table">
                                <li 
                                    className={`cp-list__item cp-list__item--back ${focusArea === 'content' && selectedIndex === 0 ? 'cp-list__item--focused' : ''}`}
                                    onClick={() => setControlsSubTab('menu')}
                                    data-focused={focusArea === 'content' && selectedIndex === 0 ? 'true' : undefined}
                                >
                                    <Icon icon="mynaui:arrow-left" className="cp-list__item-icon" />
                                    <span className="cp-list__item-name">Volver al menú</span>
                                </li>
                                {KEYBOARD_KEYS.map((key, idx) => {
                                    const actualIdx = idx + 1
                                    const fl = focusArea === 'content' && selectedIndex === actualIdx
                                    return (
                                        <li
                                            key={key}
                                            data-focused={fl ? 'true' : undefined}
                                            className={`cp-list__item cp-list__item--table-row ${fl ? 'cp-list__item--focused' : ''} ${listeningKey === key ? 'cp-list__item--listening' : ''}`}
                                            onClick={() => setListeningKey(k => k === key ? null : key)}
                                        >
                                            <div className="cp-list__col-label">
                                                <span className="cp-list__item-name">{KEYMAP_LABELS[key] ?? key}</span>
                                            </div>
                                            <div className="cp-list__col-value">
                                                <kbd className={`cp-kbd ${listeningKey === key ? 'cp-kbd--listening' : ''}`}>
                                                    {listeningKey === key ? '—' : (keymaps[key] || 'None')}
                                                </kbd>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </>
                    )}

                    {controlsSubTab === 'gamepad' && (
                        <div className="cp-coming-soon">
                             <li 
                                className={`cp-list__item cp-list__item--back ${focusArea === 'content' && selectedIndex === 0 ? 'cp-list__item--focused' : ''}`}
                                onClick={() => setControlsSubTab('menu')}
                                data-focused={focusArea === 'content' && selectedIndex === 0 ? 'true' : undefined}
                                style={{ listStyle: 'none', marginBottom: '20px' }}
                             >
                                <Icon icon="mynaui:arrow-left" className="cp-list__item-icon" />
                                <span className="cp-list__item-name">Volver al menú</span>
                             </li>
                             <Icon icon="mynaui:gamepad" className="cp-coming-soon__icon" />
                             <h3>Configuración Visual de Mando</h3>
                             <p>Próximamente — Una interfaz interactiva para mapear tu gamepad.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ══ Cuadrícula ══ */}
            {tab === 'grid' && (
                <div className="cp-section">
                    <div className="cp-form">
                        <div className="cp-form__title" style={{ marginBottom: 4 }}>Filas</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <input
                                type="range" min={minGridDimensions?.minRows ?? 1} max={10} value={gridRows}
                                onChange={e => { setGridRows(+e.target.value); setGridDirty(true) }}
                                style={{ flex: 1, accentColor: 'var(--accent)' }}
                            />
                            <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{gridRows}</span>
                        </div>

                        <div className="cp-form__title" style={{ marginTop: 20, marginBottom: 4 }}>Columnas</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <input
                                type="range" min={minGridDimensions?.minCols ?? 1} max={12} value={gridCols}
                                onChange={e => { setGridCols(+e.target.value); setGridDirty(true) }}
                                style={{ flex: 1, accentColor: 'var(--accent)' }}
                            />
                            <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{gridCols}</span>
                        </div>

                        <div className="cp-form__title" style={{ marginTop: 20, marginBottom: 4 }}>Separación (px)</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <input
                                type="range" min={0} max={32} value={gridGap}
                                onChange={e => { setGridGap(+e.target.value); setGridDirty(true) }}
                                style={{ flex: 1, accentColor: 'var(--accent)' }}
                            />
                            <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{gridGap}</span>
                        </div>

                        <div className="cp-form__title" style={{ marginTop: 20, marginBottom: 4 }}>Proporción (ancho/alto)</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <input
                                type="range" min={0.5} max={2} step={0.05} value={gridAspect}
                                onChange={e => { setGridAspect(+e.target.value); setGridDirty(true) }}
                                style={{ flex: 1, accentColor: 'var(--accent)' }}
                            />
                            <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{gridAspect.toFixed(2)}</span>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                            <button
                                className="cp-btn cp-btn--ghost"
                                onClick={() => {
                                    if (gridConfig) {
                                        setGridRows(gridConfig.rows); setGridCols(gridConfig.cols)
                                        setGridGap(gridConfig.gap); setGridAspect(gridConfig.aspectRatio)
                                    }
                                    setGridDirty(false); sfx.cancel()
                                }}
                                disabled={!gridDirty}
                            >
                                Recargar
                            </button>
                            <button
                                className="cp-btn cp-btn--primary"
                                onClick={() => {
                                    onGridConfigChange?.(gridRows, gridCols, gridGap, gridAspect)
                                    setGridDirty(false)
                                }}
                                disabled={!gridDirty}
                            >
                                <Icon icon="mynaui:check" /> Aplicar
                            </button>
                        </div>

                        <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            <Icon icon="mynaui:info-circle" style={{ marginRight: 6 }} />
                            Los juegos que no quepan por el nuevo tamaño se reordenarán automáticamente en páginas.
                            {minGridDimensions && (minGridDimensions.minRows > 1 || minGridDimensions.minCols > 1) && (
                                <span> El mínimo actual es <strong>{minGridDimensions.minCols}×{minGridDimensions.minRows}</strong> por un juego ampliado.</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══ Amigos ══ */}
            {tab === 'friends' && (
                <div className="cp-coming-soon">
                    <div className="cp-coming-soon__glow" />
                    <Icon icon="mynaui:users" className="cp-coming-soon__icon" />
                    <h3>Próximamente</h3>
                    <p>La lista de amigos y el sistema de chat estarán disponibles en futuras versiones.</p>
                </div>
            )}

            {/* ══ Logros ══ */}
            {tab === 'trophies' && (
                <div className="cp-coming-soon">
                    <div className="cp-coming-soon__glow" />
                    <Icon icon="mynaui:trophy" className="cp-coming-soon__icon" />
                    <h3>Próximamente</h3>
                    <p>El sistema de trofeos y logros estará disponible en futuras versiones.</p>
                </div>
            )}
        </SidePanel>
    )
}

export default SettingsPanel

