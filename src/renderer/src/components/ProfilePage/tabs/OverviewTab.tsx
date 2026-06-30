import React, { useState } from 'react'
import { Icon } from '@iconify/react'
import { UserProfile } from '../../../../../shared/types'
import { sfx } from '../../../utils/audioManager'
import { TabSharedProps } from '../types'

interface OverviewTabProps extends TabSharedProps {
    hasPremiumAccess: boolean
    onOpenSecurity: () => void
    onLogout: () => void
}

const AVAILABLE_STATUSES: Array<{ id: 'online' | 'away' | 'dnd' | 'offline'; label: string; text: string }> = [
    { id: 'online', label: 'En línea', text: 'Explorando el Hub' },
    { id: 'away', label: 'Ausente', text: 'Ausente' },
    { id: 'dnd', label: 'No molestar', text: 'No molestar' },
    { id: 'offline', label: 'Invisible', text: 'Invisible' }
]

function OverviewTab({ focusArea, selectedIndex, isFocused, user, hasPremiumAccess, onOpenSecurity, onLogout, loading }: OverviewTabProps) {
    const [copied, setCopied] = useState(false)
    const [renewing, setRenewing] = useState(false)
    const [showCode, setShowCode] = useState(false)
    const [statusMenuOpen, setStatusMenuOpen] = useState(false)
    const [currentStatus, setCurrentStatus] = useState<{ id: 'online' | 'away' | 'dnd' | 'offline'; label: string; text: string }>(() => {
        try {
            const saved = localStorage.getItem('lala_user_presence')
            if (saved) {
                const parsed = JSON.parse(saved)
                if (parsed.status === 'away') return { id: 'away', label: 'Ausente', text: 'Ausente' }
                if (parsed.status === 'dnd') return { id: 'dnd', label: 'No molestar', text: 'No molestar' }
                if (parsed.status === 'offline') return { id: 'offline', label: 'Invisible', text: 'Invisible' }
            }
        } catch {}
        return { id: 'online', label: 'En línea', text: 'Explorando el Hub' }
    })

    const [pendingStatusChange, setPendingStatusChange] = useState<boolean>(false)

    React.useEffect(() => {
        if (!pendingStatusChange) return
        const timer = setTimeout(async () => {
            await window.api.social.updatePresence(currentStatus.id, currentStatus.text)
            window.dispatchEvent(new CustomEvent('update-user-status', { detail: { status: currentStatus.id, statusText: currentStatus.text } }))
            setPendingStatusChange(false)
        }, 800)
        return () => clearTimeout(timer)
    }, [currentStatus, pendingStatusChange])

    const cycleStatus = (direction: 'left' | 'right', e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        sfx.navigate()
        sfx.confirm()
        setCurrentStatus(prev => {
            const currentIndex = AVAILABLE_STATUSES.findIndex(s => s.id === prev.id)
            let nextIndex = currentIndex
            if (direction === 'left') {
                nextIndex = currentIndex > 0 ? currentIndex - 1 : AVAILABLE_STATUSES.length - 1
            } else {
                nextIndex = currentIndex < AVAILABLE_STATUSES.length - 1 ? currentIndex + 1 : 0
            }
            return AVAILABLE_STATUSES[nextIndex]
        })
        setPendingStatusChange(true)
    }

    React.useEffect(() => {
        const handler = (e: CustomEvent) => {
            if (!isFocused('content', 2)) return
            cycleStatus(e.detail)
        }
        window.addEventListener('cycle-status', handler as EventListener)
        return () => window.removeEventListener('cycle-status', handler as EventListener)
    }, [isFocused])

    const handleCopy = () => {
        if (!user?.friendCode) return
        navigator.clipboard.writeText(user.friendCode)
        sfx.confirm()
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleRenew = async () => {
        if (confirm('¿Estás seguro de que deseas renovar tu código de amigo? El código anterior dejará de funcionar.')) {
            sfx.confirm()
            setRenewing(true)
            const res = await window.api.social.renewFriendCode()
            if (res.success) {
                await window.api.auth.refreshProfile()
            }
            setRenewing(false)
        }
    }

    return (
        <div className="profile-container">
            <div className="profile-hero-card">
                <div className="profile-avatar-wrapper">
                    <div className="profile-avatar">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" />
                        ) : (
                            <Icon icon="mynaui:user" />
                        )}
                    </div>
                    <div className="profile-status-badge">
                        <span className={`profile-status-dot profile-status-dot--${currentStatus.id}`} />
                        {currentStatus.label}
                    </div>
                </div>
                <div className="profile-user-details">
                    <h2 className="profile-user-name">{user?.username || 'Gamer'}</h2>
                    {user?.friendCode && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '20px', margin: '6px 0', fontSize: '13px', fontWeight: 600, color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <span style={{ fontFamily: 'monospace', letterSpacing: showCode ? '0px' : '2px' }}>Código: {showCode ? user.friendCode : '••••-••••'}</span>
                            <button onClick={() => { setShowCode(!showCode); sfx.navigate() }} title={showCode ? 'Ocultar código' : 'Mostrar código'} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}>
                                <Icon icon={showCode ? 'mynaui:eye-slash' : 'mynaui:eye'} style={{ fontSize: '16px' }} />
                            </button>
                            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                            <button onClick={handleCopy} title="Copiar código" style={{ background: 'transparent', border: 'none', color: copied ? '#2ec4b6' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', gap: '4px' }}>
                                <Icon icon={copied ? 'mynaui:check' : 'mynaui:copy'} style={{ fontSize: '16px' }} />
                                {copied && <span style={{ fontSize: '11px', color: '#2ec4b6' }}>Copiado</span>}
                            </button>
                            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                            <button onClick={handleRenew} disabled={renewing} title="Renovar código de amigo" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: renewing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', padding: '2px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}>
                                <Icon icon="mynaui:refresh" style={{ fontSize: '16px', animation: renewing ? 'spin 1s linear infinite' : 'none' }} />
                            </button>
                        </div>
                    )}
                    <span className="profile-user-email">
                        <Icon icon="mynaui:mail" />
                        {user?.email || 'sin-correo@lalahub.app'}
                    </span>
                    {user?.createdAt && (
                        <span className="profile-user-since">
                            <Icon icon="mynaui:calendar" />
                            Miembro desde {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>

            <div className="profile-stats-grid">
                <div className={`profile-stat-card ${!hasPremiumAccess ? 'profile-stat-card--disabled' : ''}`}>
                    <div className="profile-stat-icon profile-stat-icon--cloud">
                        <Icon icon="mdi:floppy" />
                    </div>
                    <div className="profile-stat-info">
                        <span className="profile-stat-label">Sincronización de Guardados</span>
                        <span className="profile-stat-value" style={{ color: hasPremiumAccess ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {hasPremiumAccess ? 'Activa' : 'No disponible'}
                        </span>
                    </div>
                </div>

                <div className={`profile-stat-card ${!hasPremiumAccess ? 'profile-stat-card--disabled' : ''}`}>
                    <div className="profile-stat-icon profile-stat-icon--games">
                        <Icon icon="mynaui:book-open" />
                    </div>
                    <div className="profile-stat-info">
                        <span className="profile-stat-label">Sincronización de Biblioteca</span>
                        <span className="profile-stat-value" style={{ color: hasPremiumAccess ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {hasPremiumAccess ? 'Activa' : 'No disponible'}
                        </span>
                    </div>
                </div>

                <div className="profile-stat-card" style={{ border: hasPremiumAccess ? '1px solid var(--accent)' : undefined }}>
                    <div className="profile-stat-icon profile-stat-icon--sync">
                        <Icon icon="mynaui:shield-check" style={{ color: hasPremiumAccess ? 'var(--accent)' : undefined }} />
                    </div>
                    <div className="profile-stat-info">
                        <span className="profile-stat-label">Tipo de Cuenta</span>
                        <span className="profile-stat-value" style={{ textTransform: 'capitalize', color: hasPremiumAccess ? 'var(--accent)' : undefined, fontWeight: hasPremiumAccess ? 700 : undefined }}>
                            {user?.accountType || 'Standard'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="profile-section-card">
                <div className="profile-section-header">
                    <div className="profile-section-title-wrap">
                        <Icon icon="mynaui:zap" />
                        <span className="profile-section-title">Acciones Rápidas</span>
                    </div>
                </div>
                <p className="profile-section-desc">
                    Modifica tus datos de identidad en la red o cierra sesión en esta consola de manera protegida.
                </p>
                <div className="profile-actions-row">
                    <button
                        className={`profile-btn profile-btn--primary ${isFocused('content', 0) ? 'focused' : ''}`}
                        onClick={() => { sfx.confirm(); onOpenSecurity() }}
                    >
                        <Icon icon="mynaui:edit-pencil" />
                        Editar Nombre y Avatar
                    </button>
                    <button
                        className={`profile-btn profile-btn--secondary ${isFocused('content', 1) ? 'focused' : ''}`}
                        onClick={onLogout}
                        disabled={loading}
                    >
                        <Icon icon="mynaui:log-out" />
                        Cerrar Sesión en PC
                    </button>
                    <div
                        className={`profile-btn profile-btn--secondary ${isFocused('content', 2) ? 'focused' : ''}`}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowLeft') { e.stopPropagation(); cycleStatus('left', e as any); }
                            if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); cycleStatus('right', e as any); }
                        }}
                        tabIndex={0}
                        style={{ minWidth: '220px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}
                        title="Usa las flechas para cambiar de estado"
                    >
                        <button 
                            onClick={(e) => { e.stopPropagation(); cycleStatus('left', e as any); }}
                            style={{ background: 'transparent', border: 'none', color: '#fff', padding: '0 16px', height: '100%', minHeight: '44px', cursor: 'pointer', display: 'flex', alignItems: 'center', outline: 'none' }}
                            title="Estado anterior"
                        >
                            <Icon icon="mynaui:chevron-left" style={{ fontSize: '18px', opacity: 0.8 }} />
                        </button>
                        
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
                            <span className={`profile-status-dot profile-status-dot--${currentStatus.id}`} style={{ margin: 0 }} />
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>{currentStatus.label}</span>
                        </div>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); cycleStatus('right', e as any); }}
                            style={{ background: 'transparent', border: 'none', color: '#fff', padding: '0 16px', height: '100%', minHeight: '44px', cursor: 'pointer', display: 'flex', alignItems: 'center', outline: 'none' }}
                            title="Siguiente estado"
                        >
                            <Icon icon="mynaui:chevron-right" style={{ fontSize: '18px', opacity: 0.8 }} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OverviewTab
