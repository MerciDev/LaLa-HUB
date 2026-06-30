import React from 'react'
import { Icon } from '@iconify/react'
import { InterfaceSettings } from '../../../../../shared/types'

interface InterfaceTabProps {
    focusArea: string
    selectedIndex: number
    interfaceSettings: InterfaceSettings | null
    interfaceDirty: boolean
    onApiKeyChange: (value: string) => void
    onToggleSkipIntro: (value: boolean) => void
    onSave: () => void
    onReset: () => void
}

function InterfaceTab({ interfaceSettings, interfaceDirty, onApiKeyChange, onToggleSkipIntro, onSave, onReset }: InterfaceTabProps) {
    return (
        <div className="cp-section">
            <div className="cp-form">
                <div className="cp-form__title">
                    <Icon icon="mynaui:monitor" /> Pantallas de Carga
                </div>
                {interfaceSettings && (
                    <div className="ag-field-row" style={{ cursor: 'pointer' }}
                         onClick={() => onToggleSkipIntro(!interfaceSettings.skipIntroSplash)}>
                        <Icon icon={interfaceSettings.skipIntroSplash ? 'mynaui:eye-slash' : 'mynaui:eye'} className="ag-field-icon" />
                        <div className="ag-field-body">
                            <div className="ag-field-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                Desactivar pantallas de carga (al abrir app y al iniciar juegos)
                                <div className={`ag-toggle ${interfaceSettings.skipIntroSplash ? 'active' : ''}`}>
                                    <div className="ag-toggle-handle" />
                                </div>
                            </div>
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
            </div>
        </div>
    )
}

export default InterfaceTab
