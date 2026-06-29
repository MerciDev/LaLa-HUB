import React from 'react'
import { Icon } from '@iconify/react'
import { UserProfile } from '../../../../../shared/types'
import { sfx } from '../../utils/audioManager'
import { TabSharedProps } from '../types'

interface OverviewTabProps extends TabSharedProps {
    hasPremiumAccess: boolean
    onOpenSecurity: () => void
    onLogout: () => void
}

function OverviewTab({ focusArea, selectedIndex, isFocused, user, hasPremiumAccess, onOpenSecurity, onLogout, loading }: OverviewTabProps) {
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
                        <span className="profile-status-dot" />
                        En línea
                    </div>
                </div>
                <div className="profile-user-details">
                    <h2 className="profile-user-name">{user?.username || 'Gamer'}</h2>
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
                        Editar Nombre de Usuario
                    </button>
                    <button
                        className={`profile-btn profile-btn--secondary ${isFocused('content', 1) ? 'focused' : ''}`}
                        onClick={onLogout}
                        disabled={loading}
                    >
                        <Icon icon="mynaui:log-out" />
                        Cerrar Sesión en PC
                    </button>
                </div>
            </div>
        </div>
    )
}

export default OverviewTab
