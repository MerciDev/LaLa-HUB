import React from 'react'
import { Icon } from '@iconify/react'
import { TabSharedProps } from '../types'

interface SecurityTabProps extends TabSharedProps {
    newUsername: string
    newAvatarUrl: string
    onUsernameChange: (value: string) => void
    onAvatarUrlChange: (value: string) => void
    onSave: () => void
    onLogout: () => void
}

function SecurityTab({ focusArea, selectedIndex, isFocused, user, loading, error, newUsername, newAvatarUrl, onUsernameChange, onAvatarUrlChange, onSave, onLogout }: SecurityTabProps) {
    return (
        <div className="profile-container">
            <div className="profile-section-card">
                <div className="profile-section-header">
                    <div className="profile-section-title-wrap">
                        <Icon icon="mynaui:user" />
                        <span className="profile-section-title">Identidad Pública</span>
                    </div>
                </div>
                <p className="profile-section-desc">
                    Este es el nombre visible en marcadores, partidas guardadas en red y con tus amigos de LaLa Hub.
                </p>
                <div className="profile-field-group">
                    <label className="profile-field-label">Nombre de usuario</label>
                    <div className={`profile-input-wrap ${isFocused('content', 0) ? 'focused' : ''}`}>
                        <input
                            id="profile-input-user"
                            className="profile-input"
                            type="text"
                            value={newUsername}
                            onChange={e => onUsernameChange(e.target.value)}
                            placeholder="Ingresa tu apodo gamer"
                            onFocus={() => {}}
                        />
                        <Icon icon="mynaui:user" className="profile-input-icon" />
                    </div>
                </div>

                {error && (
                    <div className="profile-alert-error">
                        <Icon icon="mynaui:warning-triangle" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="profile-field-group">
                    <label className="profile-field-label">URL de Imagen de Perfil</label>
                    <div className={`profile-input-wrap ${isFocused('content', 1) ? 'focused' : ''}`}>
                        <input
                            id="profile-input-avatar"
                            className="profile-input"
                            type="text"
                            value={newAvatarUrl}
                            onChange={e => onAvatarUrlChange(e.target.value)}
                            placeholder="Ej: https://tusitio.com/mi-avatar.png"
                            onFocus={() => {}}
                        />
                        <Icon icon="mynaui:image" className="profile-input-icon" />
                    </div>
                </div>

                <div className="profile-actions-row">
                    <button
                        className={`profile-btn profile-btn--primary ${isFocused('content', 2) ? 'focused' : ''}`}
                        onClick={onSave}
                        disabled={loading}
                    >
                        <Icon icon={loading ? 'mynaui:loader' : 'mynaui:check'} className={loading ? 'profile-spin' : ''} />
                        Guardar Cambios
                    </button>
                </div>
            </div>

            <div className="profile-section-card">
                <div className="profile-section-header">
                    <div className="profile-section-title-wrap">
                        <Icon icon="mynaui:lock-key" />
                        <span className="profile-section-title">Zona de Sesión</span>
                    </div>
                </div>
                <p className="profile-section-desc">
                    Al cerrar sesión dejarás de sincronizar instantáneamente este equipo. Tus partidas permanecerán a salvo en la nube.
                </p>
                <div className="profile-actions-row">
                    <button
                        className={`profile-btn profile-btn--danger ${isFocused('content', 3) ? 'focused' : ''}`}
                        onClick={onLogout}
                        disabled={loading}
                    >
                        <Icon icon="mynaui:log-out" />
                        Desconectar Cuenta
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SecurityTab
