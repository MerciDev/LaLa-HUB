import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import { HomeSlot, Emulator } from '../../../shared/types'
import { sfx } from '../utils/audioManager'
import SidePanel, { ConsolePanelTab } from './SidePanel'
import { useDialog } from '../hooks/useDialog'
import { useToast } from '../hooks/useToast'

interface AddGameForm {
    name: string
    searchId: string
    path: string
    emulatorId: string
    processName: string
    squareImage: string
    backgroundImage: string
    logoImage: string
    coverImage: string
    verticalImage: string
    horizontalImage: string
    iconImage: string
}

const EMPTY_FORM: AddGameForm = { 
    name: '', searchId: '', path: '', emulatorId: '', processName: '',
    squareImage: '', backgroundImage: '', logoImage: '', 
    coverImage: '', verticalImage: '', horizontalImage: '', iconImage: '' 
}

type Tab = 'general' | 'media'
type FocusArea = 'nav' | 'nav_save' | 'nav_close' | 'content'
type MediaTarget = 'squareImage' | 'backgroundImage' | 'logoImage' | 'coverImage' | 'verticalImage' | 'horizontalImage' | 'iconImage'

const TABS: ConsolePanelTab[] = [
    { id: 'general', label: 'General', icon: 'mynaui:controller', description: 'Nombre, ruta y emulador' },
    { id: 'media', label: 'Multimedia', icon: 'mynaui:image', description: 'Carátulas y recursos visuales' },
]

const IMAGE_LABELS: Record<string, string> = {
    cover: 'Carátula', square: 'Cuadrada', vertical: 'Vertical',
    horizontal: 'Horizontal', background: 'Fondo', logo: 'Logo', icon: 'Icono'
}

interface AddGamePanelProps {
    visible: boolean
    selectedIndex: number
    editSlot?: HomeSlot | null
    onClose: () => void
}

function AddGamePanel({ visible, editSlot, onClose }: AddGamePanelProps): React.JSX.Element {
    const [tab, setTab] = useState<Tab>('general')
    // ── Start in 'nav' so the user navigates tabs first ──
    const [focusArea, setFocusArea] = useState<FocusArea>('nav')
    const [contentIndex, setContentIndex] = useState(0)
    const [contentSubIndex, setContentSubIndex] = useState(0)
    const [mediaTarget, setMediaTarget] = useState<MediaTarget>('squareImage')
    const [isTargetMenuOpen, setIsTargetMenuOpen] = useState(false)
    const [menuHoverIndex, setMenuHoverIndex] = useState(0)

    const [isEmuMenuOpen, setIsEmuMenuOpen] = useState(false)
    const [emuMenuHoverIndex, setEmuMenuHoverIndex] = useState(0)

    const [form, setForm] = useState<AddGameForm>(EMPTY_FORM)
    const [initialForm, setInitialForm] = useState<AddGameForm>(EMPTY_FORM)
    
    const { showDialog } = useDialog()
    const { showToast } = useToast()

    const [emulators, setEmulators] = useState<Emulator[]>([])
    const [apiImages, setApiImages] = useState<{ type: string; url: string }[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [isInputEditing, setIsInputEditing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const isEditing = !!editSlot

    const r = useRef({ 
        tab, focusArea, contentIndex, contentSubIndex, visible, form, emulators, 
        apiImages, isSaving, editSlot, mediaTarget, isTargetMenuOpen, 
        menuHoverIndex, isInputEditing, isEmuMenuOpen, emuMenuHoverIndex,
        hasAnyChanges: false
    })
    
    // Check for unsaved changes per section
    const hasSectionChanges = (section: Tab) => {
        if (section === 'general') {
            return form.name !== initialForm.name ||
                   form.searchId !== initialForm.searchId ||
                   form.path !== initialForm.path ||
                   form.emulatorId !== initialForm.emulatorId ||
                   form.processName !== initialForm.processName
        }
        if (section === 'media') {
            return form.squareImage !== initialForm.squareImage ||
                   form.backgroundImage !== initialForm.backgroundImage ||
                   form.logoImage !== initialForm.logoImage ||
                   form.coverImage !== initialForm.coverImage ||
                   form.verticalImage !== initialForm.verticalImage ||
                   form.horizontalImage !== initialForm.horizontalImage ||
                   form.iconImage !== initialForm.iconImage
        }
        return false
    }
    const hasAnyChanges = hasSectionChanges('general') || hasSectionChanges('media')

    useEffect(() => {
        r.current = { 
            tab, focusArea, contentIndex, contentSubIndex, visible, form, emulators, 
            apiImages, isSaving, editSlot, mediaTarget, isTargetMenuOpen, 
            menuHoverIndex, isInputEditing, isEmuMenuOpen, emuMenuHoverIndex,
            hasAnyChanges
        }
    })

    // ── Reset state on open ──
    useEffect(() => {
        if (!visible) return
        window.api.emulators.getAll().then(setEmulators)
        setTab('general')
        setFocusArea('nav')
        setContentIndex(0)
        setContentSubIndex(0)
        setApiImages([])
        setError(null)
        setIsInputEditing(false)
        setIsEmuMenuOpen(false)
        setEmuMenuHoverIndex(0)

        if (editSlot) {
            const data = {
                name: editSlot.label,
                searchId: editSlot.game?.searchId ?? '',
                path: editSlot.game?.path ?? '',
                emulatorId: editSlot.game?.emulator?.id ?? '',
                processName: editSlot.game?.processName ?? '',
                squareImage: editSlot.squareImage ?? '',
                backgroundImage: editSlot.backgroundImage ?? '',
                logoImage: editSlot.logoImage ?? '',
                coverImage: editSlot.coverImage ?? '',
                verticalImage: editSlot.verticalImage ?? '',
                horizontalImage: editSlot.horizontalImage ?? '',
                iconImage: editSlot.iconImage ?? ''
            }
            setForm(data)
            setInitialForm(data)
        } else {
            setForm(EMPTY_FORM)
            setInitialForm(EMPTY_FORM)
        }
    }, [visible, editSlot])

    // ── Fetch API images when entering media tab ──
    useEffect(() => {
        const query = form.searchId.trim() || form.name.trim()
        if (tab !== 'media' || !query) { setApiImages([]); return }
        const q = encodeURIComponent(query)
        fetch(`http://localhost:3000/api/games/search?q=${q}`)
            .then(res => res.json())
            .then(data => {
                if (data.results?.length > 0) {
                    const imgs = data.results[0].images || {}
                    const keys = ['cover', 'square', 'vertical', 'horizontal', 'background', 'logo', 'icon']
                    setApiImages(keys.filter(k => imgs[k]).map(k => ({ type: k, url: imgs[k] })))
                } else {
                    setApiImages([])
                }
            })
            .catch(() => setApiImages([]))
    }, [tab, form.name])

    // ── Input Focus Sync (Native & Gamepad) ──
    const blurAllInputs = useCallback(() => {
        const ids = ['ag-name', 'ag-searchid', 'ag-path', 'ag-emu', 'ag-process']
        ids.forEach(id => {
            const el = document.getElementById(id)
            if (el) el.blur()
        })
    }, [])

    const focusCurrentInput = useCallback(() => {
        const ids = ['ag-name', 'ag-searchid', 'ag-path', 'ag-emu', 'ag-process']
        const id = ids[contentIndex]
        const el = document.getElementById(id)
        if (el) el.focus()
    }, [contentIndex])

    useEffect(() => {
        if (!visible) return
        if (isInputEditing) {
            focusCurrentInput()
        } else {
            blurAllInputs()
        }
    }, [isInputEditing, visible, focusCurrentInput, blurAllInputs])

    // Safety: Blur if we leave the content area or general tab
    useEffect(() => {
        if (focusArea !== 'content' || tab !== 'general') {
            setIsInputEditing(false)
            blurAllInputs()
        }
    }, [focusArea, tab, blurAllInputs])

    // Listen to native focus to keep states perfectly in sync automatically.
    // This fixes the bug where MainApp.tsx blurs the input but AddGameModal didn't know.
    useEffect(() => {
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && target.id.startsWith('ag-')) {
                setIsInputEditing(true)
                setFocusArea('content')
                if (target.id === 'ag-name') setContentIndex(0)
                if (target.id === 'ag-searchid') setContentIndex(1)
                if (target.id === 'ag-path') setContentIndex(2)
                if (target.id === 'ag-emu') setContentIndex(3)
                if (target.id === 'ag-process') setContentIndex(4)
            }
        }
        const handleFocusOut = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && target.id.startsWith('ag-')) {
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

    // ── Auto-assign default images from API ──
    useEffect(() => {
        if (!visible || apiImages.length === 0) return
        
        // Define mapping between target field and API type
        const mapping: Record<MediaTarget, string> = {
            squareImage: 'square',
            backgroundImage: 'background',
            logoImage: 'logo',
            coverImage: 'cover',
            verticalImage: 'vertical',
            horizontalImage: 'horizontal',
            iconImage: 'icon'
        }

        const targetType = mapping[mediaTarget]
        const found = apiImages.find(img => img.type === targetType)
        
        // Only auto-assign if the field is currently empty
        if (found && !form[mediaTarget]) {
            const url = `http://localhost:3000${found.url}`.replace('localhost:3000//', 'localhost:3000/')
            setForm(prev => ({ ...prev, [mediaTarget]: url }))
        }
    }, [mediaTarget, apiImages, visible])

    // ── Auto-assign Search ID ──
    const handleAutoAssignSearchId = useCallback(() => {
        const name = r.current.form.name
        if (!name) return
        
        const slug = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Limpiar acentos
            .replace(/[^a-z0-9\s-]/g, "")    // Limpiar caracteres especiales
            .trim()
            .replace(/\s+/g, '-')             // Espacios a guiones
            
        setForm(p => ({ ...p, searchId: slug }))
        sfx.confirm()
    }, [])

    // ── Auto-scroll into view ──
    useEffect(() => {
        if (isTargetMenuOpen) return;

        const bodyEl = document.querySelector('.console-panel__content-body')

        if (focusArea === 'content' && bodyEl) {
            if ((contentIndex === 0 || contentIndex === 1) && bodyEl) {
                bodyEl.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
                const id = tab === 'general' 
                    ? (contentIndex === 0 ? 'ag-name' : contentIndex === 1 ? 'ag-searchid' : contentIndex === 2 ? 'ag-path' : contentIndex === 3 ? 'ag-emu' : 'ag-process')
                    : (contentIndex === 0 ? 'ag-media-target' : contentIndex === 1 ? 'ag-artwork-btn' : contentIndex === 2 ? 'ag-remove-btn' : `ag-api-btn-${contentIndex - 3}`)
                
                const el = document.getElementById(id)
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }
            }
        }
    }, [contentIndex, focusArea, tab, isTargetMenuOpen])

    const forceClose = useCallback(() => {
        sfx.cancel()
        setForm(EMPTY_FORM)
        setInitialForm(EMPTY_FORM)
        setError(null)
        setIsTargetMenuOpen(false)
        onClose()
    }, [onClose])

    const handleClose = useCallback(() => {
        if (r.current.hasAnyChanges && r.current.visible) {
            showDialog({
                title: 'Cambios sin guardar',
                message: '¿Estás seguro de que quieres salir? Perderás todos los cambios realizados.',
                icon: 'mynaui:warning-triangle',
                actions: [
                    { label: 'Cancelar', variant: 'ghost', onClick: () => {} },
                    { label: 'Descartar Cambios', variant: 'danger', onClick: forceClose }
                ]
            })
        } else {
            forceClose()
        }
    }, [forceClose, showDialog])

    // --- Media targets list ---
    const MEDIA_OPTIONS: { id: MediaTarget; label: string }[] = [
        { id: 'squareImage', label: 'Icono Grid (Square)' },
        { id: 'logoImage', label: 'Logotipo (Logo)' },
        { id: 'backgroundImage', label: 'Fondo (Background)' },
        { id: 'iconImage', label: 'Icono (Icon)' },
        { id: 'horizontalImage', label: 'Horizontal' },
        { id: 'verticalImage', label: 'Vertical' },
        { id: 'coverImage', label: 'Carátula (Cover)' },
    ]

    // ── Keyboard navigation ──
    useEffect(() => {
        const handler = (e: Event) => {
            const { visible: vis, tab: ct, focusArea: area, contentIndex: cIdx, isSaving: saving, isTargetMenuOpen: menuOpen, isEmuMenuOpen } = r.current
            if (!vis || saving) return

            const action = (e as CustomEvent<string>).detail

            // ─ Sub-menu: Input Editing ─
            if (r.current.isInputEditing) {
                // MainApp already handled Enter/Escape and called .blur(), which triggers our focusout listener.
                // We just swallow the arrow keys here so navigating while typing doesn't move the UI.
                return 
            }

            // ─ Sub-menu: Emulator Dropdown ─
            if (isEmuMenuOpen) {
                e.stopImmediatePropagation()
                const currentHover = r.current.emuMenuHoverIndex
                const emuOptions = [{ id: '', name: 'Nativo' }, ...r.current.emulators]
                if (action === 'up') {
                    if (currentHover > 0) { sfx.navigate(); setEmuMenuHoverIndex(currentHover - 1) }
                } else if (action === 'down') {
                    if (currentHover < emuOptions.length - 1) { sfx.navigate(); setEmuMenuHoverIndex(currentHover + 1) }
                } else if (action === 'select') {
                    sfx.confirm(); setForm(p => ({ ...p, emulatorId: emuOptions[currentHover].id, path: '' })); setIsEmuMenuOpen(false); setIsInputEditing(false)
                } else if (action === 'back') {
                    sfx.cancel(); setIsEmuMenuOpen(false); setIsInputEditing(false)
                }
                return
            }

            // ─ Sub-menu: Media Target Dropdown ─
            if (menuOpen) {
                e.stopImmediatePropagation()
                const currentHover = r.current.menuHoverIndex
                if (action === 'up') {
                    if (currentHover > 0) { sfx.navigate(); setMenuHoverIndex(currentHover - 1) }
                } else if (action === 'down') {
                    if (currentHover < MEDIA_OPTIONS.length - 1) { sfx.navigate(); setMenuHoverIndex(currentHover + 1) }
                } else if (action === 'select') {
                    sfx.confirm(); setMediaTarget(MEDIA_OPTIONS[currentHover].id); setIsTargetMenuOpen(false)
                } else if (action === 'back') {
                    sfx.cancel(); setIsTargetMenuOpen(false)
                }
                return
            }

            // --- FOCUS AREA: SIDEBAR TABS/NAVIGATION ---
            if (area === 'nav') {
                const tabIdx = TABS.findIndex(t => t.id === ct)
                if (action === 'up') {
                    if (tabIdx > 0) { sfx.navigate(); setTab(TABS[tabIdx - 1].id as Tab) }
                } else if (action === 'down') {
                    if (tabIdx < TABS.length - 1) { sfx.navigate(); setTab(TABS[tabIdx + 1].id as Tab) }
                    else { 
                        sfx.navigate()
                        if (r.current.hasAnyChanges) setFocusArea('nav_save')
                        else setFocusArea('nav_close')
                    }
                } else if (action === 'select') {
                    sfx.navigate(); setFocusArea('content'); setContentIndex(0)
                } else if (action === 'back') {
                    handleClose()
                }
                return
            }

            // --- FOCUS AREA: SIDEBAR SAVE BUTTON ---
            if (area === 'nav_save') {
                if (action === 'up') { sfx.navigate(); setFocusArea('nav'); setTab(TABS[TABS.length - 1].id as Tab) }
                else if (action === 'down') { sfx.navigate(); setFocusArea('nav_close') }
                else if (action === 'select') { handleSave() }
                else if (action === 'back') { sfx.navigate(); setFocusArea('nav') }
                return
            }

            // --- FOCUS AREA: SIDEBAR CLOSE BUTTON ---
            if (area === 'nav_close') {
                if (action === 'up') { 
                    sfx.navigate()
                    if (r.current.hasAnyChanges) setFocusArea('nav_save')
                    else { setFocusArea('nav'); setTab(TABS[TABS.length - 1].id as Tab) }
                }
                else if (action === 'select' || action === 'back') { handleClose() }
                return
            }

            // --- FOCUS AREA: CONTENT (MAIN FORM/GRID) ---
            if (area === 'content') {
                // Tab 1: General Info (Linear List)
                if (ct === 'general') {
                    const maxItems = 5
                    if (action === 'up') {
                        if (cIdx > 0) { sfx.navigate(); setContentIndex(p => p - 1); setContentSubIndex(0) }
                    } else if (action === 'down') {
                        if (cIdx < maxItems - 1) { sfx.navigate(); setContentIndex(p => p + 1); setContentSubIndex(0) }
                    } else if (action === 'left') {
                        if (cIdx === 1 && r.current.contentSubIndex > 0) {
                            sfx.navigate(); setContentSubIndex(0)
                        }
                    } else if (action === 'right') {
                        if (cIdx === 1 && r.current.contentSubIndex === 0) {
                            sfx.navigate(); setContentSubIndex(1)
                        }
                    } else if (action === 'back') {
                        sfx.navigate(); setFocusArea('nav'); setContentSubIndex(0)
                    } else if (action === 'select') {
                        if (cIdx === 1 && r.current.contentSubIndex === 1) {
                            handleAutoAssignSearchId()
                        } else if (cIdx === 2) {
                            handleBrowseGame()
                        } else if (cIdx === 3) {
                            sfx.open()
                            const emuOptions = [{ id: '', name: 'Nativo' }, ...r.current.emulators];
                            const startIdx = emuOptions.findIndex(o => o.id === r.current.form.emulatorId)
                            setEmuMenuHoverIndex(startIdx >= 0 ? startIdx : 0)
                            setIsEmuMenuOpen(true)
                        } else {
                            sfx.confirm()
                            setIsInputEditing(true)
                        }
                    }
                } else if (ct === 'media') {
                    const cols = 3
                    const hasRemoveBtn = !!r.current.form[r.current.mediaTarget]
                    const apiImgsStartAt = 3
                    const apiImgs = r.current.apiImages
                    const maxItems = apiImgsStartAt + apiImgs.length
                    
                    if (action === 'up') {
                        if (cIdx >= apiImgsStartAt + cols) { 
                            sfx.navigate(); setContentIndex(cIdx - cols) 
                        } else if (cIdx >= apiImgsStartAt) {
                            // Up from anywhere in the first row of grid goes back to Explorar (1)
                            sfx.navigate(); setContentIndex(1)
                        } else if (cIdx === 1 || cIdx === 2) {
                            sfx.navigate(); setContentIndex(0)
                        }
                    } else if (action === 'down') {
                        if (cIdx === 0) {
                            sfx.navigate(); setContentIndex(1)
                        } else if (cIdx === 1 || cIdx === 2) {
                            if (apiImgs.length > 0) {
                                sfx.navigate(); setContentIndex(apiImgsStartAt)
                            }
                        } else {
                            const row = Math.floor((cIdx - apiImgsStartAt) / cols)
                            const totalRows = Math.ceil(apiImgs.length / cols)
                            if (row < totalRows - 1) {
                                sfx.navigate(); setContentIndex(Math.min(cIdx + cols, maxItems - 1))
                            }
                        }
                    } else if (action === 'left') {
                        if (cIdx === 2) {
                            sfx.navigate(); setContentIndex(1)
                        } else if (cIdx >= apiImgsStartAt) {
                            if ((cIdx - apiImgsStartAt) % cols !== 0) {
                                sfx.navigate(); setContentIndex(cIdx - 1)
                            }
                        }
                    } else if (action === 'right') {
                        if (cIdx === 1 && hasRemoveBtn) {
                            sfx.navigate(); setContentIndex(2)
                        } else if (cIdx >= apiImgsStartAt) {
                            if ((cIdx - apiImgsStartAt) % cols < cols - 1 && cIdx < maxItems - 1) {
                                sfx.navigate(); setContentIndex(cIdx + 1)
                            }
                        }
                    } else if (action === 'select') {
                        if (cIdx === 0) {
                            sfx.confirm()
                            const startIdx = MEDIA_OPTIONS.findIndex(o => o.id === r.current.mediaTarget)
                            setMenuHoverIndex(startIdx >= 0 ? startIdx : 0)
                            setIsTargetMenuOpen(true)
                        } else if (cIdx === 1) {
                            document.getElementById('ag-artwork-btn')?.click()
                        } else if (cIdx === 2) {
                            sfx.cancel(); setForm(p => ({ ...p, [r.current.mediaTarget]: '' }))
                        } else {
                            const img = r.current.apiImages[cIdx - apiImgsStartAt]
                            if (img) {
                                sfx.confirm()
                                const imgUrlNormalized = `http://localhost:3000${img.url}`.replace('localhost:3000//', 'localhost:3000/')
                                setForm(p => ({ ...p, [r.current.mediaTarget]: imgUrlNormalized }))
                            }
                        }
                    } else if (action === 'back') {
                        sfx.navigate(); setFocusArea('nav')
                    }
                }
                return
            }
        }
        window.addEventListener('panel-move', handler)
        return () => window.removeEventListener('panel-move', handler)
    }, [handleClose])

    // File pickers
    const handleBrowseGame = useCallback(async () => {
        const emuId = r.current.form.emulatorId
        const emuList = r.current.emulators
        const isRom = !!emuList.find(e => e.id === emuId)
        const path = await window.api.browseFile({
            title: isRom ? 'Seleccionar ROM' : 'Seleccionar Ejecutable',
            filters: isRom
                ? [{ name: 'ROMs', extensions: ['iso', 'wux', 'nsp', 'xci', 'rvz', 'wbfs', 'gcm', 'cue', 'chd', 'nro', 'nes', 'sfc'] }, { name: 'Todos', extensions: ['*'] }]
                : [{ name: 'Ejecutables', extensions: ['exe', 'app', 'sh'] }, { name: 'Todos', extensions: ['*'] }]
        })
        if (path) setForm(prev => ({ ...prev, path, name: prev.name || path.split('\\').pop()?.replace(/\.[^/.]+$/, '') || '' }))
    }, [])

    const handleBrowseArtwork = useCallback(async () => {
        const target = r.current.mediaTarget
        const path = await window.api.browseFile({
            title: 'Seleccionar Imagen',
            filters: [{ name: 'Imágenes', extensions: ['jpg', 'png', 'webp'] }]
        })
        if (!path) return
        const res = await window.api.artwork.import(path)
        if (res.success && res.url) setForm(prev => ({ ...prev, [target]: res.url! }))
        else { sfx.error(); setError('Error copiando imagen.') }
    }, [])

    const handleSave = async () => {
        const { form: f, emulators: emus, editSlot: slot } = r.current
        setError(null)
        if (!f.name.trim()) { sfx.error(); setError('Falta asignar un nombre.'); return }
        if (!f.path.trim()) { sfx.error(); setError('Falta elegir la ruta.'); return }

        setIsSaving(true)
        try {
            const slotId = slot?.id ?? `game-${Date.now()}`
            const selectedEmulator = emus.find(e => e.id === f.emulatorId)
            const newSlot: HomeSlot = {
                ...(slot ?? {}),
                id: slotId,
                icon: 'mdi:controller',
                label: f.name.trim(),
                squareImage: f.squareImage || slot?.squareImage,
                backgroundImage: f.backgroundImage || slot?.backgroundImage,
                logoImage: f.logoImage || slot?.logoImage,
                coverImage: f.coverImage || slot?.coverImage,
                verticalImage: f.verticalImage || slot?.verticalImage,
                horizontalImage: f.horizontalImage || slot?.horizontalImage,
                iconImage: f.iconImage || slot?.iconImage,
                onClick: 'run-game',
                onMouseEnter: 'mouse-enter-grid-item',
                onMouseLeave: 'mouse-leave-grid-item',
                game: {
                    id: slot?.game?.id ?? slotId,
                    name: f.name.trim(),
                    searchId: f.searchId.trim(),
                    path: f.path.trim(),
                    emulator: selectedEmulator,
                    processName: f.processName.trim(),
                    playtimeMinutes: slot?.game?.playtimeMinutes ?? 0
                }
            }
            const res = await window.api.slots.add(newSlot)
            if (res.success) {
                sfx.confirm()
                showToast(slot ? 'Juego actualizado' : 'Juego añadido', 'success')
                forceClose()
            } else {
                sfx.error()
                showToast('Fallo al guardar', 'error')
                setError('Fallo al guardar.')
                setIsSaving(false)
            }
        } catch {
            sfx.error()
            showToast('Error inesperado', 'error')
            setError('Error inesperado.')
            setIsSaving(false)
        }
    }

    const isFocused = (area: FocusArea, idx?: number) => {
        if (isTargetMenuOpen) return false
        if (focusArea !== area) return false
        if (idx === undefined) return true
        return contentIndex === idx
    }

    const dynamicTabs = TABS.map(t => ({
        ...t,
        hasChanges: hasSectionChanges(t.id as Tab)
    }))

    // Resolve artwork URL for preview based on media target
    const targetVal = form[mediaTarget]
    const previewUrl = targetVal
        ? (targetVal.startsWith('http') || targetVal.startsWith('media://')
            ? targetVal
            : `media://${targetVal}`)
        : null

    return (
        <SidePanel
            visible={visible}
            tabs={dynamicTabs}
            activeTab={tab}
            focusArea={focusArea as any}
            onTabChange={(id) => { setTab(id as Tab); setFocusArea('content'); setContentIndex(0) }}
            onClose={handleClose}
            onSave={handleSave}
            hasUnsavedChanges={hasAnyChanges}
            titleOverride={isEditing ? 'Editar Juego' : 'Añadir Juego'}
        >
            {error && <div className="cp-form__error" style={{ marginBottom: 16 }}><Icon icon="mynaui:info-circle" /> {error}</div>}

            {/* ── GENERAL TAB ── */}
            {tab === 'general' && (
                <div className="cp-form">
                    <div className={isEmuMenuOpen ? 'ag-media-content--dimmed' : ''} style={{ transition: 'all 0.3s' }}>
                        {/* Name */}
                        <div
                            className={`ag-field-row ${isFocused('content', 0) ? 'ag-field-row--focused' : ''} ${isInputEditing && isFocused('content', 0) ? 'ag-field-row--editing' : ''}`}
                            onClick={() => { 
                                setFocusArea('content'); 
                                setContentIndex(0);
                                setIsInputEditing(true);
                            }}
                        >
                            <Icon icon="mynaui:edit-one" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Nombre del Juego</div>
                                <input
                                    id="ag-name"
                                    className={`ag-field-input ${isInputEditing && isFocused('content', 0) ? 'ag-field-input--editing' : ''}`}
                                    value={form.name}
                                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Ej. The Legend of Zelda"
                                    disabled={isSaving}
                                />
                            </div>
                        </div>

                        {/* Search ID with Side Button */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', marginBottom: 8, position: 'relative' }}>
                            <div
                                className={`ag-field-row ${isFocused('content', 1) && contentSubIndex === 0 ? 'ag-field-row--focused' : ''} ${isInputEditing && isFocused('content', 1) && contentSubIndex === 0 ? 'ag-field-row--editing' : ''}`}
                                onClick={() => { 
                                    setFocusArea('content'); 
                                    setContentIndex(1);
                                    setContentSubIndex(0);
                                    setIsInputEditing(true);
                                }}
                                style={{ flex: 1, marginBottom: 0 }}
                            >
                                <Icon icon="mynaui:search" className="ag-field-icon" />
                                <div className="ag-field-body">
                                    <div className="ag-field-label">Nombre para Búsqueda (APIs)</div>
                                    <input
                                        id="ag-searchid"
                                        className={`ag-field-input ${isInputEditing && isFocused('content', 1) && contentSubIndex === 0 ? 'ag-field-input--editing' : ''}`}
                                        value={form.searchId}
                                        onChange={e => setForm(p => ({ ...p, searchId: e.target.value }))}
                                        placeholder="Ej. the-legend-of-zelda (Opcional)"
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                            
                            <button
                                className={`ag-side-btn ${isFocused('content', 1) && contentSubIndex === 1 ? 'ag-side-btn--focused' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFocusArea('content');
                                    setContentIndex(1);
                                    setContentSubIndex(1);
                                    handleAutoAssignSearchId();
                                }}
                                onMouseEnter={() => {
                                    setFocusArea('content');
                                    setContentIndex(1);
                                    setContentSubIndex(1);
                                }}
                                title="Auto-generar ID desde el nombre"
                                disabled={isSaving}
                            >
                                <Icon icon="mynaui:sparkles" style={{ fontSize: 18 }} />
                                <span>Autoasignar</span>
                            </button>
                        </div>

                        {/* Path */}
                        <div
                            className={`ag-field-row ${isFocused('content', 2) ? 'ag-field-row--focused' : ''}`}
                            onClick={() => { 
                                setFocusArea('content'); 
                                setContentIndex(2); 
                                handleBrowseGame(); 
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <Icon icon="mynaui:file" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Ruta del Archivo</div>
                                <input
                                    id="ag-path"
                                    className={`ag-field-input`}
                                    value={form.path || 'Seleccionar archivo...'}
                                    readOnly
                                    disabled={isSaving}
                                    style={{ 
                                        opacity: form.path ? 1 : 0.4, 
                                        color: 'rgba(255,255,255,0.5)',
                                        cursor: 'pointer'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Emulator */}
                    <div
                        className={`ag-field-row ${isFocused('content', 3) && !isEmuMenuOpen ? 'ag-field-row--focused' : ''} ${isEmuMenuOpen ? 'ag-field-row--menu-open' : ''}`}
                        onClick={() => { 
                            if (isSaving) return;
                            setFocusArea('content'); 
                            setContentIndex(3);
                            if (!isEmuMenuOpen) {
                                const emuOptions = [{ id: '', name: 'Nativo' }, ...emulators];
                                const startIdx = emuOptions.findIndex(o => o.id === form.emulatorId)
                                setEmuMenuHoverIndex(startIdx >= 0 ? startIdx : 0)
                            }
                            setIsEmuMenuOpen(!isEmuMenuOpen);
                        }}
                    >
                        <Icon icon="mynaui:controller" className="ag-field-icon" />
                        <div className="ag-field-body">
                            <div className="ag-field-label">Emulador</div>
                            <div className="ag-custom-select">
                                <div className={`ag-custom-select__value ${isSaving ? 'disabled' : ''}`}>
                                    {emulators.find(e => e.id === form.emulatorId)?.name || 'Nativo'}
                                    <Icon icon={isEmuMenuOpen ? 'mynaui:chevron-up' : 'mynaui:chevron-down'} />
                                </div>

                                {isEmuMenuOpen && (
                                    <div className="ag-custom-select__dropdown" style={{ zIndex: 100 }}>
                                        {[{ id: '', name: 'Nativo' }, ...emulators].map((opt, i) => (
                                            <div 
                                                key={opt.id} 
                                                className={`ag-custom-select__option ${emuMenuHoverIndex === i ? 'active' : ''}`}
                                                onMouseEnter={() => setEmuMenuHoverIndex(i)}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setForm(p => ({ ...p, emulatorId: opt.id, path: '' }))
                                                    setIsEmuMenuOpen(false)
                                                    sfx.confirm()
                                                }}
                                            >
                                                {opt.name}
                                                {emuMenuHoverIndex === i && <Icon icon="mynaui:check" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={isEmuMenuOpen ? 'ag-media-content--dimmed' : ''} style={{ transition: 'all 0.3s' }}>
                        {/* Process Name */}
                        <div
                            className={`ag-field-row ${isFocused('content', 4) ? 'ag-field-row--focused' : ''} ${isInputEditing && isFocused('content', 4) ? 'ag-field-row--editing' : ''}`}
                            onClick={() => { 
                                setFocusArea('content'); 
                                setContentIndex(4);
                                setIsInputEditing(true);
                            }}
                        >
                            <Icon icon="mynaui:search" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Nombre del Proceso (Opcional)</div>
                                <input
                                    id="ag-process"
                                    className={`ag-field-input ${isInputEditing && isFocused('content', 3) ? 'ag-field-input--editing' : ''}`}
                                    value={form.processName}
                                    onChange={e => setForm(p => ({ ...p, processName: e.target.value }))}
                                    placeholder="Ej. java, Minecraft, etc."
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MEDIA TAB ── */}
            {tab === 'media' && (
                <div className="cp-form ag-media">
                    {/* Media Type Selector */}
                    <div
                        className={`ag-field-row ${isFocused('content', 0) && !isTargetMenuOpen ? 'ag-field-row--focused' : ''} ${isTargetMenuOpen ? 'ag-field-row--menu-open' : ''}`}
                        onClick={() => { 
                            setFocusArea('content'); 
                            setContentIndex(0); 
                            if (!isTargetMenuOpen) {
                                const startIdx = MEDIA_OPTIONS.findIndex(o => o.id === mediaTarget)
                                setMenuHoverIndex(startIdx >= 0 ? startIdx : 0)
                            }
                            setIsTargetMenuOpen(!isTargetMenuOpen) 
                        }}
                        style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 12, background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}
                    >
                        <div className="ag-field-body" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 4 }}>
                            <div className="ag-field-label" style={{ marginBottom: 0, fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                <Icon icon="mynaui:layers" style={{ marginRight: 10, fontSize: 18, verticalAlign: '-4px' }}/>
                                TIPO DE ARTE EDITABLE
                            </div>
                            
                            <div className="ag-custom-select">
                                <div className="ag-custom-select__value">
                                    {MEDIA_OPTIONS.find(o => o.id === mediaTarget)?.label}
                                    <Icon icon={isTargetMenuOpen ? 'mynaui:chevron-up' : 'mynaui:chevron-down'} />
                                </div>

                                {isTargetMenuOpen && (
                                    <div className="ag-custom-select__dropdown">
                                        {MEDIA_OPTIONS.map((opt, i) => (
                                            <div 
                                                key={opt.id} 
                                                className={`ag-custom-select__option ${menuHoverIndex === i ? 'active' : ''}`}
                                            >
                                                {opt.label}
                                                {menuHoverIndex === i && <Icon icon="mynaui:check" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Container with dimming effect when menu is open */}
                    <div className={`ag-media-content ${isTargetMenuOpen ? 'ag-media-content--dimmed' : ''}`}>
                        {/* Preview + browse row */}
                        <div className="ag-media-top">
                            <div className="ag-media-preview">
                                {previewUrl
                                    ? <img src={previewUrl} alt="preview" className="ag-media-preview-img" style={{ objectFit: mediaTarget === 'backgroundImage' ? 'cover' : mediaTarget === 'logoImage' ? 'contain' : 'cover' }} />
                                    : <Icon icon="mynaui:image" style={{ fontSize: 36, opacity: 0.3, color: 'var(--text-muted)' }} />
                                }
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div className="cp-form__title">
                                    {mediaTarget === 'squareImage' ? 'Imagen Grid' : 
                                     mediaTarget === 'backgroundImage' ? 'Fondo Pantalla' : 
                                     mediaTarget === 'logoImage' ? 'Logotipo' : 'Carátula'}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                                    Selecciona una imagen de la API o importa una local
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                    <button
                                        id="ag-artwork-btn"
                                        className={`cp-btn cp-btn--secondary ag-media-browse ${isFocused('content', 1) ? 'cp-btn--focused' : ''}`}
                                        onClick={handleBrowseArtwork}
                                        disabled={isSaving}
                                        style={{ flex: 1, padding: '8px 12px' }}
                                    >
                                        <Icon icon="mynaui:search" /> Explorar
                                    </button>
                                    {form[mediaTarget] && (
                                        <button
                                            id="ag-remove-btn"
                                            className={`cp-btn cp-btn--ghost ${isFocused('content', 2) ? 'cp-btn--focused' : ''}`}
                                            onClick={() => setForm(p => ({ ...p, [mediaTarget]: '' }))}
                                            disabled={isSaving}
                                            style={{ 
                                                fontSize: 12, 
                                                padding: '8px 12px',
                                                color: '#ff8080',
                                                border: isFocused('content', 2) ? '1px solid rgba(255,128,128,0.3)' : '1px solid transparent'
                                            }}
                                        >
                                            <Icon icon="mynaui:trash" /> Quitar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* API image grid */}
                        {apiImages.length > 0 ? (
                            <div style={{ marginTop: 20 }}>
                                <div className="cp-form__title" style={{ marginBottom: 10 }}>
                                    Imágenes de la API — <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>↑↓ para navegar, A para seleccionar</span>
                                </div>
                                <div className="ag-api-grid">
                                    {apiImages.map((img, i) => {
                                        const isSel = isFocused('content', i + 3)
                                        // Normalize both for comparison
                                        const normalizeForCheck = (url: string) => url.replace('http://localhost:3000', '').replace('//', '/')
                                        const imgUrlNormalized = `http://localhost:3000${img.url}`.replace('localhost:3000//', 'localhost:3000/')
                                        const isActive = normalizeForCheck(form[mediaTarget] || '') === normalizeForCheck(img.url)

                                        return (
                                            <button
                                                key={i}
                                                id={`ag-api-btn-${i}`}
                                                className={`ag-api-card ${isSel ? 'ag-api-card--focused' : ''} ${isActive ? 'ag-api-card--active' : ''}`}
                                                onClick={() => {
                                                    sfx.confirm();
                                                    setForm(p => ({ ...p, [mediaTarget]: imgUrlNormalized }));
                                                    setFocusArea('content');
                                                    setContentIndex(i + 3);
                                                }}
                                                disabled={isSaving}
                                            >
                                                <div className="ag-api-card-img-wrap">
                                                    <img
                                                        src={`http://localhost:3000${img.url}`}
                                                        alt={img.type}
                                                        className="ag-api-card-img"
                                                        onError={e => { (e.target as HTMLImageElement).src = '' }}
                                                    />
                                                </div>
                                                <span className="ag-api-card-label">{IMAGE_LABELS[img.type] ?? img.type}</span>
                                                {isActive && <Icon icon="mynaui:check-circle-solid" className="ag-api-card-check" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                                {form.name
                                    ? <><Icon icon="mynaui:search" style={{ marginBottom: 6, fontSize: 22, display: 'block', margin: '0 auto 8px' }} />Sin resultados para "{form.name}"</>
                                    : 'Introduce un nombre en la pestaña General para buscar imágenes'
                                }
                            </div>
                        )}
                    </div>
                </div>
            )}
        </SidePanel>
    )
}

export default AddGamePanel
