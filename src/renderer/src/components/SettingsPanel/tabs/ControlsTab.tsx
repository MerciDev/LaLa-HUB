import React from 'react'
import { Icon } from '@iconify/react'
import { ControlsSubTab } from '../types'
import { KEYMAP_LABELS, KEYBOARD_KEYS, GAMEPAD_KEYS } from '../constants'

interface ControlsTabProps {
    focusArea: string
    selectedIndex: number
    controlsSubTab: ControlsSubTab
    keymaps: Record<string, string | boolean>
    listeningKey: string | null
    gamepadListeningKey: string | null
    onSelectSubTab: (subTab: ControlsSubTab) => void
    onStartListening: (key: string) => void
    onStartGamepadListening: (key: string) => void
}

function ControlsTab({ focusArea, selectedIndex, controlsSubTab, keymaps, listeningKey, gamepadListeningKey, onSelectSubTab, onStartListening, onStartGamepadListening }: ControlsTabProps) {
    const fl = (idx: number) => focusArea === 'content' && selectedIndex === idx

    return (
        <div className="cp-section">
            {controlsSubTab === 'menu' && (
                <div className="cp-choice-stack">
                    <button className={`cp-choice-row ${fl(0) ? 'focused' : ''}`}
                            onClick={() => onSelectSubTab('keyboard')}>
                        <div className="cp-choice-row__icon-wrap"><Icon icon="mynaui:keyboard" /></div>
                        <div className="cp-choice-row__content">
                            <span className="cp-choice-row__label">Asignación de Teclas</span>
                            <span className="cp-choice-row__desc">Configura tu teclado y accesos rápidos del sistema</span>
                        </div>
                        <Icon icon="mynaui:chevron-right" className="cp-choice-row__arrow" />
                    </button>
                    <button className={`cp-choice-row ${fl(1) ? 'focused' : ''}`}
                            onClick={() => onSelectSubTab('gamepad')}>
                        <div className="cp-choice-row__icon-wrap"><Icon icon="mdi:controller" /></div>
                        <div className="cp-choice-row__content">
                            <span className="cp-choice-row__label">Controles de Mando</span>
                            <span className="cp-choice-row__desc">Configura tu joystick o gamepad externo</span>
                        </div>
                        <Icon icon="mynaui:chevron-right" className="cp-choice-row__arrow" />
                    </button>
                </div>
            )}

            {controlsSubTab === 'keyboard' && (
                <ul className="cp-list cp-list--compact cp-list--controls-table">
                    <li className={`cp-list__item cp-list__item--back ${fl(0) ? 'cp-list__item--focused' : ''}`}
                        onClick={() => onSelectSubTab('menu')}
                        data-focused={fl(0) ? 'true' : undefined}>
                        <Icon icon="mynaui:arrow-left" className="cp-list__item-icon" />
                        <span className="cp-list__item-name">Volver al menú</span>
                    </li>
                    {KEYBOARD_KEYS.map((key, idx) => {
                        const actualIdx = idx + 1
                        const rowFocused = fl(actualIdx)
                        return (
                            <li key={key} data-focused={rowFocused ? 'true' : undefined}
                                className={`cp-list__item cp-list__item--table-row ${rowFocused ? 'cp-list__item--focused' : ''} ${listeningKey === key ? 'cp-list__item--listening' : ''}`}
                                onClick={() => onStartListening(key)}>
                                <div className="cp-list__col-label">
                                    <span className="cp-list__item-name">{KEYMAP_LABELS[key] ?? key}</span>
                                </div>
                                <div className="cp-list__col-value">
                                    <kbd className={`cp-kbd ${listeningKey === key ? 'cp-kbd--listening' : ''}`}>
                                        {listeningKey === key ? '—' : (keymaps[key] || 'None')}
                                    </kbd>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}

            {controlsSubTab === 'gamepad' && (
                <ul className="cp-list cp-list--compact cp-list--controls-table">
                    <li className={`cp-list__item cp-list__item--back ${fl(0) ? 'cp-list__item--focused' : ''}`}
                        onClick={() => onSelectSubTab('menu')}
                        data-focused={fl(0) ? 'true' : undefined}>
                        <Icon icon="mynaui:arrow-left" className="cp-list__item-icon" />
                        <span className="cp-list__item-name">Volver al menú</span>
                    </li>
                    {GAMEPAD_KEYS.map((key, idx) => {
                        const actualIdx = idx + 1
                        const rowFocused = fl(actualIdx)
                        return (
                            <li key={key} data-focused={rowFocused ? 'true' : undefined}
                                className={`cp-list__item cp-list__item--table-row ${rowFocused ? 'cp-list__item--focused' : ''} ${gamepadListeningKey === key ? 'cp-list__item--listening' : ''}`}
                                onClick={() => onStartGamepadListening(key)}>
                                <div className="cp-list__col-label">
                                    <span className="cp-list__item-name">{KEYMAP_LABELS[key] ?? key}</span>
                                </div>
                                <div className="cp-list__col-value">
                                    <kbd className={`cp-kbd ${gamepadListeningKey === key ? 'cp-kbd--listening' : ''}`}>
                                        {gamepadListeningKey === key ? '—' : (keymaps[key] || 'None')}
                                    </kbd>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

export default ControlsTab
