import React, { useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { ContextOption } from '../../../shared/types'

interface ContextMenuProps {
    visible: boolean
    options: ContextOption[]
    selectedIndex: number
    onOptionClick: (option: ContextOption) => void
}

function ContextMenu({ visible, options, selectedIndex, onOptionClick }: ContextMenuProps): React.JSX.Element {
    const selectedRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (visible && selectedRef.current) {
            selectedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
    }, [visible, selectedIndex])

    return (
        <div className={`contextMenu island ${visible ? 'visible' : ''}`} role="menu">
            {options.map((option, index) => (
                <div
                    key={option.id}
                    ref={index === selectedIndex ? selectedRef : undefined}
                    className={`contextOption ${index === selectedIndex ? 'selected' : ''}`}
                    onClick={() => onOptionClick(option)}
                    role="menuitem"
                    tabIndex={index === selectedIndex ? 0 : -1}
                    aria-selected={index === selectedIndex}
                >
                    <Icon icon={option.icon} width="22" height="22" className="context-icon" />
                    <span className="context-label">{option.label}</span>
                </div>
            ))}
        </div>
    )
}

export default ContextMenu
