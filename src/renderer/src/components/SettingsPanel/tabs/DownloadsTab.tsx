import React from 'react'
import { Icon } from '@iconify/react'

import { InterfaceSettings } from '../../../../../shared/types'

interface DownloadsTabProps {
    focusArea: string
    selectedIndex: number
    interfaceSettings: InterfaceSettings | null
    interfaceDirty: boolean
    onApiKeyChange: (value: string) => void
    onDownloadPathChange: (value: string) => void
    onSave: () => void
    onReset: () => void
}

function DownloadsTab({ focusArea, selectedIndex, interfaceSettings, interfaceDirty, onApiKeyChange, onDownloadPathChange, onSave, onReset }: DownloadsTabProps) {
    const handleBrowseClick = async () => {
        if (!window.api?.browseDirectory) return
        const selected = await window.api.browseDirectory({
            title: 'Seleccionar carpeta de descargas'
        })
        if (selected) {
            onDownloadPathChange(selected)
        }
    }

    return (
        <div className="cp-section">
            <div className="cp-form">
                <div className="cp-form__title">
                    <Icon icon="mynaui:grid" /> SteamGridDB (Carátulas)
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5, paddingLeft: 4 }}>
                    SteamGridDB proporciona carátulas y logos de alta calidad para los juegos en la página de descargas. Necesitas una API Key gratuita.
                </div>

                {interfaceSettings && (
                    <div className="ag-field-row"
                         onClick={() => document.getElementById('int-sgdb-key')?.focus()}>
                        <Icon icon="mynaui:key" className="ag-field-icon" />
                        <div className="ag-field-body">
                            <div className="ag-field-label">API Key de SteamGridDB</div>
                            <input id="int-sgdb-key" className="ag-field-input" type="password" placeholder="Tu API Key de SteamGridDB"
                                   value={interfaceSettings.sgdbApiKey ?? ''}
                                   onChange={e => onApiKeyChange(e.target.value || '')} />
                        </div>
                    </div>
                )}

                <div className="cp-form__title" style={{ marginTop: 24 }}>
                    <Icon icon="mynaui:folder" /> Rutas de Instalación
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5, paddingLeft: 4 }}>
                    Directorio principal donde se descargarán y extraerán los juegos gestionados por LaLa Hub.
                </div>

                {interfaceSettings && (
                    <div className="ag-field-row">
                        <Icon icon="mynaui:folder-open" className="ag-field-icon" />
                        <div className="ag-field-body">
                            <div className="ag-field-label">Carpeta de descargas</div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input className="ag-field-input" type="text" readOnly 
                                       value={interfaceSettings.downloadPath || 'C:\\LaLaHub\\Downloads'} 
                                       style={{ opacity: 0.9, cursor: 'not-allowed' }} />
                                <button className="cp-btn cp-btn--ghost" style={{ padding: '6px 12px' }} onClick={handleBrowseClick}>
                                    Explorar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="cp-form__title" style={{ marginTop: 24 }}>
                    <Icon icon="mynaui:server" /> Servidores y Ancho de banda
                </div>
                
                <div className="ag-field-row" style={{ cursor: 'not-allowed', opacity: 0.6 }}>
                    <Icon icon="mynaui:wifi" className="ag-field-icon" />
                    <div className="ag-field-body">
                        <div className="ag-field-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            Límite de velocidad (Próximamente)
                            <div className="ag-toggle">
                                <div className="ag-toggle-handle" />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 24, padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <Icon icon="mynaui:info-circle" style={{ marginRight: 6 }} />
                    Estas opciones son orientativas. La gestión avanzada de descargas concurrentes se habilitará en la próxima actualización.<br/><br/>
                    Obtén tu API Key gratis en <strong>steamgriddb.com/profile/developer</strong>. Al guardar, la caché de imágenes se vacía para que la próxima búsqueda use la nueva clave.
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button className="cp-btn cp-btn--ghost" disabled={!interfaceDirty} onClick={onReset}>
                        Recargar
                    </button>
                    <button className="cp-btn cp-btn--primary" disabled={!interfaceDirty || !interfaceSettings} onClick={onSave}>
                        <Icon icon="mynaui:check" /> Guardar
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DownloadsTab
