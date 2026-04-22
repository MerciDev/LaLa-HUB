import React from 'react'
import { Icon } from '@iconify/react'
import { ContextOption } from '../../../shared/types'

interface ContextMenuProps {
    visible: boolean
    options: ContextOption[]
    selectedIndex: number
    onOptionClick: (option: ContextOption) => void
}

function ContextMenu({ visible, options, selectedIndex, onOptionClick }: ContextMenuProps): React.JSX.Element {
    return (
        <div className={`contextMenu island ${visible ? 'visible' : ''}`}>
            {options.map((option, index) => (
                <div
                    key={option.id}
                    className={`contextOption ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => onOptionClick(option)}
                >
                    <Icon icon={option.icon} width="24" height="24" className="context-icon" />
                    {option.label}
                </div>
            ))}
        </div>
    )
}

export default ContextMenu
