import React from 'react'
import { Icon } from '@iconify/react'
import { Platform, Emulator } from '../../../../../shared/types'
import { EmulatorForm } from '../types'

interface EmulatorsTabProps {
    focusArea: string
    selectedIndex: number
    emuForm: EmulatorForm
    editingEmuId: string | null
    emuSaving: boolean
    emuError: string | null
    emulators: Emulator[]
    platforms: Platform[]
    sortedPlatforms: Platform[]
    isEmuPlatMenuOpen: boolean
    emuPlatMenuHoverIndex: number
    onEmuFieldChange: (field: keyof EmulatorForm, value: any) => void
    onBrowseEmulator: () => void
    onSaveEmulator: () => void
    onResetForm: () => void
    onEditEmulator: (emu: Emulator) => void
    onRemoveEmulator: (id: string) => void
    onTogglePlatMenu: () => void
    onPlatMenuHover: (idx: number) => void
    onPlatMenuSelect: (platId: string, isSelected: boolean) => void
}

function EmulatorsTab({
    focusArea, selectedIndex,
    emuForm, editingEmuId, emuSaving, emuError,
    emulators, platforms, sortedPlatforms,
    isEmuPlatMenuOpen, emuPlatMenuHoverIndex,
    onEmuFieldChange, onBrowseEmulator, onSaveEmulator, onResetForm,
    onEditEmulator, onRemoveEmulator, onTogglePlatMenu,
    onPlatMenuHover, onPlatMenuSelect
}: EmulatorsTabProps) {
    const fl = (idx: number) => focusArea === 'content' && selectedIndex === idx

    return (
        <div className="cp-section">
            <div className="cp-form" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                <div className="cp-form__title" style={{ marginBottom: '16px', paddingLeft: '4px' }}>
                    <Icon icon={editingEmuId ? 'mynaui:edit' : 'mynaui:plus'} />
                    {editingEmuId ? 'Editar emulador' : 'Añadir emulador'}
                </div>

                {emuError && <div className="cp-form__error" style={{ marginBottom: '12px' }}><Icon icon="mynaui:info-circle" />{emuError}</div>}

                <div className={`ag-field-row ${fl(0) ? 'ag-field-row--focused' : ''}`}
                     data-focused={fl(0) ? 'true' : undefined}
                     onClick={() => document.getElementById('emu-name')?.focus()}>
                    <Icon icon="mynaui:edit-one" className="ag-field-icon" />
                    <div className="ag-field-body">
                        <div className="ag-field-label">Nombre del Emulador</div>
                        <input id="emu-name" className="ag-field-input" type="text" placeholder="Ej. PCSX2, Dolphin..."
                               value={emuForm.name} onChange={e => onEmuFieldChange('name', e.target.value)} disabled={emuSaving} />
                    </div>
                </div>

                <div className={`ag-field-row ${fl(1) ? 'ag-field-row--focused' : ''}`}
                     data-focused={fl(1) ? 'true' : undefined}
                     onClick={onBrowseEmulator}>
                    <Icon icon="mynaui:file" className="ag-field-icon" />
                    <div className="ag-field-body">
                        <div className="ag-field-label">Ruta al ejecutable (.exe)</div>
                        <input id="emu-path" className="ag-field-input" type="text" placeholder="Seleccionar archivo..."
                               value={emuForm.path} readOnly disabled />
                    </div>
                </div>

                <div className={`ag-field-row ${fl(2) ? 'ag-field-row--focused' : ''} ${isEmuPlatMenuOpen ? 'ag-field-row--menu-open' : ''}`}
                     data-focused={fl(2) ? 'true' : undefined}
                     onClick={onTogglePlatMenu}>
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
                                            const isHover = emuPlatMenuHoverIndex === pIdx
                                            return (
                                                <div key={p.id} id={`ag-emu-plat-opt-${pIdx}`}
                                                     className={`ag-custom-select__option ${isSelected ? 'selected' : ''} ${isHover ? 'active' : ''}`}
                                                     onMouseEnter={() => onPlatMenuHover(pIdx)}
                                                     onClick={() => onPlatMenuSelect(p.id, isSelected)}>
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

                <div className={`ag-field-row ${fl(3) ? 'ag-field-row--focused' : ''}`}
                     data-focused={fl(3) ? 'true' : undefined}
                     onClick={() => document.getElementById('emu-args')?.focus()}>
                    <Icon icon="mynaui:terminal" className="ag-field-icon" />
                    <div className="ag-field-body">
                        <div className="ag-field-label">Argumentos de ejecución</div>
                        <input id="emu-args" className="ag-field-input" style={{ fontFamily: 'monospace' }} type="text"
                               placeholder="Usa {roms} para indicar la posición de la ROM"
                               value={emuForm.args} onChange={e => onEmuFieldChange('args', e.target.value)} disabled={emuSaving} />
                    </div>
                </div>

                <div className="cp-form__actions">
                    {editingEmuId && (
                        <button className={`cp-btn cp-btn--ghost ${fl(4) ? 'cp-btn--focused' : ''}`}
                                data-focused={fl(4) ? 'true' : undefined}
                                onClick={onResetForm} disabled={emuSaving}>
                            Cancelar
                        </button>
                    )}
                    <button className={`cp-btn cp-btn--primary ${fl(editingEmuId ? 5 : 4) ? 'cp-btn--focused' : ''}`}
                            data-focused={fl(editingEmuId ? 5 : 4) ? 'true' : undefined}
                            data-last={emulators.length === 0 ? 'true' : undefined}
                            onClick={onSaveEmulator} disabled={emuSaving}>
                        <Icon icon={editingEmuId ? 'mynaui:check' : 'mynaui:plus'} />
                        {emuSaving ? 'Guardando…' : editingEmuId ? 'Actualizar' : 'Añadir'}
                    </button>
                </div>
            </div>

            <div className="cp-divider" style={{ margin: '30px 0' }} />

            {emulators.length > 0 ? (
                <ul className="cp-list">
                    {emulators.map((emu, idx) => {
                        const emuOffset = editingEmuId ? 6 : 5
                        const rowFocused = fl(emuOffset + idx)
                        return (
                            <li key={emu.id} data-focused={rowFocused ? 'true' : undefined}
                                data-last={idx === emulators.length - 1 ? 'true' : undefined}
                                className={`cp-list__item ${rowFocused ? 'cp-list__item--focused' : ''}`}
                                onClick={() => { onEditEmulator(emu) }}>
                                <div className="cp-list__item-icon"><Icon icon="mynaui:chip" /></div>
                                <div className="cp-list__item-info">
                                    <span className="cp-list__item-name">{emu.name}</span>
                                    <span className="cp-list__item-sub" title={emu.path}>{emu.path}</span>
                                </div>
                                <div className="cp-list__item-actions">
                                    <button className="cp-icon-btn" title="Editar" onClick={e => { e.stopPropagation(); onEditEmulator(emu) }}>
                                        <Icon icon="mynaui:edit" />
                                    </button>
                                    <button className="cp-icon-btn cp-icon-btn--danger" title="Eliminar" onClick={e => { e.stopPropagation(); onRemoveEmulator(emu.id) }}>
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
    )
}

export default EmulatorsTab
