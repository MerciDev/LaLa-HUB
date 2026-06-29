import React from 'react'
import { Icon } from '@iconify/react'
import { InterfaceSettings } from '../../../../../shared/types'

interface InterfaceTabProps {
    focusArea: string
    selectedIndex: number
    interfaceSettings: InterfaceSettings | null
    interfaceDirty: boolean
    onApiKeyChange: (value: string) => void
    onSave: () => void
    onReset: () => void
}

function InterfaceTab({ interfaceSettings, interfaceDirty, onApiKeyChange, onSave, onReset }: InterfaceTabProps) {
    return (
        <div className="cp-section">
            <div className="cp-form">
                <div className="cp-form__title">
                    <Icon icon="mynaui:grid" /> SteamGridDB
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5, paddingLeft: 4 }}>
                    SteamGridDB proporciona carátulas, héroes y logos de alta calidad para los juegos en la página de descargas. Necesitas una API Key gratuita.
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

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button className="cp-btn cp-btn--ghost" disabled={!interfaceDirty} onClick={onReset}>
                        Recargar
                    </button>
                    <button className="cp-btn cp-btn--primary" disabled={!interfaceDirty || !interfaceSettings} onClick={onSave}>
                        <Icon icon="mynaui:check" /> Guardar
                    </button>
                </div>

                <div style={{ marginTop: 24, padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <Icon icon="mynaui:info-circle" style={{ marginRight: 6 }} />
                    Obtén tu API Key gratis en <strong>steamgriddb.com/profile/developer</strong>. Al guardar, la caché de imágenes se vacía para que la próxima búsqueda use la nueva clave.
                </div>
            </div>
        </div>
    )
}

export default InterfaceTab
