import React, { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { AppTheme } from '../../../shared/types'
import { sfx } from '../utils/audioManager'
import './LibraryPickerModal.css' // We can reuse this CSS for the modal backdrop and general styling, or create a new one.

interface ThemeEditorModalProps {
    visible: boolean
    theme: AppTheme
    onClose: () => void
    onSave: (theme: AppTheme) => void
}

const DEFAULT_COLORS = {
    '--bg-base': '#0a0c10',
    '--bg-surface': 'rgba(20, 24, 33, 0.7)',
    '--bg-elevated': 'rgba(30, 36, 48, 0.8)',
    '--bg-hover': 'rgba(255, 255, 255, 0.08)',
    '--accent': '#3a86ff',
    '--accent-glow': 'rgba(58, 134, 255, 0.4)',
    '--accent-bright': '#6fb1ff',
    '--text-primary': '#ffffff',
    '--text-secondary': 'rgba(255, 255, 255, 0.7)',
    '--text-muted': 'rgba(255, 255, 255, 0.35)',
    '--border': 'rgba(255, 255, 255, 0.08)',
    '--border-active': 'rgba(58, 134, 255, 0.6)'
}

export function ThemeEditorModal({ visible, theme, onClose, onSave }: ThemeEditorModalProps): React.JSX.Element | null {
    const [name, setName] = useState(theme.name)
    const [author, setAuthor] = useState(theme.author || '')
    const [description, setDescription] = useState(theme.description || '')
    const [colors, setColors] = useState<Record<string, string>>({ ...DEFAULT_COLORS, ...theme.colors })
    const [backgroundImage, setBackgroundImage] = useState(theme.backgroundImage || '')
    const [customCss, setCustomCss] = useState(theme.customCss || '')
    
    // Focus management could be added here for gamepad support, but we'll use a simpler form for now
    
    useEffect(() => {
        if (visible) {
            setName(theme.name)
            setAuthor(theme.author || '')
            setDescription(theme.description || '')
            setColors({ ...DEFAULT_COLORS, ...theme.colors })
            setBackgroundImage(theme.backgroundImage || '')
            setCustomCss(theme.customCss || '')
        }
    }, [visible, theme])

    if (!visible) return null

    const handleSave = () => {
        sfx.confirm()
        onSave({
            ...theme,
            name: name.trim() || 'Tema sin nombre',
            author,
            description,
            colors,
            backgroundImage: backgroundImage.trim() || undefined,
            customCss: customCss.trim() || undefined
        })
    }

    return (
        <div className="library-picker-overlay">
            <div className="library-picker-modal" style={{ maxWidth: '600px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div className="library-picker-header">
                    <div className="library-picker-header__title">
                        <Icon icon="mynaui:palette" />
                        <h2>Editar Tema</h2>
                    </div>
                    <button className="library-picker-close" onClick={() => { sfx.cancel(); onClose() }} aria-label="Cerrar">
                        <Icon icon="mynaui:x" />
                    </button>
                </div>
                
                <div className="library-picker-content" style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Nombre del Tema</label>
                        <input type="text" className="profile-input" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Autor</label>
                        <input type="text" className="profile-input" value={author} onChange={e => setAuthor(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Descripción</label>
                        <textarea className="profile-input" style={{ minHeight: '80px', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>URL Imagen de Fondo (Opcional)</label>
                        <input type="url" className="profile-input" value={backgroundImage} onChange={e => setBackgroundImage(e.target.value)} placeholder="https://..." />
                    </div>
                    
                    <div style={{ marginTop: '16px' }}>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1.1rem' }}>Colores (Variables CSS)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {Object.entries(colors).map(([key, val]) => (
                                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{key}</label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {val.startsWith('#') ? (
                                            <input type="color" value={val.slice(0, 7)} onChange={e => setColors(prev => ({ ...prev, [key]: e.target.value }))} style={{ width: '32px', height: '32px', padding: 0, border: 'none', borderRadius: '4px', background: 'transparent', cursor: 'pointer' }} />
                                        ) : (
                                            <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: val, border: '1px solid rgba(255,255,255,0.2)' }} />
                                        )}
                                        <input type="text" className="profile-input" style={{ flex: 1, padding: '4px 8px', fontSize: '0.9rem' }} value={val} onChange={e => setColors(prev => ({ ...prev, [key]: e.target.value }))} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '1.1rem' }}>CSS Personalizado</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
                            Añade reglas CSS avanzadas para modificar completamente el aspecto de la aplicación.
                        </p>
                        <textarea 
                            className="profile-input" 
                            style={{ minHeight: '150px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }} 
                            value={customCss} 
                            onChange={e => setCustomCss(e.target.value)} 
                            placeholder="/* Escribe tu CSS aquí */&#10;.main-layout { ... }" 
                        />
                    </div>
                </div>
                
                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button className="profile-btn profile-btn--secondary" onClick={() => { sfx.cancel(); onClose() }}>Cancelar</button>
                    <button className="profile-btn profile-btn--primary" onClick={handleSave}>
                        <Icon icon="mynaui:check" /> Guardar Tema
                    </button>
                </div>
            </div>
        </div>
    )
}
export default ThemeEditorModal
