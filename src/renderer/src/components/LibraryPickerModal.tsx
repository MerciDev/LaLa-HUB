import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Icon } from '@iconify/react'
import { HomeSlot } from '../../../shared/types'
import { sfx } from '../utils/audioManager'
import './LibraryPickerModal.css'

interface LibraryPickerModalProps {
    visible: boolean
    onClose: () => void
    onSelect: (slot: HomeSlot) => void
}

const PLATFORM_COLORS: Record<string, string> = {
    'pc': '#3a86ff',
    'windows': '#3a86ff',
    'steam': '#1b2838',
    'playstation': '#003791',
    'ps1': '#003791',
    'ps2': '#003791',
    'ps3': '#003791',
    'ps4': '#003791',
    'ps5': '#003791',
    'psp': '#003791',
    'vita': '#003791',
    'xbox': '#107c10',
    'nintendo': '#e60012',
    'nes': '#e60012',
    'snes': '#e60012',
    'n64': '#e60012',
    'gamecube': '#6d439b',
    'wii': '#009ac7',
    'switch': '#e60012',
    'sega': '#0050a0',
    'dreamcast': '#ff6600',
    'genesis': '#000000',
    'game boy': '#8b5cf6',
    'gba': '#581c87',
    'gbc': '#a855f7',
    'nds': '#4f46e5',
    '3ds': '#d946ef',
}

function getPlatformColor(name: string): string {
    const key = name.toLowerCase().trim()
    for (const [k, v] of Object.entries(PLATFORM_COLORS)) {
        if (key.includes(k)) return v
    }
    return '#8b5cf6'
}

function getPlatformIcon(name: string): string {
    const key = name.toLowerCase().trim()
    if (key.includes('pc') || key.includes('windows') || key.includes('steam')) return 'mynaui:monitor'
    if (key.includes('playstation') || key.includes('ps')) return 'mynaui:gamepad'
    if (key.includes('xbox')) return 'mynaui:grid'
    if (key.includes('switch') || key.includes('nintendo') || key.includes('wii') || key.includes('boy') || key.includes('ds')) return 'mynaui:terminal'
    return 'mynaui:disc'
}

function getPlatformName(slot: HomeSlot): string {
    return slot.game?.platform?.name || slot.game?.emulator?.name || (slot.game as any)?.console || 'PC'
}

function formatPlaytime(minutes?: number): string {
    if (!minutes || minutes <= 0) return 'Nuevo'
    if (minutes < 60) return `${minutes}m`
    const hrs = (minutes / 60).toFixed(1).replace('.0', '')
    return `${hrs}h`
}

export default function LibraryPickerModal({ visible, onClose, onSelect }: LibraryPickerModalProps): React.JSX.Element | null {
    const [slots, setSlots] = useState<HomeSlot[]>([])
    const [search, setSearch] = useState('')
    const [filterConsole, setFilterConsole] = useState('todas')
    const [focusArea, setFocusArea] = useState<'search' | 'consoles' | 'grid' | 'close'>('grid')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [consoleIndex, setConsoleIndex] = useState(0)

    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (visible) {
            window.api.slots?.getAll?.().then(res => setSlots(res || []))
            setSearch('')
            setFilterConsole('todas')
            setFocusArea('grid')
            setSelectedIndex(0)
            setConsoleIndex(0)
        }
    }, [visible])

    useEffect(() => {
        if (focusArea === 'search') {
            searchInputRef.current?.focus()
        } else {
            searchInputRef.current?.blur()
        }
    }, [focusArea])

    const consolesList = useMemo(() => {
        const set = new Set<string>()
        slots.forEach(s => {
            if (!s.game) return
            set.add(getPlatformName(s))
        })
        return ['todas', ...Array.from(set)]
    }, [slots])

    const consoleCounts = useMemo(() => {
        const map: Record<string, number> = { 'todas': 0 }
        slots.forEach(s => {
            if (!s.game) return
            map['todas'] = (map['todas'] || 0) + 1
            const p = getPlatformName(s)
            map[p] = (map[p] || 0) + 1
        })
        return map
    }, [slots])

    const filteredSlots = useMemo(() => {
        return slots.filter(s => {
            if (!s.game) return false
            if (filterConsole !== 'todas') {
                if (getPlatformName(s) !== filterConsole) return false
            }
            if (search) {
                const q = search.toLowerCase()
                const title = (s.label || s.game.name || '').toLowerCase()
                if (!title.includes(q)) return false
            }
            return true
        })
    }, [slots, filterConsole, search])

    const stateRef = useRef({
        visible, focusArea, selectedIndex, consoleIndex, consolesList, filteredSlots
    })
    useEffect(() => {
        stateRef.current = { visible, focusArea, selectedIndex, consoleIndex, consolesList, filteredSlots }
    })

    useEffect(() => {
        if (!visible) return
        const handler = (e: CustomEvent) => {
            const action = e.detail
            const { focusArea: area, selectedIndex: sIdx, consoleIndex: cIdx, consolesList: cList, filteredSlots: fSlots } = stateRef.current

            if (area === 'close') {
                if (action === 'down') { sfx.navigate(); setFocusArea('search') }
                else if (action === 'select' || action === 'back' || action === 'escape') { sfx.cancel(); onClose() }
                return
            }

            if (area === 'search') {
                if (action === 'up') { sfx.navigate(); setFocusArea('close') }
                else if (action === 'down') {
                    if (cList.length > 1) { sfx.navigate(); setFocusArea('consoles'); setConsoleIndex(0) }
                    else if (fSlots.length > 0) { sfx.navigate(); setFocusArea('grid'); setSelectedIndex(0) }
                }
                else if (action === 'select') { sfx.confirm(); searchInputRef.current?.focus() }
                else if (action === 'back' || action === 'escape') { sfx.cancel(); onClose() }
                return
            }

            if (area === 'consoles') {
                if (action === 'up') { sfx.navigate(); setFocusArea('search') }
                else if (action === 'down') {
                    if (fSlots.length > 0) { sfx.navigate(); setFocusArea('grid'); setSelectedIndex(0) }
                }
                else if (action === 'left') {
                    if (cIdx > 0) {
                        sfx.navigate()
                        const newIdx = cIdx - 1
                        setConsoleIndex(newIdx)
                        setFilterConsole(cList[newIdx])
                        setSelectedIndex(0)
                    }
                } else if (action === 'right') {
                    if (cIdx < cList.length - 1) {
                        sfx.navigate()
                        const newIdx = cIdx + 1
                        setConsoleIndex(newIdx)
                        setFilterConsole(cList[newIdx])
                        setSelectedIndex(0)
                    }
                } else if (action === 'back' || action === 'escape') {
                    sfx.navigate(); setFocusArea('search')
                }
                return
            }

            if (area === 'grid') {
                const cols = 4
                if (action === 'up') {
                    if (sIdx >= cols) { sfx.navigate(); setSelectedIndex(sIdx - cols) }
                    else { sfx.navigate(); setFocusArea(cList.length > 1 ? 'consoles' : 'search') }
                } else if (action === 'down') {
                    if (sIdx + cols < fSlots.length) { sfx.navigate(); setSelectedIndex(sIdx + cols) }
                } else if (action === 'left') {
                    if (sIdx % cols > 0) { sfx.navigate(); setSelectedIndex(sIdx - 1) }
                } else if (action === 'right') {
                    if ((sIdx + 1) % cols !== 0 && sIdx + 1 < fSlots.length) { sfx.navigate(); setSelectedIndex(sIdx + 1) }
                } else if (action === 'select') {
                    const chosen = fSlots[sIdx]
                    if (chosen) { sfx.confirm(); onSelect(chosen) }
                } else if (action === 'back' || action === 'escape') {
                    sfx.navigate()
                    setFocusArea(cList.length > 1 ? 'consoles' : 'search')
                }
            }
        }
        window.addEventListener('panel-move', handler as EventListener)
        return () => window.removeEventListener('panel-move', handler as EventListener)
    }, [visible, onClose, onSelect])

    useEffect(() => {
        if (focusArea !== 'grid') return
        const el = document.querySelector('.library-picker-card.focused') as HTMLElement
        if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, [selectedIndex, focusArea])

    if (!visible) return null

    const focusClass = (area: typeof focusArea) => focusArea === area ? 'focused' : ''

    return (
        <div className="library-picker-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Seleccionar de la Biblioteca">
            <div className="library-picker-modal" onClick={e => e.stopPropagation()} role="document">
                <div className="library-picker-header">
                    <h2 className="library-picker-title">
                        <div className="library-picker-title__icon">
                            <Icon icon="mynaui:folder" style={{ fontSize: '1.5rem' }} />
                        </div>
                        Biblioteca de Juegos
                    </h2>
                    <button
                        className={`library-picker-close ${focusClass('close')}`}
                        onClick={() => { sfx.cancel(); onClose() }}
                        tabIndex={-1}
                        aria-label="Cerrar"
                    >
                        <Icon icon="mynaui:x" />
                    </button>
                </div>

                <div className="library-picker-controls">
                    <div className="library-picker-search">
                        <Icon icon="mynaui:search" className="search-icon" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Buscar juego por título..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setSelectedIndex(0) }}
                            className={focusClass('search')}
                            tabIndex={-1}
                            aria-label="Buscar juego"
                        />
                        <span className="library-picker-search__hint">Pulsa A para escribir</span>
                    </div>
                </div>

                {consolesList.length > 1 && (
                    <div className="library-picker-consoles" role="tablist" aria-label="Filtrar por consola">
                        {consolesList.map((c, idx) => {
                            const count = consoleCounts[c] ?? 0
                            const isActive = filterConsole === c
                            const isFocused = focusArea === 'consoles' && consoleIndex === idx
                            return (
                                <button
                                    key={c}
                                    className={`console-chip ${isActive ? 'active' : ''} ${isFocused ? 'focused' : ''}`}
                                    onClick={() => { sfx.confirm(); setFilterConsole(c); setConsoleIndex(idx); setSelectedIndex(0) }}
                                    role="tab"
                                    aria-selected={isActive}
                                    tabIndex={-1}
                                >
                                    {c !== 'todas' ? (
                                        <Icon icon={getPlatformIcon(c)} style={{ fontSize: '1.1rem', color: isActive ? '#fff' : getPlatformColor(c) }} />
                                    ) : (
                                        <Icon icon="mynaui:grid" style={{ fontSize: '1.1rem' }} />
                                    )}
                                    <span>{c}</span>
                                    <span className="console-chip__count">{count}</span>
                                </button>
                            )
                        })}
                    </div>
                )}

                <div className="library-picker-grid" role="listbox" aria-label="Juegos disponibles">
                    {filteredSlots.length === 0 ? (
                        <div className="library-picker-empty">
                            <Icon icon="mynaui:folder-minus" className="library-picker-empty__icon" />
                            <p className="library-picker-empty__text">No se encontraron juegos con los filtros actuales</p>
                        </div>
                    ) : (
                        filteredSlots.map((s, idx) => {
                            const pName = getPlatformName(s)
                            const pColor = getPlatformColor(pName)
                            const isFocused = focusArea === 'grid' && selectedIndex === idx
                            const imageUrl = s.squareImage || s.image || s.game?.images?.home || s.game?.images?.logo
                            const playtime = (s.game as any)?.playtimeMinutes || (s as any)?.playtimeMinutes || 0

                            return (
                                <div
                                    key={s.id}
                                    className={`library-picker-card ${isFocused ? 'focused' : ''}`}
                                    onClick={() => { sfx.confirm(); onSelect(s) }}
                                    role="option"
                                    aria-selected={isFocused}
                                    tabIndex={-1}
                                    style={{ '--card-accent': pColor } as React.CSSProperties}
                                >
                                    <div
                                        className="library-picker-card__img"
                                        style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
                                    >
                                        {!imageUrl && (
                                            <div className="library-picker-card__placeholder">
                                                <Icon icon={getPlatformIcon(pName)} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="library-picker-card__info">
                                        <span className="library-picker-card__title">{s.label || s.game?.name}</span>
                                        <div className="library-picker-card__meta">
                                            <span className="library-picker-card__platform" style={{ borderLeft: `3px solid ${pColor}` }}>
                                                {pName}
                                            </span>
                                            <span className="library-picker-card__playtime">
                                                <Icon icon="mynaui:clock" />
                                                {formatPlaytime(playtime)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
