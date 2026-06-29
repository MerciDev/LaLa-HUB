import React from 'react'
import { Icon } from '@iconify/react'
import { Platform } from '../../../../../shared/types'
import { PlatformForm } from '../types'

interface PlatformsTabProps {
    focusArea: string
    selectedIndex: number
    isFocused: (area: string, idx: number) => boolean
    platForm: PlatformForm
    editingPlatId: string | null
    platSaving: boolean
    platSyncing: boolean
    platError: string | null
    platforms: Platform[]
    sortedPlatforms: Platform[]
    isPlatFormExpanded: boolean
    isDeleteFocused: boolean
    onSyncPlatforms: (e: React.MouseEvent) => void
    onToggleExpand: () => void
    onPlatFieldChange: (field: keyof PlatformForm, value: string) => void
    onBrowsePlatImage: () => void
    onSavePlatform: () => void
    onResetForm: () => void
    onEditPlatform: (plat: Platform) => void
    onRemovePlatform: (id: string) => void
    onFocusDelete: (focused: boolean) => void
}

function PlatformsTab({
    focusArea, selectedIndex, isFocused,
    platForm, editingPlatId, platSaving, platSyncing, platError,
    platforms, sortedPlatforms, isPlatFormExpanded, isDeleteFocused,
    onSyncPlatforms, onToggleExpand, onPlatFieldChange, onBrowsePlatImage,
    onSavePlatform, onResetForm, onEditPlatform, onRemovePlatform, onFocusDelete
}: PlatformsTabProps) {
    const fl = (idx: number) => focusArea === 'content' && selectedIndex === idx

    return (
        <div className="cp-section">
            <div style={{ marginBottom: '24px', paddingLeft: '4px' }}>
                <button
                    className={`cp-btn cp-btn--secondary ${fl(0) ? 'cp-btn--focused' : ''}`}
                    data-focused={fl(0) ? 'true' : undefined}
                    style={{ width: 'auto' }}
                    onClick={onSyncPlatforms}
                    disabled={platSyncing}
                >
                    <Icon icon={platSyncing ? 'mynaui:refresh' : 'mynaui:api'} className={platSyncing ? 'ag-spin' : ''} />
                    {platSyncing ? 'Sincronizando…' : 'Refrescar API'}
                </button>
            </div>

            <div className={`cp-accordion ${isPlatFormExpanded ? 'cp-accordion--expanded' : ''}`}>
                <button
                    className={`cp-accordion__header ${fl(1) ? 'cp-accordion__header--focused' : ''}`}
                    data-focused={fl(1) ? 'true' : undefined}
                    onClick={onToggleExpand}
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

                        <div className={`ag-field-row ${fl(2) && isPlatFormExpanded ? 'ag-field-row--focused' : ''}`}
                             data-focused={fl(2) && isPlatFormExpanded ? 'true' : undefined}
                             onClick={() => { onFocusDelete(false); document.getElementById('plat-id')?.focus() }}>
                            <Icon icon="mynaui:id" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">ID de la Plataforma (Identificador único)</div>
                                <input id="plat-id" className="ag-field-input" type="text" placeholder="Ej. ps2, n64, custom-system..."
                                       value={platForm.id} onChange={e => onPlatFieldChange('id', e.target.value)} disabled={platSaving} />
                            </div>
                        </div>

                        <div className={`ag-field-row ${fl(3) && isPlatFormExpanded ? 'ag-field-row--focused' : ''}`}
                             data-focused={fl(3) && isPlatFormExpanded ? 'true' : undefined}
                             onClick={() => { onFocusDelete(false); document.getElementById('plat-name')?.focus() }}>
                            <Icon icon="mynaui:tag" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Nombre de la Plataforma</div>
                                <input id="plat-name" className="ag-field-input" type="text" placeholder="Ej. PlayStation 2, Nintendo 64..."
                                       value={platForm.name} onChange={e => onPlatFieldChange('name', e.target.value)} disabled={platSaving} />
                            </div>
                        </div>

                        <div className={`ag-field-row ${fl(4) && isPlatFormExpanded ? 'ag-field-row--focused' : ''}`}
                             data-focused={fl(4) && isPlatFormExpanded ? 'true' : undefined}
                             onClick={() => { onFocusDelete(false); document.getElementById('plat-icon')?.focus() }}>
                            <Icon icon="mynaui:grid" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Icono (Iconify)</div>
                                <input id="plat-icon" className="ag-field-input" type="text" placeholder="Ej. mdi:nintendo-switch, logos:playstation..."
                                       value={platForm.icon} onChange={e => onPlatFieldChange('icon', e.target.value)} disabled={platSaving} />
                            </div>
                        </div>

                        <div className={`ag-field-row ${fl(6) && isPlatFormExpanded ? 'ag-field-row--focused' : ''}`}
                             data-focused={fl(6) && isPlatFormExpanded ? 'true' : undefined}
                             onClick={onBrowsePlatImage}>
                            <Icon icon="mynaui:image" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Imagen de Fondo / Logo</div>
                                <input id="plat-image" className="ag-field-input" type="text" placeholder="Seleccionar archivo..."
                                       value={platForm.image} readOnly disabled />
                            </div>
                        </div>

                        <div className={`ag-field-row ${fl(8) && isPlatFormExpanded ? 'ag-field-row--focused' : ''}`}
                             data-focused={fl(8) && isPlatFormExpanded ? 'true' : undefined}
                             onClick={() => { onFocusDelete(false); document.getElementById('plat-company')?.focus() }}>
                            <Icon icon="mynaui:briefcase" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Empresa / Fabricante</div>
                                <input id="plat-company" className="ag-field-input" type="text" placeholder="Ej. Sony, Nintendo, Sega..."
                                       value={platForm.company} onChange={e => onPlatFieldChange('company', e.target.value)} disabled={platSaving} />
                            </div>
                        </div>

                        <div className="cp-form__actions">
                            {editingPlatId ? (
                                <>
                                    <button className={`cp-btn cp-btn--ghost ${fl(10) && isPlatFormExpanded ? 'cp-btn--focused' : ''}`}
                                            data-focused={fl(10) && isPlatFormExpanded ? 'true' : undefined}
                                            data-last={platforms.length === 0 ? 'true' : undefined}
                                            onClick={onResetForm} disabled={platSaving}>Cancelar</button>
                                    <button className={`cp-btn cp-btn--primary ${fl(9) && isPlatFormExpanded ? 'cp-btn--focused' : ''}`}
                                            data-focused={fl(9) && isPlatFormExpanded ? 'true' : undefined}
                                            onClick={onSavePlatform} disabled={platSaving}>
                                        <Icon icon="mynaui:check" />
                                        {platSaving ? 'Guardando…' : 'Actualizar'}
                                    </button>
                                </>
                            ) : (
                                <button className={`cp-btn cp-btn--primary ${fl(9) && isPlatFormExpanded ? 'cp-btn--focused' : ''}`}
                                        data-focused={fl(9) && isPlatFormExpanded ? 'true' : undefined}
                                        data-last={platforms.length === 0 && !editingPlatId ? 'true' : undefined}
                                        onClick={onSavePlatform} disabled={platSaving}>
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
                        const rowFocused = fl(offset + idx)
                        return (
                            <li key={plat.id} className="cp-list-row">
                                <div className={`cp-list__item ${rowFocused && !isDeleteFocused ? 'cp-list__item--focused' : ''}`}
                                    data-focused={rowFocused ? 'true' : undefined}
                                    data-last={idx === sortedPlatforms.length - 1 ? 'true' : undefined}
                                    onClick={() => onEditPlatform(plat)}>
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
                                    className={`cp-list-delete-btn ${rowFocused && isDeleteFocused ? 'focused' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); onRemovePlatform(plat.id) }}
                                >
                                    <Icon icon="mynaui:trash" />
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

export default PlatformsTab
