import React, { useState } from 'react'
import { Icon } from '@iconify/react'
import { sfx } from '../../../utils/audioManager'
import { TabSharedProps } from '../types'

interface SecurityTabProps extends TabSharedProps {
    newUsername: string
    newAvatarUrl: string
    newBannerUrl: string
    onUsernameChange: (value: string) => void
    onAvatarUrlChange: (value: string) => void
    onBannerUrlChange: (value: string) => void
    onSave: () => void
    onLogout: () => void
}

function SecurityTab({ focusArea, selectedIndex, isFocused, user, loading, error, newUsername, newAvatarUrl, newBannerUrl, onUsernameChange, onAvatarUrlChange, onBannerUrlChange, onSave, onLogout }: SecurityTabProps) {
    const isStandard = !user?.accountType || user.accountType === 'standard'
    const [copied, setCopied] = useState(false)
    const [renewing, setRenewing] = useState(false)
    const [showCode, setShowCode] = useState(false)

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
    
    // Parse gradient if present
    const isGradient = newBannerUrl?.startsWith('linear-gradient')
    const color1Match = isGradient ? newBannerUrl.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/) : null
    let color1 = color1Match ? color1Match[0] : '#1a1a2e'
    
    // Extract second color by finding the second hex match
    const restStr = isGradient && color1Match ? newBannerUrl.substring(color1Match.index! + color1Match[0].length) : ''
    const color2Match = restStr.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/)
    let color2 = color2Match ? color2Match[0] : '#e60012'

    const handleColor1Change = (c: string) => {
        onBannerUrlChange(`linear-gradient(135deg, ${c} 0%, ${color2} 100%)`)
    }
    const handleColor2Change = (c: string) => {
        onBannerUrlChange(`linear-gradient(135deg, ${color1} 0%, ${c} 100%)`)
    }
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

                <div className="profile-field-group" style={{ marginTop: '16px' }}>
                    <label className="profile-field-label">Código de Amigo Único</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, color: '#fff', flex: 1, letterSpacing: showCode ? '1px' : '3px' }}>{showCode ? (user?.friendCode || 'No generado') : '••••-••••'}</span>
                        <button onClick={() => { setShowCode(!showCode); sfx.navigate() }} type="button" title={showCode ? 'Ocultar código' : 'Mostrar código'} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                            <Icon icon={showCode ? 'mynaui:eye-slash' : 'mynaui:eye'} style={{ fontSize: '18px' }} />
                        </button>
                        {user?.friendCode && (
                            <button onClick={handleCopy} type="button" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: copied ? '#2ec4b6' : '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                                <Icon icon={copied ? 'mynaui:check' : 'mynaui:copy'} style={{ fontSize: '16px' }} />
                                <span>{copied ? 'Copiado' : 'Copiar'}</span>
                            </button>
                        )}
                        <button onClick={handleRenew} disabled={renewing} type="button" style={{ background: 'rgba(230,0,18,0.2)', border: '1px solid rgba(230,0,18,0.4)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: renewing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                            <Icon icon="mynaui:refresh" style={{ fontSize: '16px', animation: renewing ? 'spin 1s linear infinite' : 'none' }} />
                            <span>{renewing ? 'Renovando...' : 'Renovar Código'}</span>
                        </button>
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

                <div className="profile-field-group">
                    <label className="profile-field-label">Fondo de Perfil (Banner)</label>
                    <div className={`profile-input-wrap ${isFocused('content', 2) ? 'focused' : ''}`} style={{ flexDirection: 'column', height: 'auto', padding: '12px', gap: '12px', alignItems: 'flex-start' }}>
                        {!isStandard && (
                            <div style={{ display: 'flex', width: '100%', gap: '12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                                <Icon icon="mynaui:image" className="profile-input-icon" style={{ position: 'static' }} />
                                <input
                                    id="profile-input-banner"
                                    className="profile-input"
                                    style={{ padding: 0 }}
                                    type="text"
                                    value={newBannerUrl}
                                    onChange={e => onBannerUrlChange(e.target.value)}
                                    placeholder="Ej: https://tusitio.com/mi-banner.png"
                                    onFocus={() => {}}
                                />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', width: '100%' }}>
                            <Icon icon="mynaui:palette" className="profile-input-icon" style={{ position: 'static' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Color 1:</span>
                                <input 
                                    id={isStandard ? "profile-input-banner" : "profile-input-banner-color"}
                                    type="color" 
                                    value={color1} 
                                    onChange={e => handleColor1Change(e.target.value)}
                                    style={{ width: '32px', height: '32px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Color 2:</span>
                                <input 
                                    type="color" 
                                    value={color2} 
                                    onChange={e => handleColor2Change(e.target.value)}
                                    style={{ width: '32px', height: '32px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                                />
                            </div>
                            <div style={{ flex: 1, height: '24px', borderRadius: '4px', background: isGradient ? newBannerUrl : `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)` }} />
                        </div>
                    </div>
                </div>

                <div className="profile-actions-row">
                    <button
                        className={`profile-btn profile-btn--primary ${isFocused('content', 3) ? 'focused' : ''}`}
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
                        className={`profile-btn profile-btn--danger ${isFocused('content', 4) ? 'focused' : ''}`}
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
