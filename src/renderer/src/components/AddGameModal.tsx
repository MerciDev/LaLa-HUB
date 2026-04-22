import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import { HomeSlot, Emulator } from '../../../shared/types'
import { sfx } from '../utils/audioManager'
import SidePanel, { ConsolePanelTab } from './SidePanel'

interface AddGameForm {
    name: string
    path: string
    emulatorId: string   // '' => direct exe
    artworkUrl: string   // '' => no custom art
}

const EMPTY_FORM: AddGameForm = { name: '', path: '', emulatorId: '', artworkUrl: '' }

type Tab = 'general' | 'media'
type FocusArea = 'nav' | 'nav_close' | 'content' | 'footer'

const TABS: ConsolePanelTab[] = [
    { id: 'general', label: 'General',     icon: 'mynaui:controller', description: 'Nombre, ruta y emulador' },
    { id: 'media',   label: 'Multimedia',  icon: 'mynaui:image',      description: 'Carátulas y recursos visuales' },
]

interface AddGamePanelProps {
    visible: boolean
    selectedIndex: number // We'll map this internally or ignore it in favor of internal panel navigation
    editSlot?: HomeSlot | null
    onClose: () => void
}

function AddGamePanel({ visible, editSlot, onClose }: AddGamePanelProps): React.JSX.Element {
    const [tab, setTab] = useState<Tab>('general')
    const [focusArea, setFocusArea] = useState<FocusArea>('nav')
    const [contentIndex, setContentIndex] = useState(0)
    const [footerIndex, setFooterIndex] = useState(1) // Focus save by default

    const [form, setForm] = useState<AddGameForm>(EMPTY_FORM)
    const [emulators, setEmulators] = useState<Emulator[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const isEditing = !!editSlot

    const r = useRef({
        tab, focusArea, contentIndex, footerIndex, visible, form, emulators, isSaving, editSlot
    })
    useEffect(() => {
        r.current = { tab, focusArea, contentIndex, footerIndex, visible, form, emulators, isSaving, editSlot }
    })

    // Load data
    useEffect(() => {
        if (!visible) return
        window.api.emulators.getAll().then(setEmulators)
        setTab('general')
        setFocusArea('content')
        setContentIndex(0)
        setFooterIndex(1)
        setError(null)
        
        if (editSlot) {
            setForm({
                name: editSlot.label,
                path: editSlot.game?.path ?? '',
                emulatorId: editSlot.game?.emulator?.id ?? '',
                artworkUrl: editSlot.squareImage ?? ''
            })
        } else {
            setForm(EMPTY_FORM)
        }
    }, [visible, editSlot])

    const handleClose = useCallback(() => {
        sfx.cancel()
        setForm(EMPTY_FORM)
        setError(null)
        onClose()
    }, [onClose])

    // Keyboard handling mapped through standard panel-move custom events
    useEffect(() => {
        const handler = (e: Event) => {
            const { visible: vis, tab: ct, focusArea: area, contentIndex: cIdx, footerIndex: fIdx, isSaving: saving } = r.current
            if (!vis || saving) return

            const action = (e as CustomEvent<string>).detail

            // ── Nav ──
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

            if (area === 'nav_close') {
                if (action === 'up') { sfx.navigate(); setFocusArea('nav'); setTab(TABS[TABS.length - 1].id as Tab) }
                else if (action === 'right') { sfx.navigate(); setFocusArea('content') }
                else if (action === 'select' || action === 'back') { handleClose() }
                return
            }

            // ── Content ──
            if (area === 'content') {
                const maxItems = ct === 'general' ? 3 : 1
                if (action === 'up') {
                    if (cIdx > 0) { sfx.navigate(); setContentIndex(p => p - 1) }
                    else { sfx.navigate(); setFocusArea('nav') }
                } else if (action === 'down') {
                    if (cIdx < maxItems - 1) { sfx.navigate(); setContentIndex(p => p + 1) }
                    else { sfx.navigate(); setFocusArea('footer') }
                } else if (action === 'left' || action === 'back') {
                    sfx.navigate(); setFocusArea('nav')
                } else if (action === 'select') {
                    if (ct === 'general') {
                        if (cIdx === 0) document.getElementById('ag-name')?.focus()
                        if (cIdx === 1) document.getElementById('ag-path')?.focus()
                        if (cIdx === 2) document.getElementById('ag-emu')?.focus()
                    }
                    if (ct === 'media') {
                        document.getElementById('ag-artwork-btn')?.click()
                    }
                }
                return
            }

            // ── Footer ──
            if (area === 'footer') {
                if (action === 'up') {
                    sfx.navigate(); setFocusArea('content'); setContentIndex(ct === 'general' ? 2 : 0)
                } else if (action === 'left') {
                    if (fIdx > 0) { sfx.navigate(); setFooterIndex(fIdx - 1) }
                    else { sfx.navigate(); setFocusArea('nav') }
                } else if (action === 'right') {
                    if (fIdx < 1) { sfx.navigate(); setFooterIndex(fIdx + 1) }
                } else if (action === 'select') {
                    if (fIdx === 0) handleClose()
                    else document.getElementById('ag-save')?.click()
                } else if (action === 'back') {
                    sfx.navigate(); setFocusArea('content'); setContentIndex(ct === 'general' ? 2 : 0)
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
                : [{ name: 'Ejecutables', extensions: ['exe'] }, { name: 'Todos', extensions: ['*'] }]
        })
        if (path) setForm(prev => ({ ...prev, path, name: prev.name || path.split('\\').pop()?.replace(/\.[^/.]+$/, '') || '' }))
    }, [])

    const handleBrowseArtwork = useCallback(async () => {
        const path = await window.api.browseFile({
            title: 'Sleccionar Carátula',
            filters: [{ name: 'Imágenes', extensions: ['jpg', 'png', 'webp'] }]
        })
        if (!path) return
        const res = await window.api.artwork.import(path)
        if (res.success && res.url) setForm(prev => ({ ...prev, artworkUrl: res.url! }))
        else { sfx.error(); setError('Error copiando carátula.') }
    }, [])

    // Saving
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
                squareImage: f.artworkUrl || slot?.squareImage,
                onClick: 'run-game',
                onMouseEnter: 'mouse-enter-grid-item',
                onMouseLeave: 'mouse-leave-grid-item',
                game: {
                    id: slot?.game?.id ?? slotId,
                    name: f.name.trim(),
                    path: f.path.trim(),
                    emulator: selectedEmulator,
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

    return (
        <SidePanel
            visible={visible}
            tabs={TABS}
            activeTab={tab}
            focusArea={focusArea as any} // map internally
            onTabChange={(id) => { setTab(id as Tab); setFocusArea('content'); setContentIndex(0) }}
            onClose={handleClose}
            titleOverride={isEditing ? 'Editar Juego' : 'Añadir Juego'}
            footer={
                <div className="cp-footer-actions">
                    <button
                        className={`cp-btn cp-btn--ghost ${focusArea === 'footer' && footerIndex === 0 ? 'cp-btn--focused' : ''}`}
                        onClick={handleClose} disabled={isSaving}
                    >
                        Cancelar
                    </button>
                    <button
                        id="ag-save"
                        className={`cp-btn cp-btn--primary ${focusArea === 'footer' && footerIndex === 1 ? 'cp-btn--focused' : ''}`}
                        onClick={handleSave} disabled={isSaving}
                    >
                        <Icon icon="mynaui:check" /> {isSaving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Guardar')}
                    </button>
                </div>
            }
        >
            {error && <div className="cp-form__error" style={{ marginBottom: 16 }}><Icon icon="mynaui:info-circle" /> {error}</div>}

            {tab === 'general' && (
                <div className="cp-form">
                    <div className="cp-form__title">Nombre del Juego</div>
                    <input 
                        id="ag-name" className={`cp-input ${focusArea === 'content' && contentIndex === 0 ? 'cp-input--focused' : ''}`}
                        value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ej. The Legend of Zelda" disabled={isSaving}
                    />

                    <div className="cp-form__title" style={{ marginTop: 24 }}>Ruta del Archivo</div>
                    <div className="cp-input-row" style={{ display: 'flex', gap: 8 }}>
                        <input
                            id="ag-path" className={`cp-input ${focusArea === 'content' && contentIndex === 1 ? 'cp-input--focused' : ''}`}
                            value={form.path} onChange={e => setForm(p => ({ ...p, path: e.target.value }))}
                            placeholder="C:\Juegos\Juego.exe o ROM" disabled={isSaving} style={{ flex: 1 }}
                        />
                        <button className="cp-btn cp-btn--secondary cp-btn--icon" onClick={handleBrowseGame} disabled={isSaving} title="Explorar">
                            <Icon icon="mynaui:folder-open" />
                        </button>
                    </div>

                    <div className="cp-form__title" style={{ marginTop: 24 }}>Emulador</div>
                    <select
                        id="ag-emu" className={`cp-input ${focusArea === 'content' && contentIndex === 2 ? 'cp-input--focused' : ''}`}
                        value={form.emulatorId} onChange={e => setForm(p => ({ ...p, emulatorId: e.target.value, path: '' }))}
                        disabled={isSaving}
                    >
                        <option value="">— Nativo (Ejecutable directo) —</option>
                        {emulators.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
            )}

            {tab === 'media' && (
                <div className="cp-form">
                    <div className="cp-form__title">Carátula (Square)</div>
                    {form.artworkUrl ? (
                        <div style={{ position: 'relative', width: 200, height: 200, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <img src={form.artworkUrl} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                onClick={() => setForm(p => ({ ...p, artworkUrl: '' }))} disabled={isSaving}
                            >
                                <Icon icon="mynaui:x" />
                            </button>
                        </div>
                    ) : (
                        <button
                            id="ag-artwork-btn"
                            className={`cp-import-zone ${focusArea === 'content' && contentIndex === 0 ? 'focused' : ''}`}
                            style={{ 
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, 
                                width: '100%', padding: '40px 20px', borderRadius: 16, border: '2px dashed var(--border)', 
                                background: 'var(--bg-hover)', cursor: 'pointer', outline: focusArea==='content'&&contentIndex===0 ? '2px solid var(--border-active)' : 'none'
                            }}
                            onClick={handleBrowseArtwork} disabled={isSaving}
                        >
                            <Icon icon="mynaui:image" style={{ fontSize: 32, opacity: 0.5 }} />
                            <span style={{ fontSize: 13, fontWeight: 500 }}>Explorar imagen...</span>
                        </button>
                    )}
                </div>
            )}
        </SidePanel>
    )
}

export default AddGamePanel
