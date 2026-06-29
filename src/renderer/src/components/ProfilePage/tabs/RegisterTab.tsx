import React from 'react'
import { Icon } from '@iconify/react'
import { TabSharedProps } from '../types'

interface RegisterTabProps extends TabSharedProps {
    email: string
    password: string
    username: string
    onUsernameChange: (value: string) => void
    onEmailChange: (value: string) => void
    onPasswordChange: (value: string) => void
    onRegister: () => void
    onSwitchToLogin: () => void
}

function RegisterTab({ focusArea, selectedIndex, isFocused, loading, error, email, password, username, onUsernameChange, onEmailChange, onPasswordChange, onRegister, onSwitchToLogin }: RegisterTabProps) {
    return (
        <div className="profile-container">
            <div className="profile-auth-hero">
                <div className="profile-auth-icon">
                    <Icon icon="mynaui:user-plus" />
                </div>
                <h3>Únete a LaLa Cloud</h3>
                <p>
                    Crea una cuenta gratuita en pocos segundos y obtén acceso a respaldo en la nube, marcadores comunitarios y sincronización entre consolas.
                </p>
            </div>

            <div className="profile-section-card">
                <div className="profile-field-group">
                    <label className="profile-field-label">Nombre de usuario</label>
                    <div className={`profile-input-wrap ${isFocused('content', 0) ? 'focused' : ''}`}>
                        <input
                            id="profile-input-reg-user"
                            className="profile-input"
                            type="text"
                            value={username}
                            onChange={e => onUsernameChange(e.target.value)}
                            placeholder="GamerPro2026"
                            onFocus={() => {}}
                        />
                        <Icon icon="mynaui:user" className="profile-input-icon" />
                    </div>
                </div>

                <div className="profile-field-group">
                    <label className="profile-field-label">Correo electrónico</label>
                    <div className={`profile-input-wrap ${isFocused('content', 1) ? 'focused' : ''}`}>
                        <input
                            id="profile-input-reg-email"
                            className="profile-input"
                            type="email"
                            value={email}
                            onChange={e => onEmailChange(e.target.value)}
                            placeholder="tucorreo@ejemplo.com"
                            onFocus={() => {}}
                        />
                        <Icon icon="mynaui:mail" className="profile-input-icon" />
                    </div>
                </div>

                <div className="profile-field-group">
                    <label className="profile-field-label">Contraseña</label>
                    <div className={`profile-input-wrap ${isFocused('content', 2) ? 'focused' : ''}`}>
                        <input
                            id="profile-input-reg-pass"
                            className="profile-input"
                            type="password"
                            value={password}
                            onChange={e => onPasswordChange(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            onFocus={() => {}}
                        />
                        <Icon icon="mynaui:lock-key" className="profile-input-icon" />
                    </div>
                </div>

                {error && (
                    <div className="profile-alert-error">
                        <Icon icon="mynaui:warning-triangle" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="profile-actions-row">
                    <button
                        className={`profile-btn profile-btn--primary ${isFocused('content', 3) ? 'focused' : ''}`}
                        onClick={onRegister}
                        disabled={loading}
                        style={{ width: '100%' }}
                    >
                        <Icon icon={loading ? 'mynaui:loader' : 'mynaui:check'} className={loading ? 'profile-spin' : ''} />
                        Crear Mi Cuenta Gratis
                    </button>
                    <button
                        className={`profile-btn profile-btn--ghost ${isFocused('content', 4) ? 'focused' : ''}`}
                        onClick={onSwitchToLogin}
                    >
                        ¿Ya tienes una cuenta? Inicia sesión aquí
                    </button>
                </div>
            </div>
        </div>
    )
}

export default RegisterTab
