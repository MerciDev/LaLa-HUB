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

export default function LibraryPickerModal({ visible, onClose, onSelect }: LibraryPickerModalProps): React.JSX.Element | null {
    const [slots, setSlots] = useState<HomeSlot[]>([])
    const [search, setSearch] = useState('')
    const [filterConsole, setFilterConsole] = useState('todas')
    const [focusArea, setFocusArea] = useState<'search' | 'consoles' | 'grid' | 'close'>('grid')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [consoleIndex, setConsoleIndex] = useState(0)

    useEffect(() => {
        if (visible) {
            window.api.slots?.getAll?.().then(res => setSlots(res || []))
            setSearch('')
            setFilterConsole('todas')
            setFocusArea('grid')
            setSelectedIndex(0)
        }
    }, [visible])

    const consolesList = useMemo(() => {
        const set = new Set<string>()
        slots.forEach(s => {
            if (!s.game) return
            const name = s.game.platform?.name || s.game.emulator?.name || 'PC'
            set.add(name)
        })
        return ['todas', ...Array.from(set)]
    }, [slots])

    const filteredSlots = useMemo(() => {
        return slots.filter(s => {
            if (!s.game) return false
            if (filterConsole !== 'todas') {
                const cName = s.game.platform?.name || s.game.emulator?.name || 'PC'
                if (cName !== filterConsole) return false
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
                else if (action === 'select') { sfx.cancel(); onClose() }
                else if (action === 'back' || action === 'escape') { sfx.cancel(); onClose() }
                return
            }

            if (area === 'search') {
                if (action === 'up') { sfx.navigate(); setFocusArea('close') }
                else if (action === 'down') { sfx.navigate(); setFocusArea('consoles'); setConsoleIndex(0) }
                else if (action === 'select') { sfx.confirm(); (document.querySelector('.library-picker-search input') as HTMLInputElement)?.focus() }
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
                    }
                } else if (action === 'right') {
                    if (cIdx < cList.length - 1) {
                        sfx.navigate()
                        const newIdx = cIdx + 1
                        setConsoleIndex(newIdx)
                        setFilterConsole(cList[newIdx])
                    }
                } else if (action === 'back' || action === 'escape') { sfx.cancel(); onClose() }
                return
            }

            if (area === 'grid') {
                const cols = 4
                if (action === 'up') {
                    if (sIdx >= cols) { sfx.navigate(); setSelectedIndex(sIdx - cols) }
                    else { sfx.navigate(); setFocusArea('consoles') }
                } else if (action === 'down') {
                    if (sIdx + cols < fSlots.length) { sfx.navigate(); setSelectedIndex(sIdx + cols) }
                } else if (action === 'left') {
                    if (sIdx % cols > 0) { sfx.navigate(); setSelectedIndex(sIdx - 1) }
                } else if (action === 'right') {
                    if ((sIdx + 1) % cols !== 0 && sIdx + 1 < fSlots.length) { sfx.navigate(); setSelectedIndex(sIdx + 1) }
                } else if (action === 'select') {
                    const chosen = fSlots[sIdx]
                    if (chosen) { sfx.confirm(); onSelect(chosen) }
                } else if (action === 'back' || action === 'escape') { sfx.cancel(); onClose() }
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

    return (
        <div className="library-picker-overlay" onClick={onClose}>
            <div className="library-picker-modal" onClick={e => e.stopPropagation()}>
                <div className="library-picker-header">
                    <h2 className="library-picker-title">
                        <Icon icon="mynaui:folder" style={{ color: '#3a86ff' }} />
                        Seleccionar de la Biblioteca
                    </h2>
                    <button
                        className={`library-picker-close ${focusArea === 'close' ? 'focused' : ''}`}
                        onClick={() => { sfx.cancel(); onClose() }}
                    >
                        <Icon icon="mynaui:x" />
                    </button>
                </div>

                <div className="library-picker-controls">
                    <div className="library-picker-search">
                        <Icon icon="mynaui:search" />
                        <input
                            type="text"
                            placeholder="Buscar juego..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={focusArea === 'search' ? 'focused' : ''}
                        />
                    </div>
                </div>

                {consolesList.length > 1 && (
                    <div style={{ padding: '0 32px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
                        {consolesList.map((c, idx) => (
                            <button
                                key={c}
                                onClick={() => { sfx.confirm(); setFilterConsole(c); setConsoleIndex(idx) }}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: filterConsole === c ? '#3a86ff' : (focusArea === 'consoles' && consoleIndex === idx ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)'),
                                    color: '#fff',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    textTransform: 'capitalize',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                )}

                <div className="library-picker-grid">
                    {filteredSlots.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
                            <Icon icon="mynaui:folder-minus" style={{ fontSize: '3rem', marginBottom: 12 }} />
                            <p style={{ margin: 0 }}>No hay juegos disponibles en tu biblioteca</p>
                        </div>
                    ) : (
                        filteredSlots.map((s, idx) => (
                            <div
                                key={s.id}
                                className={`library-picker-card ${focusArea === 'grid' && selectedIndex === idx ? 'focused' : ''}`}
                                onClick={() => { sfx.confirm(); onSelect(s) }}
                            >
                                <div
                                    className="library-picker-card__img"
                                    style={{ backgroundImage: `url("${s.image || s.squareImage || ''}")` }}
                                >
                                    {!s.image && !s.squareImage && (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
                                            <Icon icon="mynaui:gamepad" style={{ fontSize: '2.5rem' }} />
                                        </div>
                                    )}
                                </div>
                                <div className="library-picker-card__info">
                                    <span className="library-picker-card__title">{s.label || s.game?.name}</span>
                                    <span className="library-picker-card__platform">{s.game?.platform?.name || s.game?.emulator?.name || 'PC'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
