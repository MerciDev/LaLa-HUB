import React from 'react'
import { Icon } from '@iconify/react'

export interface ConsolePanelTab {
    id: string
    label: string
    icon: string
    description?: string
    hasChanges?: boolean
}

interface ConsolePanelProps {
    visible: boolean
    tabs: ConsolePanelTab[]
    activeTab: string
    focusArea: 'nav' | 'content' | 'nav_close' | 'nav_save'
    onTabChange: (tabId: string) => void
    onClose: () => void
    onSave?: () => void
    hasUnsavedChanges?: boolean
    children: React.ReactNode
    footer?: React.ReactNode
    titleOverride?: string
}

const SidePanel: React.FC<ConsolePanelProps> = ({
    visible,
    tabs,
    activeTab,
    focusArea,
    onTabChange,
    onClose,
    onSave,
    hasUnsavedChanges,
    children,
    footer,
    titleOverride
}) => {
    const activeTabData = tabs.find(t => t.id === activeTab)

    return (
        <div className={`console-panel ${visible ? 'visible' : ''}`} role="dialog" aria-modal="true">

            {/* ── Left Navigation ── */}
            <nav className="console-panel__nav">
                <div className="console-panel__nav-header">
                    <Icon icon="mynaui:cog-four" className="console-panel__nav-logo" />
                    <span className="console-panel__nav-title">{titleOverride || 'Ajustes'}</span>
                </div>

                <ul className="console-panel__nav-list">
                    {tabs.map((tab, idx) => (
                        <li key={tab.id}>
                            <button
                                className={[
                                    'console-panel__nav-item',
                                    activeTab === tab.id ? 'active' : '',
                                    focusArea === 'nav' && activeTab === tab.id ? 'focused' : ''
                                ].filter(Boolean).join(' ')}
                                onClick={() => onTabChange(tab.id)}
                            >
                                <Icon icon={tab.icon} className="console-panel__nav-icon" />
                                <span className="console-panel__nav-label">{tab.label}</span>
                                <Icon 
                                    icon="mynaui:circle-solid" 
                                    className={`console-panel__nav-unsaved ${tab.hasChanges ? 'visible' : ''}`} 
                                />
                                <Icon 
                                    icon="mynaui:chevron-right" 
                                    className={`console-panel__nav-arrow ${activeTab === tab.id ? 'visible' : ''}`} 
                                />
                            </button>
                        </li>
                    ))}
                </ul>

                <div className="console-panel__nav-footer">
                    {hasUnsavedChanges && (
                        <button 
                            className={`console-panel__save ${focusArea === 'nav_save' ? 'console-panel__save--focused' : ''}`} 
                            onClick={onSave}
                        >
                            <Icon icon="mynaui:check" />
                            <span>Guardar</span>
                        </button>
                    )}

                    <button className={`console-panel__close ${focusArea === 'nav_close' ? 'console-panel__close--focused' : ''}`} onClick={onClose}>
                        <Icon icon="mynaui:x" />
                        <span>Cerrar</span>
                    </button>
                </div>
            </nav>

            {/* ── Right Content ── */}
            <div className="console-panel__content">
                <div className="console-panel__content-header">
                    <div className="console-panel__content-title-wrap">
                        <Icon icon={activeTabData?.icon ?? 'mynaui:cog-four'} />
                        <h2 className="console-panel__content-title">{activeTabData?.label}</h2>
                    </div>
                    {activeTabData?.description && (
                        <p className="console-panel__content-desc">{activeTabData.description}</p>
                    )}
                    <div className="console-panel__content-divider" />
                </div>

                <div className="console-panel__content-body">
                    {children}
                </div>

                {footer && (
                    <div className="console-panel__footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}

export default SidePanel
