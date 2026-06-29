import React from 'react'
import { Icon } from '@iconify/react'
import { TabSharedProps } from '../types'

interface LoginTabProps extends TabSharedProps {
    email: string
    password: string
    onEmailChange: (value: string) => void
    onPasswordChange: (value: string) => void
    onLogin: () => void
    onSwitchToRegister: () => void
}

function LoginTab({ focusArea, selectedIndex, isFocused, loading, error, email, password, onEmailChange, onPasswordChange, onLogin, onSwitchToRegister }: LoginTabProps) {
    return (
        <div className="profile-container">
            <div className="profile-auth-hero">
                <div className="profile-auth-icon">
                    <Icon icon="mynaui:cloud" />
                </div>
                <h3>Sincroniza tu mundo gaming</h3>
                <p>
                    Inicia sesión en LaLa Hub para respaldar tus partidas guardadas, emuladores e historiales de juego en la nube de manera cifrada e instantánea.
                </p>
            </div>

            <div className="profile-section-card">
                <div className="profile-field-group">
                    <label className="profile-field-label">Correo electrónico</label>
                    <div className={`profile-input-wrap ${isFocused('content', 0) ? 'focused' : ''}`}>
                        <input
                            id="profile-input-login-email"
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
                    <div className={`profile-input-wrap ${isFocused('content', 1) ? 'focused' : ''}`}>
                        <input
                            id="profile-input-login-pass"
                            className="profile-input"
                            type="password"
                            value={password}
                            onChange={e => onPasswordChange(e.target.value)}
                            placeholder="••••••••••••"
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
                        className={`profile-btn profile-btn--primary ${isFocused('content', 2) ? 'focused' : ''}`}
                        onClick={onLogin}
                        disabled={loading}
                        style={{ width: '100%' }}
                    >
                        <Icon icon={loading ? 'mynaui:loader' : 'mynaui:log-in'} className={loading ? 'profile-spin' : ''} />
                        Acceder a mi Cuenta
                    </button>
                    <button
                        className={`profile-btn profile-btn--ghost ${isFocused('content', 3) ? 'focused' : ''}`}
                        onClick={onSwitchToRegister}
                    >
                        ¿Aún no tienes cuenta? Regístrate gratis
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LoginTab
