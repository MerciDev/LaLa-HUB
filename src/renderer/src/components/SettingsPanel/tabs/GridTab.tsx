import React from 'react'
import { Icon } from '@iconify/react'

interface GridTabProps {
    focusArea: string
    selectedIndex: number
    gridGap: number
    gridAspect: number
    gridDirty: boolean
    gridConfig?: { rows: number; cols: number; gap: number; aspectRatio: number }
    onGapChange: (value: number) => void
    onAspectChange: (value: number) => void
    onApply: () => void
    onReset: () => void
    onClearGrid: () => void
}

function GridTab({ gridGap, gridAspect, gridDirty, gridConfig, onGapChange, onAspectChange, onApply, onReset, onClearGrid }: GridTabProps) {
    return (
        <div className="cp-section">
            <div className="cp-form">
                <div className="cp-form__title" style={{ marginBottom: 4 }}>Separación entre carátulas (px)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input type="range" min={0} max={32} value={gridGap}
                           onChange={e => onGapChange(+e.target.value)}
                           style={{ flex: 1, accentColor: 'var(--accent)' }} />
                    <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{gridGap}</span>
                </div>

                <div className="cp-form__title" style={{ marginTop: 24, marginBottom: 4 }}>Proporción de carátulas (ancho / alto)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input type="range" min={0.5} max={2} step={0.05} value={gridAspect}
                           onChange={e => onAspectChange(+e.target.value)}
                           style={{ flex: 1, accentColor: 'var(--accent)' }} />
                    <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{gridAspect.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                    <button className="cp-btn cp-btn--ghost" onClick={onReset} disabled={!gridDirty}>
                        Recargar
                    </button>
                    <button className="cp-btn cp-btn--primary" onClick={onApply} disabled={!gridDirty}>
                        <Icon icon="mynaui:check" /> Aplicar
                    </button>
                </div>

                <div style={{ marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                    <div className="cp-form__title" style={{ color: '#ff4444', marginBottom: 8 }}>Limpiar Cuadrícula</div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        Elimina todos los juegos de la cuadrícula y repara ranuras bloqueadas o corruptas.
                    </p>
                    <button
                        className="cp-btn"
                        style={{ background: '#ff4444', color: '#fff', border: 'none', width: '100%', padding: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        onClick={onClearGrid}
                    >
                        <Icon icon="mynaui:trash" /> Limpiar cuadrícula y borrar todo
                    </button>
                </div>

                <div style={{ marginTop: 24, padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <Icon icon="mynaui:info-circle" style={{ marginRight: 6 }} />
                    El número de filas y columnas ahora se calcula automáticamente de forma dinámica para ajustarse a tu pantalla y resolución.
                </div>
            </div>
        </div>
    )
}

export default GridTab
