import React from 'react'
import { Icon } from '@iconify/react'
import { InterfaceSettings } from '../../../../../shared/types'
import { TabSharedProps } from '../types'
import { BUILTIN_THEMES } from '../constants'

interface ThemesTabProps extends TabSharedProps {
    settings: InterfaceSettings
    onToggleGameBackground: () => void
    onSelectTheme: (themeId: string) => void
    onDuplicateTheme: (themeId: string, e: React.MouseEvent) => void
    onEditTheme: (themeId: string, e: React.MouseEvent) => void
    onDeleteTheme: (themeId: string, e: React.MouseEvent) => void
    onCreateTheme: () => void
    onImportTheme: () => void
}

function ThemesTab({ focusArea, selectedIndex, isFocused, settings, onToggleGameBackground, onSelectTheme, onDuplicateTheme, onEditTheme, onDeleteTheme, onCreateTheme, onImportTheme }: ThemesTabProps) {
    const customThemes = settings.customThemes || []
    const activeTheme = settings.activeTheme || 'dark'

    const themeName = (id: string) => {
        const map: Record<string, string> = {
            'dark': 'Dark (Predeterminado)',
            'platinum': 'Platinum',
            'apple-glass': 'Liquid Glass',
            'apple-glass-light': 'Liquid Glass (Light)',
            'xmas': 'Navidad',
            'halloween': 'Halloween',
            'twilight-princess': 'Twilight Princess'
        }
        return map[id] || id
    }

    const themeDesc = (id: string) => {
        const map: Record<string, string> = {
            'dark': 'Oscuro profundo estilo consola premium',
            'platinum': 'Tema claro metálico retro',
            'apple-glass': 'Cristal translúcido estilo visionOS',
            'apple-glass-light': 'Cristal translúcido brillante de Apple',
            'xmas': 'Tonos festivos con efecto de nieve',
            'halloween': 'Calabazas, misterio y terror',
            'twilight-princess': 'El Reino del Crepúsculo'
        }
        return map[id] || ''
    }

    const themeDot = (id: string) => {
        const map: Record<string, { bg: string; border: string }> = {
            'dark': { bg: '#0a0c10', border: '#3a86ff' },
            'platinum': { bg: '#e0e5ec', border: '#2a2d34' },
            'apple-glass': { bg: '#000000', border: 'rgba(255, 255, 255, 0.3)' },
            'apple-glass-light': { bg: '#f5f5f7', border: '#0071e3' },
            'xmas': { bg: '#081c15', border: '#f4a261' },
            'halloween': { bg: '#0f0518', border: '#ff6600' },
            'twilight-princess': { bg: '#060805', border: '#bda972' }
        }
        return map[id] || { bg: '#333', border: '#fff' }
    }

    const builtinIdx = (themeId: string) => BUILTIN_THEMES.indexOf(themeId as any) + 1

    return (
        <div className="profile-container">
            <div className="profile-section-card">
                <div className="profile-section-header">
                    <div className="profile-section-title-wrap">
                        <Icon icon="mynaui:image" />
                        <span className="profile-section-title">Comportamiento del Fondo</span>
                    </div>
                </div>
                <div className="profile-field-group">
                    <div
                        onClick={onToggleGameBackground}
                        className={`profile-toggle ${isFocused('content', 0) ? 'focused' : ''}`}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '12px', cursor: 'pointer', marginTop: '8px'
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Fondo Dinámico de Juegos</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Muestra la portada del juego seleccionado en lugar del fondo del tema.</div>
                        </div>
                        <div style={{
                            width: '40px', height: '24px', borderRadius: '12px',
                            background: settings.showGameBackground ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                            position: 'relative', transition: 'all 0.2s'
                        }}>
                            <div style={{
                                position: 'absolute', top: '2px', left: settings.showGameBackground ? '18px' : '2px',
                                width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                                transition: 'all 0.2s'
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="profile-section-card">
                <div className="profile-section-header">
                    <div className="profile-section-title-wrap">
                        <Icon icon="mynaui:palette" />
                        <span className="profile-section-title">Temas Integrados</span>
                    </div>
                </div>
                <p className="profile-section-desc">
                    Elige entre los diseños de color predeterminados de LaLa Hub.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                    {BUILTIN_THEMES.map((id) => {
                        const idx = builtinIdx(id)
                        const dot = themeDot(id)
                        return (
                            <div
                                key={id}
                                onClick={() => { onSelectTheme(id); }}
                                className={`profile-toggle ${isFocused('content', idx) ? 'focused' : ''}`}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                                    background: activeTheme === id ? 'rgba(58, 134, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                    border: activeTheme === id ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '12px', cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: dot.bg, border: `2px solid ${dot.border}` }} />
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{themeName(id)}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{themeDesc(id)}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {activeTheme === id && <Icon icon="mynaui:check-circle" style={{ color: 'var(--accent)', fontSize: '20px' }} />}
                                    <button onClick={(e) => onDuplicateTheme(id, e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Duplicar tema">
                                        <Icon icon="mynaui:copy" style={{ fontSize: '18px' }} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="profile-section-card">
                <div className="profile-section-header">
                    <div className="profile-section-title-wrap">
                        <Icon icon="mynaui:download" />
                        <span className="profile-section-title">Temas Personalizados</span>
                    </div>
                </div>
                <p className="profile-section-desc">
                    Instala temas creados por la comunidad desde archivos de hojas de estilo CSS.
                </p>

                {customThemes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', marginBottom: '16px' }}>
                        {customThemes.map((t, i) => {
                            const idx = 8 + i
                            const isAct = activeTheme === t.id
                            return (
                                <div
                                    key={t.id}
                                    onClick={() => { onSelectTheme(t.id); }}
                                    className={`profile-toggle ${isFocused('content', idx) ? 'focused' : ''}`}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                                        background: isAct ? 'rgba(58, 134, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                        border: isAct ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '12px', cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: t.colors['--bg-base'] || '#333', border: `2px solid ${t.colors['--accent'] || '#fff'}` }} />
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.description || (t.author ? `Por ${t.author}` : 'Tema personalizado')}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {isAct && <Icon icon="mynaui:check-circle" style={{ color: 'var(--accent)', fontSize: '20px' }} />}
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={(e) => onEditTheme(t.id, e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Editar tema">
                                                <Icon icon="mynaui:edit" style={{ fontSize: '18px' }} />
                                            </button>
                                            <button onClick={(e) => onDuplicateTheme(t.id, e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Duplicar tema">
                                                <Icon icon="mynaui:copy" style={{ fontSize: '18px' }} />
                                            </button>
                                            <button onClick={(e) => onDeleteTheme(t.id, e)} style={{ background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Eliminar tema">
                                                <Icon icon="mynaui:trash" style={{ fontSize: '18px' }} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="profile-actions-row" style={{ marginTop: customThemes.length > 0 ? '0' : '16px' }}>
                    <button
                        onClick={onCreateTheme}
                        className={`profile-btn profile-btn--secondary ${isFocused('content', 8 + customThemes.length) ? 'focused' : ''}`}
                    >
                        <Icon icon="mynaui:palette" />
                        Crear Tema Nuevo
                    </button>
                    <button
                        onClick={onImportTheme}
                        className={`profile-btn profile-btn--primary ${isFocused('content', 9 + customThemes.length) ? 'focused' : ''}`}
                    >
                        <Icon icon="mynaui:plus" />
                        Instalar Tema (.css)
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ThemesTab
