import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { Emulator, Platform, InterfaceSettings } from '../../../../shared/types'
import { sfx } from '../../utils/audioManager'
import { invalidateProviderCache } from '../download/gameDetailCache'
import SidePanel from '../SidePanel'
import { useDialog } from '../../hooks/useDialog'
import { useToast } from '../../hooks/useToast'
import { SettingsPanelProps, Tab, FocusArea, ControlsSubTab, EmulatorForm, PlatformForm } from './types'
import { TABS, TAB_IDS, KEYMAP_LABELS, KEYBOARD_KEYS, GAMEPAD_KEYS, GAMEPAD_BUTTON_NAMES, EMPTY_EMU, EMPTY_PLATFORM } from './constants'
import PlatformsTab from './tabs/PlatformsTab'
import EmulatorsTab from './tabs/EmulatorsTab'
import ControlsTab from './tabs/ControlsTab'
import GridTab from './tabs/GridTab'
import InterfaceTab from './tabs/InterfaceTab'

function SettingsPanel({ visible, onClose, onJumpToHeader, gridConfig, onGridConfigChange, onClearGrid, initialTab }: SettingsPanelProps): React.JSX.Element {
    const [tab, setTab] = useState<Tab>(initialTab || 'platforms')
    const { showDialog } = useDialog()
    useToast()
    const [controlsSubTab, setControlsSubTab] = useState<ControlsSubTab>('menu')
    const [focusArea, setFocusArea] = useState<FocusArea>('nav')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [emulators, setEmulators] = useState<Emulator[]>([])
    const [emuForm, setEmuForm] = useState<EmulatorForm>(EMPTY_EMU)
    const [editingEmuId, setEditingEmuId] = useState<string | null>(null)
    const [emuError, setEmuError] = useState<string | null>(null)
    const [emuSaving, setEmuSaving] = useState(false)
    const [platforms, setPlatforms] = useState<Platform[]>([])
    const [isDeleteFocused, setIsDeleteFocused] = useState(false)
    const [footerIndex, setFooterIndex] = useState(0)
    const [platForm, setPlatForm] = useState<PlatformForm>(EMPTY_PLATFORM)
    const [editingPlatId, setEditingPlatId] = useState<string | null>(null)
    const [platError, setPlatError] = useState<string | null>(null)
    const [platSaving, setPlatSaving] = useState(false)
    const [isPlatFormExpanded, setIsPlatFormExpanded] = useState(false)

    const [keymaps, setKeymaps] = useState<Record<string, string | boolean>>({})
    const [listeningKey, setListeningKey] = useState<string | null>(null)
    const [gamepadListeningKey, setGamepadListeningKey] = useState<string | null>(null)
    const prevGamepadRef = useRef<{ [key: number]: boolean[] }>({})
    const [keymapDirty, setKeymapDirty] = useState(false)
    const [keymapSaving, setKeymapSaving] = useState(false)

    const [gridRows, setGridRows] = useState(gridConfig?.rows ?? 4)
    const [gridCols, setGridCols] = useState(gridConfig?.cols ?? 6)
    const [gridGap, setGridGap] = useState(gridConfig?.gap ?? 10)
    const [gridAspect, setGridAspect] = useState(gridConfig?.aspectRatio ?? 1)
    const [gridDirty, setGridDirty] = useState(false)
    const [isInputEditing, setIsInputEditing] = useState(false)
    const [focusedPlatIdx, setFocusedPlatIdx] = useState(0)
    const [isEmuPlatMenuOpen, setIsEmuPlatMenuOpen] = useState(false)
    const [emuPlatMenuHoverIndex, setEmuPlatMenuHoverIndex] = useState(0)

    const [interfaceSettings, setInterfaceSettings] = useState<InterfaceSettings | null>(null)
    const [interfaceDirty, setInterfaceDirty] = useState(false)

    const [platSyncing, setPlatSyncing] = useState(false)

    const hasUnsavedChanges = keymapDirty || gridDirty || interfaceDirty

    const sortedPlatforms = React.useMemo(() => {
        return [...platforms].sort((a, b) => {
            const nameA = a.name || ''
            const nameB = b.name || ''
            return nameA.localeCompare(nameB)
        })
    }, [platforms])

    const r = useRef({
        tab, controlsSubTab, focusArea, selectedIndex, isDeleteFocused, footerIndex,
        emulators, platforms: sortedPlatforms, keymaps, listeningKey, gamepadListeningKey, visible, onJumpToHeader,
        gridRows, gridCols, gridGap, gridAspect, hasUnsavedChanges,
        isInputEditing, isPlatFormExpanded, editingPlatId, editingEmuId, platForm, emuForm,
        focusedPlatIdx, isEmuPlatMenuOpen, emuPlatMenuHoverIndex, onClearGrid, interfaceSettings, interfaceDirty
    })
    useEffect(() => {
        r.current = { tab, controlsSubTab, focusArea, selectedIndex, isDeleteFocused, footerIndex, emulators, platforms: sortedPlatforms, keymaps, listeningKey, gamepadListeningKey, visible, onJumpToHeader, gridRows, gridCols, gridGap, gridAspect, hasUnsavedChanges, isInputEditing, isPlatFormExpanded, editingPlatId, editingEmuId, platForm, emuForm, focusedPlatIdx, isEmuPlatMenuOpen, emuPlatMenuHoverIndex, onClearGrid, interfaceSettings, interfaceDirty }
    })

    useEffect(() => {
        if (!visible) return
        window.api.platforms.getAll().then(setPlatforms)
        window.api.emulators.getAll().then(setEmulators)
        window.api.keymaps.getAll().then(setKeymaps)
        window.api.ui.getSettings().then(s => {
            setInterfaceSettings(s)
            setInterfaceDirty(false)
        })
        setFocusArea('nav')
        setTab(initialTab || 'platforms')
        setSelectedIndex(0)
        setIsDeleteFocused(false)
        setFooterIndex(0)
        setListeningKey(null)
        setGamepadListeningKey(null)
        setIsPlatFormExpanded(false)
        if (gridConfig) {
            setGridRows(gridConfig.rows)
            setGridCols(gridConfig.cols)
            setGridGap(gridConfig.gap)
            setGridAspect(gridConfig.aspectRatio)
        }
        setGridDirty(false)
    }, [visible, gridConfig, initialTab])

    useEffect(() => {
        const container = document.querySelector('.console-panel__content-body')
        if (container) container.scrollTop = 0
        setSelectedIndex(0)
        setIsDeleteFocused(false)
        setFooterIndex(0)
        setListeningKey(null)
        setGamepadListeningKey(null)
        setControlsSubTab('menu')
    }, [tab])

    useEffect(() => {
        const container = document.querySelector('.console-panel__content-body')
        if (container) container.scrollTop = 0
    }, [controlsSubTab])

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

    const handleBrowseEmulator = async () => {
        const path = await window.api.browseFile({ filters: [{ name: 'Ejecutables', extensions: ['exe', 'bat', 'cmd', 'sh', 'app'] }] })
        if (path) setEmuForm(p => ({ ...p, path }))
    }

    const handleSavePlatform = async () => {
        const currentForm = r.current.platForm
        if (!currentForm.name.trim()) { setPlatError('El nombre es obligatorio'); return }
        setPlatSaving(true)
        try {
            const newId = currentForm.id.trim() || crypto.randomUUID()
            const originalId = r.current.editingPlatId
            if (originalId && originalId !== newId) {
                await window.api.platforms.remove(originalId)
            }
            const res = await window.api.platforms.save({ ...currentForm, id: newId })
            if (res.success) {
                setPlatforms(await window.api.platforms.getAll())
                resetPlatForm()
                sfx.confirm()
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

    const handleRemovePlatform = async (id: string) => {
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

    const handleBrowsePlatImage = async () => {
        const path = await window.api.browseFile({ filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] })
        if (path) {
            const res = await window.api.artwork.import(path)
            if (res.success && res.url) setPlatForm(p => ({ ...p, image: res.url! }))
        }
    }

    const executeSync = async (overwrite: boolean) => {
        resetPlatForm()
        setPlatSyncing(true)
        try {
            const res = await window.api.platforms.sync({ overwrite })
            if (res.success) {
                const updated = await window.api.platforms.getAll()
                setPlatforms(updated)
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
            window.api.movementControl.setInputCapture(false)
        }
    }, [listeningKey])

    useEffect(() => {
        if (!gamepadListeningKey) {
            window.api.movementControl.setInputCapture(false)
            return
        }
        window.api.movementControl.setInputCapture(true)
        let rafId = 0
        const scanGamepads = () => {
            const gamepads = navigator.getGamepads()
            for (let i = 0; i < gamepads.length; i++) {
                const gp = gamepads[i]
                if (!gp) continue
                if (!prevGamepadRef.current[i]) {
                    prevGamepadRef.current[i] = []
                }
                const prev = prevGamepadRef.current[i]
                for (let btnIdx = 0; btnIdx < gp.buttons.length; btnIdx++) {
                    const pressed = gp.buttons[btnIdx]?.pressed
                    const prevPressed = prev[btnIdx] || false
                    if (pressed && !prevPressed) {
                        const name = GAMEPAD_BUTTON_NAMES[btnIdx]
                        if (name) {
                            setKeymaps(prev => ({ ...prev, [gamepadListeningKey]: name }))
                            setKeymapDirty(true)
                            setGamepadListeningKey(null)
                            window.api.movementControl.setInputCapture(false)
                            prevGamepadRef.current = {}
                            sfx.confirm()
                            return
                        }
                    }
                    prev[btnIdx] = pressed
                }
            }
            rafId = requestAnimationFrame(scanGamepads)
        }
        rafId = requestAnimationFrame(scanGamepads)
        return () => {
            cancelAnimationFrame(rafId)
            prevGamepadRef.current = {}
            window.api.movementControl.setInputCapture(false)
        }
    }, [gamepadListeningKey])

    useEffect(() => {
        if (isEmuPlatMenuOpen) {
            const container = document.querySelector('.console-panel__content-body')
            if (!container) return
            const opt = document.getElementById(`ag-emu-plat-opt-${emuPlatMenuHoverIndex}`)
            if (opt) {
                const crect = container.getBoundingClientRect()
                const orect = opt.getBoundingClientRect()
                if (orect.bottom > crect.bottom || orect.top < crect.top) {
                    opt.scrollIntoView({ block: 'nearest' })
                }
            }
        }
    }, [emuPlatMenuHoverIndex, isEmuPlatMenuOpen])

    const isFocused = (area: string, idx: number) => focusArea === area && selectedIndex === idx

    useEffect(() => {
        if (focusArea !== 'content') return
        const container = document.querySelector('.console-panel__content-body') as HTMLElement
        if (!container) return
        if (selectedIndex === 0) { container.scrollTo({ top: 0, behavior: 'smooth' }); return }
        const timer = setTimeout(() => {
            const el = container.querySelector('[data-focused="true"]') as HTMLElement
            if (el) {
                const crect = container.getBoundingClientRect()
                const erect = el.getBoundingClientRect()
                const targetScroll = container.scrollTop + (erect.top - crect.top) - (container.offsetHeight / 2) + (erect.height / 2)
                container.scrollTo({ top: targetScroll, behavior: 'smooth' })
            }
        }, 30)
        return () => clearTimeout(timer)
    }, [selectedIndex, focusArea, tab, isPlatFormExpanded, editingEmuId, editingPlatId])

    useEffect(() => {
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName) && target.id && target.id.startsWith('emu-')) {
                setIsInputEditing(true)
            }
        }
        const handleFocusOut = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName) && target.id && target.id.startsWith('emu-')) {
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

    useEffect(() => {
        const handler = (e: Event) => {
            const { visible: vis, tab: ct, controlsSubTab: cSub, focusArea: area, selectedIndex: idx,
                    footerIndex: fIdx, emulators: emus,
                    listeningKey: lKey, gamepadListeningKey: gpLKey } = r.current

            if (!vis) return
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

            if (document.querySelector('.ag-dialog-overlay')) return
            if (lKey || gpLKey || r.current.isInputEditing) return

            const action = (e as CustomEvent<string>).detail

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
                } else if (action === 'back') {
                    sfx.cancel(); onClose()
                }
                return
            }

            if (area === 'nav_save') {
                if (action === 'up') {
                    sfx.navigate(); setFocusArea('nav'); setTab(TAB_IDS[TAB_IDS.length - 1])
                } else if (action === 'down') {
                    sfx.navigate(); setFocusArea('nav_close')
                } else if (action === 'select') {
                    if (ct === 'controls') handleSaveKeymaps()
                    if (ct === 'grid') {
                        onGridConfigChange?.(gridRows, gridCols, gridGap, gridAspect)
                        setGridDirty(false)
                        sfx.confirm()
                    }
                } else if (action === 'back') {
                    sfx.navigate(); setFocusArea('nav')
                }
                return
            }

            if (area === 'nav_close') {
                if (action === 'up') {
                    sfx.navigate()
                    if (r.current.hasUnsavedChanges) setFocusArea('nav_save')
                    else { setFocusArea('nav'); setTab(TAB_IDS[TAB_IDS.length - 1]) }
                } else if (action === 'select') {
                    sfx.cancel(); onClose()
                } else if (action === 'back' || action === 'escape') {
                    sfx.navigate(); setFocusArea('nav')
                }
                return
            }

            if (area === 'content') {
                let count = 0
                const hasFooter = ct === 'controls'

                if (ct === 'platforms') {
                    const formItems = r.current.isPlatFormExpanded ? 10 : 2
                    count = formItems + r.current.platforms.length
                } else if (ct === 'emulators') {
                    const formItems = r.current.editingEmuId ? 6 : 5
                    count = formItems + r.current.emulators.length
                } else if (ct === 'controls') {
                    if (cSub === 'menu') count = 2
                    else if (cSub === 'keyboard') count = KEYBOARD_KEYS.length + 1
                    else if (cSub === 'gamepad') count = GAMEPAD_KEYS.length + 1
                } else if (ct === 'grid') {
                    count = 3
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
                        if (idx === 4 && r.current.editingEmuId) {
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
                        if (idx === 5) {
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
                    if (ct === 'controls' && cSub !== 'menu') { setControlsSubTab('menu'); setSelectedIndex(0) }
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
                                    handleRemovePlatform(plat.id)
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
                            if (idx === 0) {
                                setControlsSubTab('menu')
                                setSelectedIndex(0)
                            } else {
                                setGamepadListeningKey(GAMEPAD_KEYS[idx - 1])
                            }
                        }
                    } else if (ct === 'grid') {
                        if (idx === 2) {
                            sfx.confirm()
                            r.current.onClearGrid?.()
                        }
                    }
                }
                return
            }

            if (area === 'footer') {
                let count = 0
                if (ct === 'emulators') {
                    count = emus.length + 1
                } else if (ct === 'controls') {
                    if (cSub === 'menu') count = 2
                    else if (cSub === 'keyboard') count = KEYBOARD_KEYS.length + 1
                    else if (cSub === 'gamepad') count = GAMEPAD_KEYS.length + 1
                }

                if (action === 'up') {
                    sfx.navigate(); setFocusArea('content'); setSelectedIndex(count > 0 ? count - 1 : 0)
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
    }, [onClose])

    const handleSaveKeymaps = async () => {
        setKeymapSaving(true)
        try { await window.api.keymaps.save(keymaps); sfx.confirm(); setKeymapDirty(false) }
        catch { sfx.error() } finally { setKeymapSaving(false) }
    }
    const handleResetKeymaps = async () => {
        setKeymaps(await window.api.keymaps.getAll()); setKeymapDirty(false); sfx.cancel()
    }

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
                    <button id="btn-reset-keymaps"
                            className={`cp-btn cp-btn--secondary ${focusArea === 'footer' && footerIndex === 0 ? 'cp-btn--focused' : ''}`}
                            onClick={handleResetKeymaps} disabled={keymapSaving}>
                        <Icon icon="mynaui:refresh" /> Recargar
                    </button>
                    <button id="btn-save-keymaps"
                            className={`cp-btn cp-btn--primary ${focusArea === 'footer' && footerIndex === 1 ? 'cp-btn--focused' : ''}`}
                            onClick={handleSaveKeymaps} disabled={!keymapDirty || keymapSaving}>
                        <Icon icon="mynaui:check" /> {keymapSaving ? 'Guardando…' : 'Guardar'}
                    </button>
                </div>
            ) : null}
        >
            {tab === 'platforms' && (
                <PlatformsTab
                    focusArea={focusArea} selectedIndex={selectedIndex} isFocused={isFocused}
                    platForm={platForm} editingPlatId={editingPlatId}
                    platSaving={platSaving} platSyncing={platSyncing} platError={platError}
                    platforms={platforms} sortedPlatforms={sortedPlatforms}
                    isPlatFormExpanded={isPlatFormExpanded} isDeleteFocused={isDeleteFocused}
                    onSyncPlatforms={(e) => handleSyncPlatforms(e)}
                    onToggleExpand={() => { setIsPlatFormExpanded(!isPlatFormExpanded) }}
                    onPlatFieldChange={(field, value) => setPlatForm(p => ({ ...p, [field]: value }))}
                    onBrowsePlatImage={handleBrowsePlatImage}
                    onSavePlatform={handleSavePlatform}
                    onResetForm={resetPlatForm}
                    onEditPlatform={handleEditPlatform}
                    onRemovePlatform={handleRemovePlatform}
                    onFocusDelete={setIsDeleteFocused}
                />
            )}
            {tab === 'emulators' && (
                <EmulatorsTab
                    focusArea={focusArea} selectedIndex={selectedIndex}
                    emuForm={emuForm} editingEmuId={editingEmuId}
                    emuSaving={emuSaving} emuError={emuError}
                    emulators={emulators} platforms={platforms} sortedPlatforms={sortedPlatforms}
                    isEmuPlatMenuOpen={isEmuPlatMenuOpen} emuPlatMenuHoverIndex={emuPlatMenuHoverIndex}
                    onEmuFieldChange={(field, value) => setEmuForm(p => ({ ...p, [field]: value }))}
                    onBrowseEmulator={handleBrowseEmulator}
                    onSaveEmulator={handleSaveEmulator}
                    onResetForm={resetEmuForm}
                    onEditEmulator={(emu) => { sfx.confirm(); handleEditEmulator(emu) }}
                    onRemoveEmulator={async (id) => { if (await window.api.emulators.remove(id)) { setEmulators(prev => prev.filter(e => e.id !== id)); if (editingEmuId === id) resetEmuForm(); sfx.cancel() } }}
                    onTogglePlatMenu={() => { sfx.open(); setIsEmuPlatMenuOpen(true); setEmuPlatMenuHoverIndex(0) }}
                    onPlatMenuHover={setEmuPlatMenuHoverIndex}
                    onPlatMenuSelect={(platId, isSelected) => {
                        sfx.confirm()
                        setEmuForm(prev => {
                            const next = isSelected
                                ? prev.platforms.filter(id => id !== platId)
                                : [...prev.platforms, platId]
                            return { ...prev, platforms: next }
                        })
                    }}
                />
            )}
            {tab === 'controls' && (
                <ControlsTab
                    focusArea={focusArea} selectedIndex={selectedIndex}
                    controlsSubTab={controlsSubTab}
                    keymaps={keymaps} listeningKey={listeningKey} gamepadListeningKey={gamepadListeningKey}
                    onSelectSubTab={(subTab) => { setControlsSubTab(subTab); setSelectedIndex(0) }}
                    onStartListening={(key) => setListeningKey(k => k === key ? null : key)}
                    onStartGamepadListening={(key) => setGamepadListeningKey(k => k === key ? null : key)}
                />
            )}
            {tab === 'grid' && (
                <GridTab
                    focusArea={focusArea} selectedIndex={selectedIndex}
                    gridGap={gridGap} gridAspect={gridAspect} gridDirty={gridDirty} gridConfig={gridConfig}
                    onGapChange={(v) => { setGridGap(v); setGridDirty(true) }}
                    onAspectChange={(v) => { setGridAspect(v); setGridDirty(true) }}
                    onApply={() => { onGridConfigChange?.(gridConfig?.rows ?? 3, gridConfig?.cols ?? 5, gridGap, gridAspect); setGridDirty(false) }}
                    onReset={() => { if (gridConfig) { setGridGap(gridConfig.gap); setGridAspect(gridConfig.aspectRatio) }; setGridDirty(false); sfx.cancel() }}
                    onClearGrid={() => { if (window.confirm('¿Seguro que quieres vaciar la cuadrícula y borrar todos los juegos añadidos?')) onClearGrid?.() }}
                />
            )}
            {tab === 'interface' && (
                <InterfaceTab
                    focusArea={focusArea} selectedIndex={selectedIndex}
                    interfaceSettings={interfaceSettings} interfaceDirty={interfaceDirty}
                    onApiKeyChange={(value) => { setInterfaceSettings(s => s ? { ...s, sgdbApiKey: value || undefined } : s); setInterfaceDirty(true) }}
                    onToggleSkipIntro={(value) => { setInterfaceSettings(s => s ? { ...s, skipIntroSplash: value } : s); setInterfaceDirty(true) }}
                    onSave={() => {
                        if (!interfaceSettings) return
                        window.api.ui.saveSettings(interfaceSettings).then(() => {
                            invalidateProviderCache()
                            setInterfaceDirty(false)
                            sfx.confirm()
                        })
                    }}
                    onReset={() => {
                        window.api.ui.getSettings().then(s => {
                            setInterfaceSettings(s)
                            setInterfaceDirty(false)
                        })
                    }}
                />
            )}
        </SidePanel>
    )
}

export default SettingsPanel
