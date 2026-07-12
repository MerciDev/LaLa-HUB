import React, { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { PlatformForm, AppConfig } from './types'
import { EMPTY_PLATFORM } from './constants'

interface PlatformEditModalProps {
    visible: boolean
    platform: PlatformForm | null
    onClose: () => void
    onSave: (plat: PlatformForm) => void
    onBrowseImage: (callback: (path: string) => void) => void
    onBrowseFolder: (callback: (path: string) => void) => void
    onBrowseFile?: (callback: (path: string) => void) => void
}

type ModalTab = 'general' | 'config' | 'apps'

export default function PlatformEditModal({ 
    visible, 
    platform, 
    onClose, 
    onSave, 
    onBrowseImage, 
    onBrowseFolder,
    onBrowseFile 
}: PlatformEditModalProps) {
    const [formData, setFormData] = useState<PlatformForm>(EMPTY_PLATFORM)
    const [activeTab, setActiveTab] = useState<ModalTab>('general')
    const [activeAppId, setActiveAppId] = useState<string>('')
    const [installStatus, setInstallStatus] = useState<Record<string, { loading: boolean, message: string }>>({})

    useEffect(() => {
        const cleanup = window.api.onInstallProgress?.((data) => {
            const { status, appName } = data
            setInstallStatus(prev => {
                const current = prev[appName] || { loading: true }
                let msg = 'Instalando...'
                if (status === 'downloading') msg = 'Descargando...'
                else if (status === 'extracting') msg = 'Extrayendo...'
                else if (status === 'configuring') msg = 'Configurando...'
                return { ...prev, [appName]: { ...current, message: msg } }
            })
        })
        return () => {
            if (cleanup) cleanup()
        }
    }, [])

    const handleInstallApp = async (appId: string, url: string, name: string) => {
        if (!url) return
        setInstallStatus(prev => ({ ...prev, [name]: { loading: true, message: 'Iniciando...' } }))
        const res = await window.api.installApp(url, name)
        setInstallStatus(prev => ({ ...prev, [name]: { loading: false, message: res.success ? '¡Listo!' : 'Error' } }))
        
        if (res.success && res.executablePath) {
            handleAppChange(appId, 'executablePath', res.executablePath)
            setTimeout(() => {
                setInstallStatus(prev => {
                    const next = { ...prev }
                    delete next[name]
                    return next
                })
            }, 3000)
        } else {
            console.error('Install error:', res.error)
            setTimeout(() => {
                setInstallStatus(prev => {
                    const next = { ...prev }
                    delete next[name]
                    return next
                })
            }, 5000)
        }
    }

    useEffect(() => {
        if (visible) {
            const initialData: PlatformForm = platform ? { ...platform } : { ...EMPTY_PLATFORM }
            const rawApps = initialData.apps || []
            const normalizedApps: AppConfig[] = rawApps.map((a: any) => {
                if (typeof a === 'string') {
                    return { id: a, name: a, executablePath: '', args: '' }
                }
                return {
                    id: a.id || crypto.randomUUID(),
                    name: a.name || 'Sin nombre',
                    executablePath: a.executablePath || a.path || '',
                    args: a.args || '',
                    downloadUrl: a.downloadUrl || '',
                    useRetroarch: !!a.useRetroarch
                }
            })
            initialData.apps = normalizedApps

            setFormData(initialData)
            setActiveTab('general')
            
            if (normalizedApps.length > 0) {
                const defApp = normalizedApps.find(a => a.id === initialData.defaultAppId)
                setActiveAppId(defApp ? defApp.id : normalizedApps[0].id)
            } else {
                setActiveAppId('')
            }
        }
    }, [visible, platform])

    if (!visible) return null

    const updateField = (field: keyof PlatformForm, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleAddApp = () => {
        const newId = `app-${Date.now()}`
        const newApp: AppConfig = {
            id: newId,
            name: `Emulador / App ${(formData.apps?.length || 0) + 1}`,
            executablePath: '',
            args: '',
            downloadUrl: '',
            useRetroarch: false
        }
        const updatedApps = [...(formData.apps || []), newApp]
        const newDefaultId = !formData.defaultAppId ? newId : formData.defaultAppId
        setFormData(prev => ({ ...prev, apps: updatedApps, defaultAppId: newDefaultId }))
        setActiveAppId(newId)
    }

    const handleAppChange = (appId: string, field: keyof AppConfig, value: any) => {
        const updatedApps = (formData.apps || []).map((app: AppConfig) => {
            if (app.id === appId) {
                return { ...app, [field]: value }
            }
            return app
        })
        setFormData(prev => ({ ...prev, apps: updatedApps }))
    }

    const handleDeleteApp = (appId: string) => {
        const updatedApps = (formData.apps || []).filter((app: AppConfig) => app.id !== appId)
        let newDefault = formData.defaultAppId
        if (formData.defaultAppId === appId) {
            newDefault = updatedApps.length > 0 ? updatedApps[0].id : ''
        }
        setFormData(prev => ({ ...prev, apps: updatedApps, defaultAppId: newDefault }))
        if (activeAppId === appId) {
            setActiveAppId(updatedApps.length > 0 ? updatedApps[0].id : '')
        }
    }

    const handleSave = () => {
        onSave(formData)
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose()
    }

    const activeApp = (formData.apps || []).find((a: AppConfig) => a.id === activeAppId) || (formData.apps && formData.apps[0])

    return (
        <div 
            className="cp-modal" 
            onClick={handleBackdropClick} 
            style={{ 
                display: 'flex', 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                background: 'var(--bg-overlay, rgba(10, 12, 16, 0.8))', 
                backdropFilter: 'blur(8px)', 
                zIndex: 1000, 
                alignItems: 'center', 
                justifyContent: 'center' 
            }}
        >
            <div 
                className="cp-modal__content" 
                style={{ 
                    width: '1080px', 
                    height: '82vh',
                    minHeight: '740px',
                    maxHeight: '94vh', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    background: 'var(--bg-elevated, rgba(30, 36, 48, 0.9))', 
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.08))', 
                    borderRadius: 'var(--radius-xl, 20px)', 
                    boxShadow: 'var(--shadow-modal, 0 25px 50px -12px rgba(0,0,0,0.7))', 
                    overflow: 'hidden' 
                }}
            >
                {/* Header Adaptable y Dinámico con Temas */}
                <div 
                    className="cp-modal__header" 
                    style={{ 
                        padding: '22px 28px', 
                        background: 'var(--bg-header-gradient, rgba(10, 12, 16, 0.7))', 
                        borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div 
                            style={{ 
                                width: '44px', 
                                height: '44px', 
                                borderRadius: 'var(--radius-lg, 12px)', 
                                background: 'var(--accent, #3a86ff)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: '#fff', 
                                boxShadow: '0 4px 15px var(--accent-glow, rgba(58, 134, 255, 0.4))' 
                            }}
                        >
                            <Icon icon={platform ? "mynaui:edit" : "mynaui:plus"} fontSize={24} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary, #fff)', letterSpacing: '-0.02em' }}>
                                {platform ? `Editar Plataforma: ${formData.name || formData.id}` : 'Nueva Plataforma'}
                            </h2>
                            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary, rgba(255, 255, 255, 0.7))' }}>
                                Configura la identificación, recursos visuales y ejecutables para esta consola
                            </p>
                        </div>
                    </div>
                    <button className="cp-icon-btn" onClick={onClose} style={{ cursor: 'pointer', width: '38px', height: '38px', borderRadius: '10px' }}>
                        <Icon icon="mynaui:x" fontSize={22} />
                    </button>
                </div>

                {/* Sub-Header de Navegación con Pestañas */}
                <div 
                    style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        padding: '12px 28px', 
                        background: 'var(--bg-surface, rgba(20, 24, 33, 0.7))', 
                        borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))' 
                    }}
                >
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`cp-btn ${activeTab === 'general' ? 'cp-btn--focused' : 'cp-btn--secondary'}`}
                        style={{ padding: '10px 20px', borderRadius: '12px' }}
                    >
                        <Icon icon="mynaui:info-circle" fontSize={18} /> General & Visuales
                    </button>
                    <button 
                        onClick={() => setActiveTab('config')}
                        className={`cp-btn ${activeTab === 'config' ? 'cp-btn--focused' : 'cp-btn--secondary'}`}
                        style={{ padding: '10px 20px', borderRadius: '12px' }}
                    >
                        <Icon icon="mynaui:folder" fontSize={18} /> Rutas & Sistema
                    </button>
                    <button 
                        onClick={() => setActiveTab('apps')}
                        className={`cp-btn ${activeTab === 'apps' ? 'cp-btn--focused' : 'cp-btn--secondary'}`}
                        style={{ padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Icon icon="mynaui:chip" fontSize={18} /> Aplicaciones & Emuladores
                        <span 
                            style={{ 
                                background: activeTab === 'apps' ? 'var(--accent, #3a86ff)' : 'var(--bg-hover, rgba(255, 255, 255, 0.08))', 
                                color: 'var(--text-primary, #fff)', 
                                padding: '1px 8px', 
                                borderRadius: '10px', 
                                fontSize: '0.75rem', 
                                fontWeight: 700 
                            }}
                        >
                            {(formData.apps || []).length}
                        </span>
                    </button>
                </div>

                {/* Body del Modal */}
                <div className="cp-modal__body" style={{ padding: '28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* TAB 1: GENERAL & VISUALES */}
                    {activeTab === 'general' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            {/* Identificación */}
                            <div className="form-section">
                                <h3 style={{ fontSize: '0.8rem', color: 'var(--accent, #3a86ff)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icon icon="mynaui:id" /> Identificación Básica
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                                        <div className="ag-field-row" style={{ margin: 0 }} onClick={() => document.getElementById('pe-id')?.focus()}>
                                            <Icon icon="mynaui:id" className="ag-field-icon" />
                                            <div className="ag-field-body">
                                                <div className="ag-field-label">ID Único (Ej: ps2, switch) *</div>
                                                <input id="pe-id" className="ag-field-input" value={formData.id} onChange={e => updateField('id', e.target.value)} disabled={!!platform} placeholder="nintendo-64" style={{ fontWeight: 600, pointerEvents: 'auto' }} />
                                            </div>
                                        </div>
                                        <div className="ag-field-row" style={{ margin: 0 }} onClick={() => document.getElementById('pe-name')?.focus()}>
                                            <Icon icon="mynaui:tag" className="ag-field-icon" />
                                            <div className="ag-field-body">
                                                <div className="ag-field-label">Nombre Visible *</div>
                                                <input id="pe-name" className="ag-field-input" value={formData.name} onChange={e => updateField('name', e.target.value)} placeholder="PlayStation 2" style={{ fontWeight: 600, pointerEvents: 'auto' }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '14px' }}>
                                        <div className="ag-field-row" style={{ margin: 0 }} onClick={() => document.getElementById('pe-abbr')?.focus()}>
                                            <Icon icon="mynaui:hash" className="ag-field-icon" />
                                            <div className="ag-field-body">
                                                <div className="ag-field-label">Abreviatura</div>
                                                <input id="pe-abbr" className="ag-field-input" value={formData.abbreviation || ''} onChange={e => updateField('abbreviation', e.target.value)} placeholder="PS2" style={{ pointerEvents: 'auto' }} />
                                            </div>
                                        </div>
                                        <div className="ag-field-row" style={{ margin: 0 }} onClick={() => document.getElementById('pe-company')?.focus()}>
                                            <Icon icon="mynaui:briefcase" className="ag-field-icon" />
                                            <div className="ag-field-body">
                                                <div className="ag-field-label">Empresa / Fabricante</div>
                                                <input id="pe-company" className="ag-field-input" value={formData.company || ''} onChange={e => updateField('company', e.target.value)} placeholder="Sony / Nintendo" style={{ pointerEvents: 'auto' }} />
                                            </div>
                                        </div>
                                        <div className="ag-field-row" style={{ margin: 0 }} onClick={() => document.getElementById('pe-year')?.focus()}>
                                            <Icon icon="mynaui:calendar" className="ag-field-icon" />
                                            <div className="ag-field-body">
                                                <div className="ag-field-label">Año Lanzamiento</div>
                                                <input id="pe-year" className="ag-field-input" value={formData.releaseDate || ''} onChange={e => updateField('releaseDate', e.target.value)} placeholder="2000" style={{ pointerEvents: 'auto' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Multimedia (Sin Background, reutilizando clases .ag-field-row) */}
                            <div className="form-section">
                                <h3 style={{ fontSize: '0.8rem', color: 'var(--accent, #3a86ff)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icon icon="mynaui:image" /> Multimedia & Visuales
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    
                                    {/* Icono de consola */}
                                    <div className="ag-field-row" onClick={() => document.getElementById('pe-icon')?.focus()}>
                                        <Icon icon="mynaui:grid" className="ag-field-icon" />
                                        <div className="ag-field-body">
                                            <div className="ag-field-label">Icono de Consola (Nombre Iconify / URL o Ruta local)</div>
                                            <input id="pe-icon" className="ag-field-input" value={formData.icon || ''} onChange={e => updateField('icon', e.target.value)} placeholder="mdi:nintendo-switch o ruta/imagen.png" style={{ pointerEvents: 'auto' }} />
                                        </div>
                                        {formData.icon && (
                                            <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-md, 12px)', background: 'var(--bg-base, #0a0c10)', border: '1px solid var(--border, rgba(255,255,255,0.08))', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)', marginLeft: '14px' }}>
                                                {formData.icon.includes('/') || formData.icon.includes('.') ? (
                                                    <img src={formData.icon} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22100%22 height%3D%22100%22%3E%3Crect fill%3D%22%231e293b%22 width%3D%22100%22 height%3D%22100%22%2F%3E%3Ctext fill%3D%22%23475569%22 font-family%3D%22sans-serif%22 font-size%3D%2230%22 dy%3D%2210.5%22 font-weight%3D%22bold%22 x%3D%2250%25%22 y%3D%2250%25%22 text-anchor%3D%22middle%22%3E?%3C%2Ftext%3E%3C%2Fsvg%3E' }} />
                                                ) : (
                                                    <Icon icon={formData.icon} style={{ fontSize: '28px', color: 'var(--text-primary)' }} />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Imagen de Consola */}
                                    <div className="ag-field-row" style={{ cursor: 'pointer' }} onClick={() => onBrowseImage((path) => updateField('consoleImage', path))}>
                                        <Icon icon="mynaui:monitor" className="ag-field-icon" />
                                        <div className="ag-field-body">
                                            <div className="ag-field-label">Imagen Consola Principal (PNG Transparente del hardware)</div>
                                            <input className="ag-field-input" value={formData.consoleImage || ''} readOnly placeholder="Haz clic para seleccionar imagen de la consola..." style={{ color: 'var(--text-secondary)' }} />
                                        </div>
                                        {formData.consoleImage && (
                                            <div style={{ width: '64px', height: '52px', borderRadius: 'var(--radius-md, 12px)', background: 'var(--bg-base, #0a0c10)', border: '1px solid var(--border, rgba(255,255,255,0.08))', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)', marginLeft: '14px' }}>
                                                <img src={formData.consoleImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22100%22 height%3D%22100%22%3E%3Crect fill%3D%22%231e293b%22 width%3D%22100%22 height%3D%22100%22%2F%3E%3Ctext fill%3D%22%23475569%22 font-family%3D%22sans-serif%22 font-size%3D%2230%22 dy%3D%2210.5%22 font-weight%3D%22bold%22 x%3D%2250%25%22 y%3D%2250%25%22 text-anchor%3D%22middle%22%3E?%3C%2Ftext%3E%3C%2Fsvg%3E' }} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Logo / Texto transparente */}
                                    <div className="ag-field-row" style={{ cursor: 'pointer' }} onClick={() => onBrowseImage((path) => updateField('nameImage', path))}>
                                        <Icon icon="mynaui:type" className="ag-field-icon" />
                                        <div className="ag-field-body">
                                            <div className="ag-field-label">Logo / Texto transparente (Reemplaza título del sistema en la UI)</div>
                                            <input className="ag-field-input" value={formData.nameImage || ''} readOnly placeholder="Haz clic para seleccionar el logotipo de la consola..." style={{ color: 'var(--text-secondary)' }} />
                                        </div>
                                        {formData.nameImage && (
                                            <div style={{ width: '140px', height: '52px', borderRadius: 'var(--radius-md, 12px)', background: 'var(--bg-base, #0a0c10)', border: '1px solid var(--border, rgba(255,255,255,0.08))', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)', marginLeft: '14px' }}>
                                                <img src={formData.nameImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '8px' }} onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22100%22 height%3D%22100%22%3E%3Crect fill%3D%22%231e293b%22 width%3D%22100%22 height%3D%22100%22%2F%3E%3Ctext fill%3D%22%23475569%22 font-family%3D%22sans-serif%22 font-size%3D%2220%22 dy%3D%227%22 font-weight%3D%22bold%22 x%3D%2250%25%22 y%3D%2250%25%22 text-anchor%3D%22middle%22%3E?%3C%2Ftext%3E%3C%2Fsvg%3E' }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: RUTAS & SISTEMA */}
                    {activeTab === 'config' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            <div className="form-section">
                                <h3 style={{ fontSize: '0.8rem', color: 'var(--accent, #3a86ff)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icon icon="mynaui:folder" /> Rutas de Disco & Almacenamiento
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div className="ag-field-row" style={{ cursor: 'pointer' }} onClick={() => onBrowseFolder((path) => updateField('romPath', path))}>
                                        <Icon icon="mynaui:folder" className="ag-field-icon" />
                                        <div className="ag-field-body">
                                            <div className="ag-field-label">Directorio de ROMs / Juegos (Carpeta raíz de los juegos de esta consola)</div>
                                            <input className="ag-field-input" value={formData.romPath || ''} readOnly placeholder="Haz clic para explorar carpeta de ROMs..." style={{ color: 'var(--text-primary)', fontWeight: 500 }} />
                                        </div>
                                    </div>

                                    <div className="ag-field-row" style={{ cursor: 'pointer' }} onClick={() => onBrowseFolder((path) => updateField('biosPath', path))}>
                                        <Icon icon="mynaui:cpu" className="ag-field-icon" />
                                        <div className="ag-field-body">
                                            <div className="ag-field-label">Directorio de BIOS (Archivos de sistema requeridos por emuladores)</div>
                                            <input className="ag-field-input" value={formData.biosPath || ''} readOnly placeholder="Haz clic para explorar carpeta de BIOS..." style={{ color: 'var(--text-primary)', fontWeight: 500 }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3 style={{ fontSize: '0.8rem', color: 'var(--accent, #3a86ff)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icon icon="mynaui:gamepad" /> Integraciones & Social
                                </h3>
                                <div 
                                    onClick={() => updateField('enableRichPresence', !formData.enableRichPresence)}
                                    style={{ 
                                        padding: '18px 22px', 
                                        borderRadius: 'var(--radius-xl, 16px)', 
                                        background: formData.enableRichPresence ? 'var(--bg-hover, rgba(255,255,255,0.08))' : 'var(--bg-surface, rgba(20,24,33,0.7))', 
                                        border: `1px solid ${formData.enableRichPresence ? 'var(--border-active, rgba(58,134,255,0.6))' : 'var(--border, rgba(255,255,255,0.08))'}`, 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between', 
                                        transition: 'all 0.2s',
                                        boxShadow: formData.enableRichPresence ? '0 0 20px var(--accent-glow, rgba(58,134,255,0.3))' : 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div 
                                            style={{ 
                                                width: '46px', 
                                                height: '46px', 
                                                borderRadius: 'var(--radius-lg, 12px)', 
                                                background: formData.enableRichPresence ? 'var(--accent-glow, rgba(58,134,255,0.3))' : 'var(--bg-base, rgba(10,12,16,0.5))', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                color: formData.enableRichPresence ? 'var(--accent, #3a86ff)' : 'var(--text-muted, rgba(255,255,255,0.35))' 
                                            }}
                                        >
                                            <Icon icon="mynaui:gamepad" fontSize={26} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: formData.enableRichPresence ? 'var(--text-primary, #fff)' : 'var(--text-secondary, rgba(255,255,255,0.7))' }}>
                                                Discord Rich Presence
                                            </h4>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, rgba(255,255,255,0.45))' }}>
                                                Muestra en tu estado de Discord qué juego y consola estás ejecutando en LaLa-HUB
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ padding: '6px 14px', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem', background: formData.enableRichPresence ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: formData.enableRichPresence ? '#34d399' : '#f87171', border: `1px solid ${formData.enableRichPresence ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                                        {formData.enableRichPresence ? 'Activado' : 'Desactivado'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: APLICACIONES & EMULADORES */}
                    {activeTab === 'apps' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Barra superior de Apps */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary, #fff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Aplicaciones de Ejecución (Emuladores / Motores)
                                    </h3>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary, rgba(255,255,255,0.7))' }}>
                                        Define las aplicaciones y argumentos con los que se iniciarán los juegos de esta plataforma
                                    </p>
                                </div>
                                <button className="cp-btn cp-btn--primary" onClick={handleAddApp} style={{ padding: '10px 18px', borderRadius: '12px' }}>
                                    <Icon icon="mynaui:plus" fontSize={18} /> Nueva Aplicación
                                </button>
                            </div>

                            {/* Pestañas horizontales de las Apps existentes */}
                            {(formData.apps || []).length > 0 ? (
                                <>
                                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '6px 6px 12px 6px', margin: '-6px -6px 0 -6px', borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
                                        {(formData.apps || []).map((app: AppConfig) => (
                                            <button
                                                key={app.id}
                                                onClick={() => setActiveAppId(app.id)}
                                                className={`cp-btn ${activeAppId === app.id ? 'cp-btn--focused' : 'cp-btn--secondary'}`}
                                                style={{ padding: '10px 18px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                            >
                                                <Icon icon="mynaui:chip" fontSize={18} />
                                                {app.name || 'Sin nombre'}
                                                {!app.executablePath && (
                                                    <Icon icon="mynaui:danger-triangle" fontSize={16} color="#f59e0b" style={{ marginLeft: '4px' }} title="Ejecutable sin configurar" />
                                                )}
                                                {formData.defaultAppId === app.id && (
                                                    <span style={{ display: 'flex', alignItems: 'center', color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }} title="Aplicación por defecto para esta plataforma">
                                                        <Icon icon="mynaui:check" /> Defecto
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Formulario de la App Activa reutilizando clases ag-field-row */}
                                    {activeApp ? (
                                        <div 
                                            style={{ 
                                                padding: '24px', 
                                                borderRadius: 'var(--radius-xl, 18px)', 
                                                background: 'var(--bg-surface, rgba(20,24,33,0.7))', 
                                                border: '1px solid var(--border-active, rgba(58,134,255,0.6))', 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                gap: '20px', 
                                                boxShadow: 'var(--shadow-island)' 
                                            }}
                                        >
                                            {/* Acciones en la cabecera del editor de app */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))', paddingBottom: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent, #3a86ff)', fontWeight: 700 }}>
                                                    <Icon icon="mynaui:config" fontSize={20} />
                                                    <span>Editando: {activeApp.name}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {formData.defaultAppId !== activeApp.id && (
                                                        <button
                                                            className="cp-btn cp-btn--secondary"
                                                            onClick={() => updateField('defaultAppId', activeApp.id)}
                                                            style={{ padding: '6px 14px', borderRadius: '10px', color: '#34d399', borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)' }}
                                                        >
                                                            Marcar como Defecto
                                                        </button>
                                                    )}
                                                    <button
                                                        className="cp-btn cp-btn--secondary"
                                                        onClick={() => handleDeleteApp(activeApp.id)}
                                                        style={{ padding: '8px 12px', borderRadius: '10px', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)' }}
                                                        title="Eliminar esta aplicación"
                                                    >
                                                        <Icon icon="mynaui:trash" fontSize={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Campos del editor de app con ag-field-row */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                {/* Nombre */}
                                                <div className="ag-field-row" style={{ margin: 0, flexDirection: 'row' }}>
                                                    <Icon icon="mynaui:chip" className="ag-field-icon" />
                                                    <div className="ag-field-body">
                                                        <div className="ag-field-label">Nombre de la App / Emulador *</div>
                                                        <input 
                                                            className="ag-field-input"
                                                            style={{ pointerEvents: 'auto', fontWeight: 600 }}
                                                            value={activeApp.name}
                                                            onChange={e => handleAppChange(activeApp.id, 'name', e.target.value)}
                                                            placeholder="Ej: PCSX2 / Yuzu / Ryujinx"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Ejecutable (.exe) */}
                                                <div className="ag-field-row" style={{ margin: 0, flexDirection: 'row', alignItems: 'center' }}>
                                                    <Icon icon="mynaui:play" className="ag-field-icon" />
                                                    <div className="ag-field-body">
                                                        <div className="ag-field-label">Ruta del Ejecutable (.exe / .sh) *</div>
                                                        <input 
                                                            className="ag-field-input"
                                                            style={{ pointerEvents: 'auto' }}
                                                            value={activeApp.executablePath}
                                                            onChange={e => handleAppChange(activeApp.id, 'executablePath', e.target.value)}
                                                            placeholder="C:\Emulators\app.exe"
                                                        />
                                                    </div>
                                                    
                                                    {activeApp.downloadUrl && !activeApp.executablePath && (
                                                        <button
                                                            type="button"
                                                            className="cp-btn cp-btn--primary"
                                                            disabled={installStatus[activeApp.name]?.loading}
                                                            onClick={() => handleInstallApp(activeApp.id, activeApp.downloadUrl!, activeApp.name)}
                                                            style={{ padding: '6px 14px', borderRadius: '10px', flexShrink: 0, background: 'var(--accent, #3a86ff)', border: 'none', color: '#fff' }}
                                                        >
                                                            {installStatus[activeApp.name]?.loading ? (
                                                                <><Icon icon="eos-icons:loading" /> {installStatus[activeApp.name].message}</>
                                                            ) : (
                                                                <><Icon icon="mynaui:download" /> Instalar Auto.</>
                                                            )}
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        className="cp-btn cp-btn--secondary"
                                                        onClick={() => {
                                                            if (onBrowseFile) {
                                                                onBrowseFile((path) => handleAppChange(activeApp.id, 'executablePath', path))
                                                            } else {
                                                                window.api.browseFile({ filters: [{ name: 'Ejecutables', extensions: ['exe', 'app', 'sh', 'bat', '*'] }] }).then(path => {
                                                                    if (path) handleAppChange(activeApp.id, 'executablePath', path)
                                                                })
                                                            }
                                                        }}
                                                        style={{ padding: '6px 14px', borderRadius: '10px', flexShrink: 0 }}
                                                    >
                                                        <Icon icon="mynaui:folder" /> Explorar
                                                    </button>
                                                </div>

                                                {/* Argumentos de Lanzamiento */}
                                                <div className="ag-field-row" style={{ margin: 0, flexDirection: 'row' }}>
                                                    <Icon icon="mynaui:terminal" className="ag-field-icon" />
                                                    <div className="ag-field-body">
                                                        <div className="ag-field-label">Argumentos de Lanzamiento</div>
                                                        <input 
                                                            className="ag-field-input"
                                                            style={{ pointerEvents: 'auto', fontFamily: 'monospace' }}
                                                            value={activeApp.args}
                                                            onChange={e => handleAppChange(activeApp.id, 'args', e.target.value)}
                                                            placeholder='Ej: --fullscreen -f "{file}"'
                                                        />
                                                    </div>
                                                </div>

                                                {/* URL de Descarga */}
                                                <div className="ag-field-row" style={{ margin: 0, flexDirection: 'row' }}>
                                                    <Icon icon="mynaui:download" className="ag-field-icon" />
                                                    <div className="ag-field-body">
                                                        <div className="ag-field-label">URL de Descarga o Información</div>
                                                        <input 
                                                            className="ag-field-input"
                                                            style={{ pointerEvents: 'auto' }}
                                                            value={activeApp.downloadUrl || ''}
                                                            onChange={e => handleAppChange(activeApp.id, 'downloadUrl', e.target.value)}
                                                            placeholder="https://pagina-del-emulador.org"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Toggle RetroArch */}
                                            <div 
                                                onClick={() => handleAppChange(activeApp.id, 'useRetroarch', !activeApp.useRetroarch)}
                                                style={{ 
                                                    padding: '14px 18px', 
                                                    borderRadius: 'var(--radius-lg, 14px)', 
                                                    background: activeApp.useRetroarch ? 'var(--bg-hover, rgba(255,255,255,0.08))' : 'var(--bg-base, rgba(10,12,16,0.5))', 
                                                    border: `1px solid ${activeApp.useRetroarch ? 'var(--border-active, rgba(58,134,255,0.6))' : 'var(--border, rgba(255,255,255,0.08))'}`, 
                                                    cursor: 'pointer', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between', 
                                                    transition: 'all 0.2s' 
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <Icon icon="mynaui:layers" fontSize={24} style={{ color: activeApp.useRetroarch ? 'var(--accent, #3a86ff)' : 'var(--text-muted, rgba(255,255,255,0.35))' }} />
                                                    <div>
                                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: activeApp.useRetroarch ? 'var(--text-primary, #fff)' : 'var(--text-secondary, rgba(255,255,255,0.7))' }}>
                                                            Usar Integración con RetroArch
                                                        </h4>
                                                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, rgba(255,255,255,0.45))' }}>
                                                            Actívalo si este emulador es un núcleo de RetroArch gestionado desde el sistema
                                                        </p>
                                                    </div>
                                                </div>
                                                <div style={{ padding: '4px 12px', borderRadius: '14px', fontWeight: 700, fontSize: '0.8rem', background: activeApp.useRetroarch ? 'var(--accent, #3a86ff)' : 'var(--bg-hover, rgba(255,255,255,0.08))', color: '#fff' }}>
                                                    {activeApp.useRetroarch ? 'Activado' : 'Desactivado'}
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </>
                            ) : (
                                /* Estado vacío si no hay apps */
                                <div style={{ padding: '48px 24px', borderRadius: 'var(--radius-xl, 18px)', background: 'var(--bg-surface, rgba(20,24,33,0.5))', border: '2px dashed var(--border, rgba(255,255,255,0.1))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '16px' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--bg-hover, rgba(255,255,255,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent, #3a86ff)' }}>
                                        <Icon icon="mynaui:chip" fontSize={36} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary, #fff)' }}>
                                            Sin Aplicaciones o Emuladores Configurados
                                        </h4>
                                        <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary, rgba(255,255,255,0.7))', maxWidth: '440px' }}>
                                            Agrega al menos una aplicación de ejecución para que los juegos de esta plataforma sepan qué emulador o ejecutable lanzar.
                                        </p>
                                    </div>
                                    <button className="cp-btn cp-btn--primary" onClick={handleAddApp} style={{ padding: '12px 24px', borderRadius: '14px', marginTop: '8px' }}>
                                        <Icon icon="mynaui:plus" fontSize={20} /> Añadir Primera Aplicación
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer del Modal con Temas */}
                <div 
                    className="cp-modal__footer" 
                    style={{ 
                        padding: '18px 28px', 
                        borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.08))', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: 'var(--bg-surface, rgba(20, 24, 33, 0.7))' 
                    }}
                >
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, rgba(255,255,255,0.7))', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon icon="mynaui:check-circle" style={{ color: '#10b981' }} />
                        <span>Los cambios se guardan y sincronizan automáticamente en tu biblioteca local.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="cp-btn cp-btn--secondary" onClick={onClose} style={{ padding: '10px 22px', borderRadius: '12px' }}>
                            Cancelar
                        </button>
                        <button 
                            className="cp-btn cp-btn--primary" 
                            onClick={handleSave} 
                            style={{ padding: '10px 26px', borderRadius: '12px', opacity: (!formData.name.trim() || !formData.id.trim()) ? 0.5 : 1 }} 
                            disabled={!formData.name.trim() || !formData.id.trim()}
                        >
                            <Icon icon="mynaui:check" fontSize={18} /> Guardar Plataforma
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
