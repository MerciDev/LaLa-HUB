import React from 'react'
import { Icon } from '@iconify/react'
import { HomeSlot } from '../../../../../shared/types'
import { TabSharedProps } from '../types'

interface LibraryTabProps extends TabSharedProps {
    librarySlots: HomeSlot[]
    libSearch: string
    libFilterConsole: string
    consolesList: string[]
    filteredLibSlots: HomeSlot[]
    autoSync: boolean
    syncingCloud: boolean
    hasPremiumAccess: boolean
    hasAddGame: boolean
    expandedGameId: string | null
    error: string | null
    onToggleAutoSync: () => void
    onPushCloud: () => void
    onPullCloud: () => void
    onAddGame: () => void
    onSearchChange: (value: string) => void
    onFilterConsole: (consoleName: string) => void
    onSelectGame: (slot: HomeSlot) => void
    onRunGame: (slot: HomeSlot) => void
    onEditGame: (slot: HomeSlot) => void
    onDeleteGame: (slot: HomeSlot) => void
    onCloseGameActions: () => void
    isGameActionFocused: (actionIdx: number) => boolean
    onClose: () => void
}

function LibraryTab({ focusArea, selectedIndex, isFocused, filteredLibSlots, libSearch, autoSync, syncingCloud, hasPremiumAccess, hasAddGame, expandedGameId, error, consolesList, libFilterConsole, onToggleAutoSync, onPushCloud, onPullCloud, onAddGame, onSearchChange, onFilterConsole, onSelectGame, onRunGame, onEditGame, onDeleteGame, isGameActionFocused, onClose }: LibraryTabProps) {
    const searchIdx = hasAddGame ? 4 : 3
    const consolesStart = searchIdx + 1
    const consolesEnd = consolesStart + consolesList.length - 1

    return (
        <div className="profile-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100%', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Icon icon="mynaui:cloud" style={{ color: 'var(--accent)' }} /> 
                            Sincronización Cloud
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {hasPremiumAccess ? 'Respalda automáticamente tu biblioteca y rutas de juegos' : 'Disponible para cuentas Partner, Admin y Moderator'}
                        </span>
                    </div>
                    <div 
                        className={`profile-toggle ${isFocused('content', 0) ? 'focused' : ''}`}
                        style={{ 
                            width: 44, height: 24, borderRadius: 12, 
                            background: autoSync ? 'var(--accent)' : 'rgba(255,255,255,0.1)', 
                            position: 'relative', cursor: hasPremiumAccess ? 'pointer' : 'not-allowed', transition: '0.3s',
                            opacity: hasPremiumAccess ? 1 : 0.5
                        }}
                        onClick={onToggleAutoSync}
                    >
                        <div style={{ 
                            width: 20, height: 20, borderRadius: '50%', background: '#fff', 
                            position: 'absolute', top: 2, left: autoSync ? 22 : 2, transition: '0.3s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        disabled={syncingCloud || !hasPremiumAccess}
                        title={!hasPremiumAccess ? 'Solo disponible para Partner, Admin y Moderator' : undefined}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 10,
                            background: isFocused('content', 1) ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                            border: isFocused('content', 1) ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                            color: 'var(--text)', fontSize: 13, fontWeight: 600,
                            cursor: (syncingCloud || !hasPremiumAccess) ? 'not-allowed' : 'pointer',
                            opacity: hasPremiumAccess ? 1 : 0.4
                        }}
                        onClick={onPushCloud}
                    >
                        <Icon icon={syncingCloud ? "mynaui:spinner" : (hasPremiumAccess ? "mynaui:cloud-up" : "mynaui:lock")} className={syncingCloud ? "profile-spin" : ""} style={{ fontSize: 18, color: 'var(--accent)' }} />
                        Subir a la Nube
                    </button>
                    <button
                        disabled={syncingCloud || !hasPremiumAccess}
                        title={!hasPremiumAccess ? 'Solo disponible para Partner, Admin y Moderator' : undefined}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 10,
                            background: isFocused('content', 2) ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                            border: isFocused('content', 2) ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                            color: 'var(--text)', fontSize: 13, fontWeight: 600,
                            cursor: (syncingCloud || !hasPremiumAccess) ? 'not-allowed' : 'pointer',
                            opacity: hasPremiumAccess ? 1 : 0.4
                        }}
                        onClick={onPullCloud}
                    >
                        <Icon icon={syncingCloud ? "mynaui:spinner" : (hasPremiumAccess ? "mynaui:cloud-down" : "mynaui:lock")} className={syncingCloud ? "profile-spin" : ""} style={{ fontSize: 18, color: '#4ade80' }} />
                        Descargar de la Nube
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon icon="mynaui:folder" style={{ color: 'var(--text-muted)' }} />
                    Juegos Locales ({filteredLibSlots.length})
                </span>
                {hasAddGame && (
                    <button
                        className={`cp-btn cp-btn--primary ${isFocused('content', 3) ? 'cp-btn--focused' : ''}`}
                        style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: 8 }}
                        onClick={onAddGame}
                        title="Añadir nuevo juego a la biblioteca"
                    >
                        <Icon icon="mynaui:plus" /> Añadir Juego
                    </button>
                )}
            </div>

            <div className="profile-field-group" style={{ marginBottom: 4 }}>
                <div className={`profile-input-wrap ${isFocused('content', searchIdx) ? 'focused' : ''}`}>
                    <input
                        type="text"
                        className="profile-input"
                        placeholder="Buscar juego por título..."
                        value={libSearch}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={() => {}}
                    />
                    <Icon icon="mynaui:search" className="profile-input-icon" />
                </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {consolesList.map((c, idx) => (
                    <button
                        key={c}
                        className={`cp-btn cp-btn--${libFilterConsole === c ? 'primary' : 'secondary'} ${isFocused('content', consolesStart + idx) ? 'cp-btn--focused' : ''}`}
                        style={{ padding: '5px 12px', fontSize: '0.75rem', borderRadius: 20, textTransform: 'capitalize' }}
                        onClick={() => onFilterConsole(c)}
                    >
                        {c}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 150, overflowY: 'auto', paddingRight: 4, marginBottom: 16 }}>
                {filteredLibSlots.length === 0 ? (
                    <p className="profile-section-desc" style={{ textAlign: 'center', padding: '24px 0' }}>No se encontraron juegos con estos filtros.</p>
                ) : (
                    filteredLibSlots.map((s, idx) => {
                        const isExpanded = expandedGameId === s.id
                        const isRowFocused = isFocused('content', consolesEnd + 1 + idx)
                        return (
                        <div 
                            key={s.id} 
                            className={`cp-list__item ${isRowFocused || isExpanded ? 'cp-list__item--focused' : ''}`} 
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(15, 18, 25, 0.8)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                            onClick={() => onSelectGame(s)}
                        >
                            {((s as any).image || s.squareImage) && (
                                <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: `url("${(s as any).image || s.squareImage}")`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(16px)' }} />
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                                {(s as any).image || s.squareImage ? (
                                    <div style={{ minWidth: 88, width: 88, height: 88, borderRadius: 14, backgroundImage: `url("${s.squareImage || (s as any).image}")`, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: '0 6px 15px rgba(0,0,0,0.4)' }} />
                                ) : (
                                    <div style={{ minWidth: 88, width: 88, height: 88, borderRadius: 14, background: 'linear-gradient(135deg, rgba(58,134,255,0.2), rgba(58,134,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a86ff', fontSize: 36, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)' }}>
                                        <Icon icon={s.icon || "mynaui:gamepad"} />
                                    </div>
                                )}
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{s.label || s.game?.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 6, color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>{s.game?.platform?.name || s.game?.emulator?.name || 'PC'}</span>
                                        {s.game?.playtimeMinutes ? `${s.game.playtimeMinutes} min jugados` : 'Sin empezar'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexShrink: 0, position: 'relative', zIndex: 1, opacity: (isExpanded || isRowFocused) ? 1 : 0.8, transition: 'opacity 0.2s' }}>
                                <button
                                    className={`cp-btn cp-btn--secondary ${isExpanded && focusArea === 'game-actions' && isGameActionFocused(0) ? 'cp-btn--focused' : ''}`}
                                    style={{ padding: '10px 14px', fontSize: '1.1rem', borderRadius: 10, background: 'rgba(255,255,255,0.1)' }}
                                    onClick={(e) => { e.stopPropagation(); onRunGame(s) }}
                                    title="Lanzar juego"
                                >
                                    <Icon icon="mynaui:play" />
                                </button>
                                {hasAddGame && (
                                    <button
                                        className={`cp-btn cp-btn--secondary ${isExpanded && focusArea === 'game-actions' && isGameActionFocused(1) ? 'cp-btn--focused' : ''}`}
                                        style={{ padding: '10px 14px', fontSize: '1.1rem', borderRadius: 10, background: 'rgba(255,255,255,0.1)' }}
                                        onClick={(e) => { e.stopPropagation(); onEditGame(s) }}
                                        title="Editar juego"
                                    >
                                        <Icon icon="mynaui:edit" />
                                    </button>
                                )}
                                {hasAddGame && (
                                    <button
                                        className={`profile-btn profile-btn--danger ${isExpanded && focusArea === 'game-actions' && isGameActionFocused(2) ? 'focused' : ''}`}
                                        style={{ padding: '10px 14px', fontSize: '1.1rem', borderRadius: 10 }}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDeleteGame(s)
                                        }}
                                        title="Eliminar juego"
                                    >
                                        <Icon icon="mynaui:trash" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )})
                )}
            </div>
            {error && (
                <div className="profile-alert-error" style={{ marginTop: 12, color: error.includes('Error') ? '#ff8080' : '#80ff80', borderColor: error.includes('Error') ? 'rgba(242, 63, 67, 0.35)' : 'rgba(35, 165, 89, 0.35)', background: error.includes('Error') ? 'rgba(242, 63, 67, 0.12)' : 'rgba(35, 165, 89, 0.12)' }}>
                    <Icon icon={error.includes('Error') ? "mynaui:danger-triangle" : "mynaui:check-circle"} />
                    {error}
                </div>
            )}
        </div>
    )
}

export default LibraryTab
