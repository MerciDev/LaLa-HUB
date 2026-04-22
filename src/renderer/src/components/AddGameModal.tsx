import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import { HomeSlot, Emulator } from '../../../shared/types'
import { sfx } from '../utils/audioManager'
import SidePanel, { ConsolePanelTab } from './SidePanel'

interface AddGameForm {
    name: string
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
    name: '', path: '', emulatorId: '', processName: '',
    squareImage: '', backgroundImage: '', logoImage: '', 
    coverImage: '', verticalImage: '', horizontalImage: '', iconImage: '' 
}

type Tab = 'general' | 'media'
type FocusArea = 'nav' | 'nav_close' | 'content' | 'footer'
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
    const [footerIndex, setFooterIndex] = useState(1)
    const [mediaTarget, setMediaTarget] = useState<MediaTarget>('squareImage')
    const [isTargetMenuOpen, setIsTargetMenuOpen] = useState(false)
    const [menuHoverIndex, setMenuHoverIndex] = useState(0)

    const [form, setForm] = useState<AddGameForm>(EMPTY_FORM)
    const [emulators, setEmulators] = useState<Emulator[]>([])
    const [apiImages, setApiImages] = useState<{ type: string; url: string }[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const isEditing = !!editSlot

    // Always-fresh ref for the event handler
    const r = useRef({ tab, focusArea, contentIndex, footerIndex, visible, form, emulators, apiImages, isSaving, editSlot, mediaTarget, isTargetMenuOpen, menuHoverIndex })
    useEffect(() => {
        r.current = { tab, focusArea, contentIndex, footerIndex, visible, form, emulators, apiImages, isSaving, editSlot, mediaTarget, isTargetMenuOpen, menuHoverIndex }
    })

    // ── Reset state on open ──
    useEffect(() => {
        if (!visible) return
        window.api.emulators.getAll().then(setEmulators)
        setTab('general')
        setFocusArea('nav')       // ← START IN NAV, not content
        setContentIndex(0)
        setFooterIndex(1)
        setApiImages([])
        setError(null)

        if (editSlot) {
            setForm({
                name: editSlot.label,
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
            })
        } else {
            setForm(EMPTY_FORM)
        }
    }, [visible, editSlot])

    // ── Fetch API images when entering media tab ──
    useEffect(() => {
        if (tab !== 'media' || !form.name) { setApiImages([]); return }
        const q = encodeURIComponent(form.name)
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

    // ── Auto-focus inputs when content area is focused ──
    useEffect(() => {
        if (!visible) return
            if (contentIndex === 0) document.getElementById('ag-name')?.focus()
            if (contentIndex === 1) document.getElementById('ag-path')?.focus()
            if (contentIndex === 2) document.getElementById('ag-emu')?.focus()
            if (contentIndex === 3) document.getElementById('ag-process')?.focus()
        } else {
            document.getElementById('ag-name')?.blur()
            document.getElementById('ag-path')?.blur()
            document.getElementById('ag-emu')?.blur()
            document.getElementById('ag-process')?.blur()
        }
    }, [focusArea, contentIndex, tab, visible])

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

    // ── Auto-scroll into view ──
    useEffect(() => {
        if (isTargetMenuOpen) return;

        const bodyEl = document.querySelector('.console-panel__content-body')

        if (focusArea === 'footer' && bodyEl) {
            bodyEl.scrollTo({ top: bodyEl.scrollHeight, behavior: 'smooth' })
        } else if (focusArea === 'content') {
            if ((contentIndex === 0 || contentIndex === 1) && bodyEl) {
                bodyEl.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
                const id = tab === 'general' 
                    ? (contentIndex === 0 ? 'ag-name' : contentIndex === 1 ? 'ag-path' : contentIndex === 2 ? 'ag-emu' : 'ag-process')
                    : (contentIndex === 0 ? 'ag-media-target' : contentIndex === 1 ? 'ag-artwork-btn' : contentIndex === 2 ? 'ag-remove-btn' : `ag-api-btn-${contentIndex - 3}`)
                
                const el = document.getElementById(id)
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }
            }
        }
    }, [contentIndex, focusArea, tab, isTargetMenuOpen])

    const handleClose = useCallback(() => {
        sfx.cancel()
        setForm(EMPTY_FORM)
        setError(null)
        setIsTargetMenuOpen(false)
        onClose()
    }, [onClose])

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
            const { visible: vis, tab: ct, focusArea: area, contentIndex: cIdx, footerIndex: fIdx, isSaving: saving, isTargetMenuOpen: menuOpen, mediaTarget: currentTarget } = r.current
            if (!vis || saving) return

            const action = (e as CustomEvent<string>).detail

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
                    else { sfx.navigate(); setFocusArea('nav_close') }
                } else if (action === 'right' || action === 'select') {
                    sfx.navigate(); setFocusArea('content'); setContentIndex(0)
                } else if (action === 'back') {
                    handleClose()
                }
                return
            }

            // --- FOCUS AREA: SIDEBAR CLOSE BUTTON ---
            if (area === 'nav_close') {
                if (action === 'up') { sfx.navigate(); setFocusArea('nav'); setTab(TABS[TABS.length - 1].id as Tab) }
                else if (action === 'right') { sfx.navigate(); setFocusArea('content'); setContentIndex(0) }
                else if (action === 'select' || action === 'back') { handleClose() }
                return
            }

            // --- FOCUS AREA: CONTENT (MAIN FORM/GRID) ---
            if (area === 'content') {
                // If a native input is natively focused, only intercept Escape/back
                if (r.current.focusArea === 'content' && ct === 'general') {
                    const nativeEl = document.activeElement as HTMLElement
                    const isNativelyFocused = ['ag-name', 'ag-path', 'ag-emu'].some(id => document.getElementById(id) === nativeEl)
                    if (isNativelyFocused) {
                        if (action === 'back') {
                            nativeEl.blur()
                        }
                        return // Let the browser handle typing
                    }
                }

                // Tab 1: General Info (Linear List)
                if (ct === 'general') {
                    const maxItems = 4
                    if (action === 'up') {
                        if (cIdx > 0) { sfx.navigate(); setContentIndex(p => p - 1) }
                        else { sfx.navigate(); setFocusArea('nav') }
                    } else if (action === 'down') {
                        if (cIdx < maxItems - 1) { sfx.navigate(); setContentIndex(p => p + 1) }
                        else { sfx.navigate(); setFocusArea('footer'); setFooterIndex(1) }
                    } else if (action === 'left' || action === 'back') {
                        sfx.navigate(); setFocusArea('nav')
                    } else if (action === 'select') {
                        // Focus the native input explicitly
                        const ids = ['ag-name', 'ag-path', 'ag-emu', 'ag-process']
                        document.getElementById(ids[cIdx])?.focus()
                    }
                // Tab 2: Multimedia (Grid Layout)
                } else if (ct === 'media') {
                    // Grid navigation: 3 columns
                    const cols = 3
                    const hasRemoveBtn = !!r.current.form[r.current.mediaTarget]
                    const apiImgsStartAt = 3 // 0: Select, 1: Browse, 2: Remove
                    const maxItems = apiImgsStartAt + r.current.apiImages.length
                    
                    if (action === 'up') {
                        if (cIdx >= apiImgsStartAt + cols) { 
                            sfx.navigate(); setContentIndex(cIdx - cols) 
                        } else if (cIdx >= apiImgsStartAt) {
                            sfx.navigate(); setContentIndex(hasRemoveBtn ? 2 : 1)
                        } else if (cIdx === 2) {
                            sfx.navigate(); setContentIndex(1)
                        } else if (cIdx === 1) {
                            sfx.navigate(); setContentIndex(0)
                        } else {
                            sfx.navigate(); setFocusArea('nav')
                        }
                    } else if (action === 'down') {
                        if (cIdx === 0) {
                            sfx.navigate(); setContentIndex(1)
                        } else if (cIdx === 1) {
                            sfx.navigate(); setContentIndex(hasRemoveBtn ? 2 : apiImgsStartAt)
                        } else if (cIdx === 2) {
                            sfx.navigate(); setContentIndex(apiImgsStartAt)
                        } else if (cIdx + cols < maxItems) {
                            sfx.navigate(); setContentIndex(cIdx + cols)
                        } else {
                            sfx.navigate(); setFocusArea('footer'); setFooterIndex(0) // Land on Cancel (0)
                        }
                    } else if (action === 'left') {
                        if (cIdx > apiImgsStartAt) {
                            sfx.navigate(); setContentIndex(cIdx - 1)
                        } else if (cIdx === apiImgsStartAt) {
                            sfx.navigate(); setContentIndex(hasRemoveBtn ? 2 : 1)
                        } else if (cIdx === 2) {
                            sfx.navigate(); setContentIndex(1)
                        } else if (cIdx === 1) {
                            sfx.navigate(); setContentIndex(0)
                        } else {
                            sfx.navigate(); setFocusArea('nav')
                        }
                    } else if (action === 'right') {
                        if (cIdx < maxItems - 1) {
                            if (cIdx === 0) { /* dropdown right does nothing unless handled natively */ }
                            else if (cIdx === 1 && !hasRemoveBtn) setContentIndex(apiImgsStartAt)
                            else setContentIndex(cIdx + 1)
                            sfx.navigate()
                        }
                    } else if (action === 'back') {
                        sfx.navigate(); setFocusArea('nav')
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
                    }
                }
                return
            }

            // --- FOCUS AREA: FOOTER BUTTONS (CANCEL/SAVE) ---
            if (area === 'footer') {
                if (action === 'up') {
                    sfx.navigate()
                    setFocusArea('content')
                    // Return to last item: index 2 + (length - 1)
                    const lastIdx = ct === 'general' ? 3 : Math.max(0, 1 + r.current.apiImages.length)
                    setContentIndex(lastIdx)
                } else if (action === 'left') {
                    if (fIdx > 0) { sfx.navigate(); setFooterIndex(fIdx - 1) }
                    else { sfx.navigate(); setFocusArea('nav') }
                } else if (action === 'right') {
                    if (fIdx < 1) { sfx.navigate(); setFooterIndex(fIdx + 1) }
                } else if (action === 'select') {
                    if (fIdx === 0) handleClose()
                    else document.getElementById('ag-save')?.click()
                } else if (action === 'back') {
                    sfx.navigate()
                    setFocusArea('content')
                    setContentIndex(ct === 'general' ? 3 : 0)
                }
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
                    path: f.path.trim(),
                    emulator: selectedEmulator,
                    processName: f.processName.trim(),
                    playtimeMinutes: slot?.game?.playtimeMinutes ?? 0
                }
            }
            const res = await window.api.slots.add(newSlot)
            if (res.success) { sfx.confirm(); handleClose() }
            else { sfx.error(); setError('Fallo al guardar.'); setIsSaving(false) }
        } catch {
            sfx.error(); setError('Error inesperado.'); setIsSaving(false)
        }
    }

    const isFocused = (area: FocusArea, idx?: number) => {
        if (isTargetMenuOpen) return false
        if (focusArea !== area) return false
        if (idx === undefined) return true
        if (area === 'footer') return footerIndex === idx
        return contentIndex === idx
    }

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
            tabs={TABS}
            activeTab={tab}
            focusArea={focusArea as any}
            onTabChange={(id) => { setTab(id as Tab); setFocusArea('content'); setContentIndex(0) }}
            onClose={handleClose}
            titleOverride={isEditing ? 'Editar Juego' : 'Añadir Juego'}
            footer={
                <div className="cp-footer-actions">
                    <button
                        className={`cp-btn cp-btn--ghost ${isFocused('footer', 0) ? 'cp-btn--focused' : ''}`}
                        onClick={handleClose} disabled={isSaving}
                    >
                        Cancelar
                    </button>
                    <button
                        id="ag-save"
                        className={`cp-btn cp-btn--primary ${isFocused('footer', 1) ? 'cp-btn--focused' : ''}`}
                        onClick={handleSave} disabled={isSaving}
                    >
                        <Icon icon="mynaui:check" /> {isSaving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Guardar')}
                    </button>
                </div>
            }
        >
            {error && <div className="cp-form__error" style={{ marginBottom: 16 }}><Icon icon="mynaui:info-circle" /> {error}</div>}

            {/* ── GENERAL TAB ── */}
            {tab === 'general' && (
                <div className="cp-form">
                    {/* Name */}
                    <div
                        className={`ag-field-row ${isFocused('content', 0) ? 'ag-field-row--focused' : ''}`}
                        onClick={() => { setFocusArea('content'); setContentIndex(0) }}
                    >
                        <Icon icon="mynaui:edit-one" className="ag-field-icon" />
                        <div className="ag-field-body">
                            <div className="ag-field-label">Nombre del Juego</div>
                            <input
                                id="ag-name"
                                className="ag-field-input"
                                value={form.name}
                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                placeholder="Ej. The Legend of Zelda"
                                disabled={isSaving}
                            />
                        </div>
                        {isFocused('content', 0) && <div className="ag-field-hint">A para editar</div>}
                    </div>

                    {/* Path */}
                    <div
                        className={`ag-field-row ${isFocused('content', 1) ? 'ag-field-row--focused' : ''}`}
                        onClick={() => { setFocusArea('content'); setContentIndex(1) }}
                    >
                        <Icon icon="mynaui:folder-open" className="ag-field-icon" />
                        <div className="ag-field-body">
                            <div className="ag-field-label">Ruta del Archivo</div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input
                                    id="ag-path"
                                    className="ag-field-input"
                                    value={form.path}
                                    onChange={e => setForm(p => ({ ...p, path: e.target.value }))}
                                    placeholder="/Juegos/Juego.exe o ROM"
                                    disabled={isSaving}
                                    style={{ flex: 1 }}
                                />
                                <button className="cp-btn cp-btn--secondary cp-btn--icon" onClick={handleBrowseGame} disabled={isSaving} title="Explorar">
                                    <Icon icon="mynaui:folder-open" />
                                </button>
                            </div>
                        </div>
                        {isFocused('content', 1) && <div className="ag-field-hint">A para editar</div>}
                    </div>

                    {/* Emulator */}
                    <div
                        className={`ag-field-row ${isFocused('content', 2) ? 'ag-field-row--focused' : ''}`}
                        onClick={() => { setFocusArea('content'); setContentIndex(2) }}
                    >
                        <Icon icon="mynaui:controller" className="ag-field-icon" />
                        <div className="ag-field-body">
                            <div className="ag-field-label">Emulador</div>
                            <select
                                id="ag-emu"
                                className="ag-field-input"
                                value={form.emulatorId}
                                onChange={e => setForm(p => ({ ...p, emulatorId: e.target.value, path: '' }))}
                                disabled={isSaving}
                            >
                                <option value="">— Nativo (Ejecutable directo) —</option>
                                {emulators.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </div>
                        {isFocused('content', 2) && <div className="ag-field-hint">A para editar</div>}
                    </div>

                    {/* Process Name */}
                    <div
                        className={`ag-field-row ${isFocused('content', 3) ? 'ag-field-row--focused' : ''}`}
                        onClick={() => { setFocusArea('content'); setContentIndex(3) }}
                    >
                        <Icon icon="mynaui:search" className="ag-field-icon" />
                        <div className="ag-field-body">
                            <div className="ag-field-label">Nombre del Proceso (Opcional)</div>
                            <input
                                id="ag-process"
                                className="ag-field-input"
                                value={form.processName}
                                onChange={e => setForm(p => ({ ...p, processName: e.target.value }))}
                                placeholder="Ej. java, Minecraft, etc."
                                disabled={isSaving}
                            />
                        </div>
                        {isFocused('content', 3) && <div className="ag-field-hint">A para editar</div>}
                    </div>
                </div>
            )}

            {/* ── MEDIA TAB ── */}
            {tab === 'media' && (
                <div className="cp-form ag-media">
                    {/* Media Type Selector */}
                    <div
                        className={`ag-field-row ${isFocused('content', 0) ? 'ag-field-row--focused' : ''} ${isTargetMenuOpen ? 'ag-field-row--menu-open' : ''}`}
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
                                <button
                                    id="ag-artwork-btn"
                                    className={`cp-btn cp-btn--secondary ag-media-browse ${isFocused('content', 1) ? 'cp-btn--focused' : ''}`}
                                    onClick={handleBrowseArtwork}
                                    disabled={isSaving}
                                >
                                    <Icon icon="mynaui:folder-open" /> Explorar Local...
                                </button>
                                {form[mediaTarget] && (
                                    <button
                                        id="ag-remove-btn"
                                        className={`cp-btn cp-btn--ghost ${isFocused('content', 2) ? 'cp-btn--focused' : ''}`}
                                        onClick={() => setForm(p => ({ ...p, [mediaTarget]: '' }))}
                                        disabled={isSaving}
                                        style={{ fontSize: 12, marginTop: 4, outline: isFocused('content', 2) ? '2px solid var(--accent)' : 'none' }}
                                    >
                                        <Icon icon="mynaui:x" /> Quitar imagen
                                    </button>
                                )}
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
