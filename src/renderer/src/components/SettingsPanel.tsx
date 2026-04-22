import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import { Emulator } from '../../../shared/types'
import { sfx } from '../utils/audioManager'
import SidePanel, { ConsolePanelTab } from './SidePanel'

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

type Tab = 'emulators' | 'controls' | 'grid' | 'friends' | 'trophies'
type FocusArea = 'nav' | 'nav_close' | 'content' | 'footer'

interface EmulatorForm { name: string; path: string; args: string }
const EMPTY_EMU: EmulatorForm = { name: '', path: '', args: '' }

interface SettingsPanelProps {
    visible: boolean
    onClose: () => void
    onJumpToHeader: (side: 'left' | 'right') => void
    gridConfig?: { rows: number; cols: number; gap: number; aspectRatio: number }
    onGridConfigChange?: (rows: number, cols: number, gap: number, aspectRatio: number) => void
    minGridDimensions?: { minRows: number; minCols: number }
}

const TABS: ConsolePanelTab[] = [
    { id: 'emulators', label: 'Emuladores', icon: 'mynaui:chip',         description: 'Gestiona tus emuladores y rutas de acceso' },
    { id: 'controls',  label: 'Controles',  icon: 'mynaui:joystick',     description: 'Reasigna los botones de tu mando o teclado' },
    { id: 'grid',      label: 'Cuadrícula', icon: 'mynaui:grid',         description: 'Personaliza las filas, columnas y aspecto del grid' },
    { id: 'friends',   label: 'Amigos',     icon: 'mynaui:users',        description: 'Próximamente — Lista de amigos y estado' },
    { id: 'trophies',  label: 'Logros',     icon: 'mynaui:award',        description: 'Próximamente — Trofeos y logros desbloqueados' },
]

const TAB_IDS = TABS.map(t => t.id) as Tab[]

function SettingsPanel({ visible, onClose, onJumpToHeader, gridConfig, onGridConfigChange, minGridDimensions }: SettingsPanelProps): React.JSX.Element {
    const [tab, setTab]                     = useState<Tab>('emulators')
    const [controlsSubTab, setControlsSubTab] = useState<'menu' | 'keyboard' | 'gamepad'>('menu')
    const [focusArea, setFocusArea]         = useState<FocusArea>('nav')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [footerIndex, setFooterIndex]     = useState(0)

    const [emulators, setEmulators]         = useState<Emulator[]>([])
    const [emuForm, setEmuForm]             = useState<EmulatorForm>(EMPTY_EMU)
    const [editingEmuId, setEditingEmuId]   = useState<string | null>(null)
    const [emuError, setEmuError]           = useState<string | null>(null)
    const [emuSaving, setEmuSaving]         = useState(false)

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

    // ── Refs: always-fresh snapshots used inside the event handler ────────────
    const r = useRef({
        tab, controlsSubTab, focusArea, selectedIndex, footerIndex,
        emulators, keymaps, listeningKey, visible, onJumpToHeader,
        gridRows, gridCols, gridGap, gridAspect
    })
    useEffect(() => {
        r.current = { tab, controlsSubTab, focusArea, selectedIndex, footerIndex, emulators, keymaps, listeningKey, visible, onJumpToHeader, gridRows, gridCols, gridGap, gridAspect }
    })

    // ── Load / reset when panel opens ─────────────────────────────────────────
    useEffect(() => {
        if (!visible) return
        window.api.emulators.getAll().then(setEmulators)
        window.api.keymaps.getAll().then(setKeymaps)
        setFocusArea('nav')
        setTab('emulators')
        setSelectedIndex(0)
        setFooterIndex(0)
        setListeningKey(null)
        // Sync grid from parent
        if (gridConfig) {
            setGridRows(gridConfig.rows)
            setGridCols(gridConfig.cols)
            setGridGap(gridConfig.gap)
            setGridAspect(gridConfig.aspectRatio)
        }
        setGridDirty(false)
    }, [visible])

    // ── Reset per-tab state on tab switch ─────────────────────────────────────
    // ── Reset per-tab state on tab switch ─────────────────────────────────────
    useEffect(() => {
        setSelectedIndex(0)
        setFooterIndex(0)
        setListeningKey(null)
        setControlsSubTab('menu')
    }, [tab])

    // ── Reset scroll on tab or sub-tab switch ──────────────────────────────────
    useEffect(() => {
        const container = document.querySelector('.console-panel__content-body')
        if (container) container.scrollTop = 0
    }, [tab, controlsSubTab])


    // ── Reset footerIndex when navigating away from footer ────────────────────
    useEffect(() => {
        if (focusArea !== 'footer') setFooterIndex(0)
    }, [focusArea])

    // ── Key capture for remapping ─────────────────────────────────────────────
    useEffect(() => {
        if (!listeningKey) return
        const handleKey = (e: KeyboardEvent) => {
            e.preventDefault()
            setKeymaps(prev => ({ ...prev, [listeningKey]: e.key === ' ' ? 'Space' : e.key }))
            setKeymapDirty(true)
            setListeningKey(null)
            sfx.confirm()
        }
        window.addEventListener('keydown', handleKey, { once: true })
        return () => window.removeEventListener('keydown', handleKey)
    }, [listeningKey])

    // ── Auto-scroll: keep the focused row visible ─────────────────────────────
    useEffect(() => {
        if (focusArea !== 'content') return
        const container = document.querySelector<HTMLElement>('.console-panel__content-body')
        if (!container) return
        const el = container.querySelector<HTMLElement>('[data-focused="true"]')
        if (!el) return

        const crect = container.getBoundingClientRect()
        const erect = el.getBoundingClientRect()
        const margin = 32

        const relTop = erect.top - crect.top
        const relBot = erect.bottom - crect.top

        if (relTop < margin) {
            container.scrollBy({ top: relTop - margin, behavior: 'smooth' })
        } else if (relBot > container.clientHeight - margin) {
            container.scrollBy({ top: relBot - container.clientHeight + margin, behavior: 'smooth' })
        }
    }, [selectedIndex, focusArea])

    // ── Navigation handler — registered ONCE, reads state via `r.current` ─────
    useEffect(() => {
        const handler = (e: Event) => {
            const { visible: vis, tab: ct, controlsSubTab: cSub, focusArea: area, selectedIndex: idx,
                    footerIndex: fIdx, emulators: emus, keymaps: kms,
                    listeningKey: lKey } = r.current

            if (!vis) return
            // While remapping, ignore navigation
            if (lKey) return

            const action = (e as CustomEvent<string>).detail

            // ── Nav rail ──────────────────────────────────────────────────────
            if (area === 'nav') {
                const tabIdx = TAB_IDS.indexOf(ct)
                if (action === 'up') {
                    if (tabIdx > 0) { sfx.navigate(); setTab(TAB_IDS[tabIdx - 1]) }
                    else { sfx.navigate(); onJumpToHeader('left') }
                } else if (action === 'down') {
                    if (tabIdx < TAB_IDS.length - 1) { sfx.navigate(); setTab(TAB_IDS[tabIdx + 1]) }
                    else { sfx.navigate(); setFocusArea('nav_close') }
                } else if (action === 'right' || action === 'select') {
                    sfx.navigate(); setFocusArea('content')
                } else if (action === 'back') {
                    sfx.cancel(); onClose()
                }
                return
            }

            // ── Close button ──────────────────────────────────────────────────
            if (area === 'nav_close') {
                if (action === 'up') {
                    sfx.navigate(); setFocusArea('nav'); setTab(TAB_IDS[TAB_IDS.length - 1])
                } else if (action === 'down') {
                    sfx.navigate(); setFocusArea('nav'); setTab(TAB_IDS[0])
                } else if (action === 'right') {
                    sfx.navigate(); setFocusArea('content')
                } else if (action === 'select' || action === 'back') {
                    sfx.cancel(); onClose()
                }
                return
            }

            // ── Content list ──────────────────────────────────────────────────
            if (area === 'content') {
                let count = 0
                const hasFooter = ct === 'controls'

                if (ct === 'emulators') {
                    count = emus.length + 1
                } else if (ct === 'controls') {
                    if (cSub === 'menu') count = 2
                    else if (cSub === 'keyboard') count = KEYBOARD_KEYS.length + 1 // +1 for Back button
                    else if (cSub === 'gamepad') count = 1 // just back button for now
                }

                if (action === 'up') {
                    if (idx === 0) {
                        sfx.navigate()
                        if (hasFooter) { setFocusArea('footer') }
                        else { setFocusArea('nav') }
                    } else {
                        sfx.navigate()
                        setSelectedIndex(idx - 1)
                    }
                } else if (action === 'down') {
                    if (idx < count - 1) {
                        sfx.navigate()
                        setSelectedIndex(idx + 1)
                    } else if (hasFooter) {
                        sfx.navigate(); setFocusArea('footer')
                    }
                } else if (action === 'left' || action === 'back') {
                    sfx.navigate()
                    if (ct === 'controls' && cSub !== 'menu') setControlsSubTab('menu')
                    else setFocusArea('nav')
                } else if (action === 'select') {
                    if (ct === 'emulators') {
                        if (idx < emus.length) {
                            setEmuForm({ name: emus[idx].name, path: emus[idx].path, args: emus[idx].args })
                            setEditingEmuId(emus[idx].id); setEmuError(null); sfx.confirm()
                            setSelectedIndex(emus.length)
                            setTimeout(() => document.querySelector<HTMLInputElement>('.cp-input')?.focus(), 50)
                        } else {
                            setTimeout(() => document.querySelector<HTMLInputElement>('.cp-input')?.focus(), 50)
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
                    sfx.navigate(); setFocusArea('content'); setSelectedIndex(0)
                } else if (action === 'left') {
                    if (fIdx > 0) { sfx.navigate(); setFooterIndex(fIdx - 1) }
                    else { sfx.navigate(); setFocusArea('nav') }
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

    // ── Emulator helpers ──────────────────────────────────────────────────────
    const resetEmuForm = () => {
        setEmuForm(EMPTY_EMU); setEditingEmuId(null); setEmuError(null)
        setSelectedIndex(emulators.length)
    }

    const handleBrowseEmulator = useCallback(async () => {
        const p = await window.api.browseFile({
            title: 'Seleccionar Ejecutable',
            filters: [{ name: 'Ejecutables', extensions: ['exe'] }, { name: 'Todos', extensions: ['*'] }]
        })
        if (p) setEmuForm(prev => ({ ...prev, path: p, name: prev.name || p.split('\\').pop()?.replace(/\.[^/.]+$/, '') || '' }))
    }, [])

    const handleEditEmulator = (emu: Emulator) => {
        setEmuForm({ name: emu.name, path: emu.path, args: emu.args })
        setEditingEmuId(emu.id); setEmuError(null); sfx.confirm()
    }

    const handleDeleteEmulator = async (id: string) => {
        sfx.cancel(); await window.api.emulators.remove(id)
        setEmulators(prev => prev.filter(e => e.id !== id))
    }

    const handleSaveEmulator = async () => {
        setEmuError(null)
        if (!emuForm.name.trim()) { sfx.error(); setEmuError('El nombre es obligatorio.'); return }
        if (!emuForm.path.trim()) { sfx.error(); setEmuError('La ruta es obligatoria.'); return }
        setEmuSaving(true)
        try {
            const emu: Emulator = {
                id: editingEmuId ?? `emu-${Date.now()}`,
                name: emuForm.name.trim(), path: emuForm.path.trim(),
                args: emuForm.args.trim() || '-g {roms}'
            }
            await window.api.emulators.save(emu)
            sfx.confirm()
            setEmulators(prev => {
                const i = prev.findIndex(e => e.id === emu.id)
                return i >= 0 ? prev.map(e => e.id === emu.id ? emu : e) : [...prev, emu]
            })
            resetEmuForm()
        } catch { setEmuError('Error al guardar.') } finally { setEmuSaving(false) }
    }

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

            {/* ══ Emuladores ══ */}
            {tab === 'emulators' && (
                <div className="cp-section">
                    {emulators.length > 0 ? (
                        <ul className="cp-list">
                            {emulators.map((emu, idx) => {
                                const fl = focusArea === 'content' && selectedIndex === idx
                                return (
                                    <li
                                        key={emu.id}
                                        data-focused={fl ? 'true' : undefined}
                                        className={`cp-list__item ${fl ? 'cp-list__item--focused' : ''}`}
                                        onClick={() => handleEditEmulator(emu)}
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
                                            <button className="cp-icon-btn cp-icon-btn--danger" title="Eliminar" onClick={e => { e.stopPropagation(); handleDeleteEmulator(emu.id) }}>
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
                            <span>Añade uno usando el formulario de abajo.</span>
                        </div>
                    )}

                    <div className="cp-form">
                        <div className="cp-form__title">
                            <Icon icon={editingEmuId ? 'mynaui:edit' : 'mynaui:plus'} />
                            {editingEmuId ? 'Editar emulador' : 'Añadir emulador'}
                        </div>
                        {emuError && <div className="cp-form__error"><Icon icon="mynaui:info-circle" />{emuError}</div>}
                        <input className="cp-input" type="text" placeholder="Nombre del emulador"
                            value={emuForm.name} onChange={e => setEmuForm(p => ({ ...p, name: e.target.value }))} disabled={emuSaving} />
                        <div className="cp-input-row">
                            <input className="cp-input" type="text" placeholder="Ruta al ejecutable (.exe)"
                                value={emuForm.path} onChange={e => setEmuForm(p => ({ ...p, path: e.target.value }))} disabled={emuSaving} />
                            <button className="cp-btn cp-btn--secondary cp-btn--icon" onClick={handleBrowseEmulator} disabled={emuSaving} title="Explorar">
                                <Icon icon="mynaui:folder-open" />
                            </button>
                        </div>
                        <input className="cp-input cp-input--mono" type="text" placeholder="Argumentos: usa {roms} para la ROM"
                            value={emuForm.args} onChange={e => setEmuForm(p => ({ ...p, args: e.target.value }))} disabled={emuSaving} />
                        <div className="cp-form__actions">
                            {editingEmuId && <button className="cp-btn cp-btn--ghost" onClick={resetEmuForm} disabled={emuSaving}>Cancelar</button>}
                            <button className="cp-btn cp-btn--primary" onClick={handleSaveEmulator} disabled={emuSaving}>
                                <Icon icon={editingEmuId ? 'mynaui:check' : 'mynaui:plus'} />
                                {emuSaving ? 'Guardando…' : editingEmuId ? 'Actualizar' : 'Añadir'}
                            </button>
                        </div>
                    </div>
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

