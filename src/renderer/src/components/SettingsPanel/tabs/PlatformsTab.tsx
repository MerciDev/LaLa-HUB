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
    isDeleteFocused: boolean
    onSyncPlatforms: (e: React.MouseEvent) => void
    onToggleExpand: () => void
    onPlatFieldChange: (field: keyof PlatformForm, value: string) => void
    onBrowsePlatImage: () => void
    onSavePlatform: () => void
    onResetForm: () => void
    onEditPlatform: (plat: Platform) => void
    onRemovePlatform: (id: string) => void
    onRemoveAllPlatforms: () => void
    onFocusDelete: (focused: boolean) => void
}

function PlatformsTab({
    focusArea, selectedIndex, isFocused,
    platForm, editingPlatId, platSaving, platSyncing, platError,
    platforms, sortedPlatforms, isDeleteFocused,
    onSyncPlatforms, onToggleExpand, onPlatFieldChange, onBrowsePlatImage,
    onSavePlatform, onResetForm, onEditPlatform, onRemovePlatform, onRemoveAllPlatforms, onFocusDelete
}: PlatformsTabProps) {
    const fl = (idx: number) => focusArea === 'content' && selectedIndex === idx

    return (
        <div className="cp-section">
            <div style={{ marginBottom: '24px', paddingLeft: '4px', display: 'flex', gap: '12px' }}>
                <button
                    className={`cp-btn cp-btn--primary ${fl(0) ? 'cp-btn--focused' : ''}`}
                    data-focused={fl(0) ? 'true' : undefined}
                    style={{ width: 'auto' }}
                    onClick={onSyncPlatforms}
                    disabled={platSyncing}
                >
                    <Icon icon={platSyncing ? 'mynaui:refresh' : 'mynaui:cloud-download'} className={platSyncing ? 'ag-spin' : ''} />
                    {platSyncing ? 'Sincronizando…' : 'Sincronizar'}
                </button>
                <button
                    className="cp-btn cp-btn--danger"
                    style={{ width: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemoveAllPlatforms()
                    }}
                    disabled={platSyncing || platforms.length === 0}
                >
                    <Icon icon="mynaui:trash" />
                    Eliminar todo
                </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '24px' }}>
                <button
                    className={`cp-btn cp-btn--primary ${fl(1) ? 'cp-btn--focused' : ''}`}
                    data-focused={fl(1) ? 'true' : undefined}
                    onClick={onToggleExpand}
                    style={{ width: 'auto' }}
                >
                    <Icon icon="mynaui:plus" />
                    Añadir Plataforma
                </button>
            </div>

            <div className="cp-divider" style={{ margin: '10px 0 30px' }} />

            {platforms.length === 0 ? (
                <div className="cp-empty">
                    <Icon icon="mynaui:ghost" className="cp-empty__icon" />
                    <p>No hay plataformas registradas todavía.</p>
                </div>
            ) : (
                <ul className="cp-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', border: 'none', background: 'transparent', padding: 0 }}>
                    {sortedPlatforms.map((plat, idx) => {
                        const offset = 2
                        const rowFocused = fl(offset + idx)
                        return (
                            <li key={plat.id} className="cp-list-row" 
                                style={{ 
                                    display: 'flex', 
                                    border: '1px solid var(--border-color, rgba(255,255,255,0.1))', 
                                    borderRadius: '12px', 
                                    background: 'var(--bg-secondary, rgba(255,255,255,0.03))', 
                                    position: 'relative',
                                    aspectRatio: '1/1',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s ease'
                                }}
                                onClick={() => onEditPlatform(plat)}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <div className={`cp-list__item ${rowFocused && !isDeleteFocused ? 'cp-list__item--focused' : ''}`}
                                    data-focused={rowFocused ? 'true' : undefined}
                                    data-last={idx === sortedPlatforms.length - 1 ? 'true' : undefined}
                                    style={{ borderBottom: 'none', padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                    
                                    <div className="cp-list__item-icon" style={{ width: '100%', height: 'calc(100% - 40px)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px', background: 'transparent', minHeight: 0 }}>
                                        {plat.consoleImage && plat.consoleImage.trim() !== '' ? (
                                            <img src={plat.consoleImage} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.3))' }} alt={plat.name} />
                                        ) : plat.icon && plat.icon.trim() !== '' ? (
                                            (plat.icon.includes(':') && !plat.icon.includes('/') && !plat.icon.includes('\\'))
                                            ? <Icon icon={plat.icon} style={{ fontSize: '96px' }} />
                                            : <img src={plat.icon} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />
                                        ) : <Icon icon="mynaui:ghost" style={{ fontSize: '96px' }} />}
                                    </div>
                                    <div className="cp-list__item-info" style={{ position: 'absolute', bottom: '12px', left: '0', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0px', pointerEvents: 'none' }}>
                                        <div className="cp-list__item-name" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{plat.name}</div>
                                        <div className="cp-list__item-sub" style={{ opacity: 0.7, fontSize: '0.9rem' }}>{plat.releaseDate || plat.company || 'Sin año'}</div>
                                    </div>
                                </div>
                                <button
                                    className={`cp-list-delete-btn ${rowFocused && isDeleteFocused ? 'focused' : ''}`}
                                    style={{ position: 'absolute', top: '8px', right: '8px', margin: 0, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
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
