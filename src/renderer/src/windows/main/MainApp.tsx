import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { AppAction, IconOption } from '../../../../shared/types'

function MainApp(): React.JSX.Element {
    const [infoText, setInfoText] = useState('')

    // State
    const [mainIcons, setMainIcons] = useState<IconOption[]>([])
    const [mainExpanded, setMainExpanded] = useState(false)
    const mainOptionsRef = useRef<HTMLDivElement>(null)

    const [socialIcons, setSocialIcons] = useState<IconOption[]>([])
    const [socialExpanded, setSocialExpanded] = useState(false)
    const socialOptionsRef = useRef<HTMLDivElement>(null)

    const [displayText, setDisplayText] = useState('')
    const [islandWidth, setIslandWidth] = useState<string>('56px')
    const [textOpacity, setTextOpacity] = useState<number>(1)

    // Scroll Resets
    useEffect(() => {
        if (!mainExpanded && mainOptionsRef.current) {
            mainOptionsRef.current.scrollLeft = 0
        }
    }, [mainExpanded])

    useEffect(() => {
        if (!socialExpanded && socialOptionsRef.current) {
            socialOptionsRef.current.scrollLeft = 0
        }
    }, [socialExpanded])

    // Info Island Animation
    useEffect(() => {
        if (infoText !== displayText) {
            setTextOpacity(0)
            const timeout = setTimeout(() => {
                setDisplayText(infoText)
                setTextOpacity(1)
            }, 300)
            return () => clearTimeout(timeout)
        }
    }, [infoText, displayText])

    // API Handlers
    useEffect(() => {
        window.api.onMainMessage((action: AppAction) => {
            switch (action.type) {
                case 'CHANGE_INFO_ISLAND':
                    setInfoText(action.payload)
                    break
                case 'EXPAND_INFO_ISLAND':
                    setIslandWidth('50%')
                    break
                case 'COLLAPSE_INFO_ISLAND':
                    setIslandWidth('56px')
                    break
                case 'ADD_MAIN_ICON':
                    setMainIcons(prev => [...prev, action.payload])
                    break
                case 'ADD_SOCIAL_ICON':
                    setSocialIcons(prev => [...prev, action.payload])
                    break
                case 'TOGGLE_MAIN_OPTIONS':
                    setMainExpanded(prev => !prev)
                    break
                case 'TOGGLE_SOCIAL_OPTIONS':
                    setSocialExpanded(prev => !prev)
                    break
            }
        })

        return () => {
            window.api.offMainMessage()
        }
    }, [])

    return (
        <div className='app dot-background'>
            <div className="header">
                <div
                    ref={mainOptionsRef}
                    className={`mainOptions island ${mainExpanded ? 'expanded' : ''}`}
                >
                    {mainIcons.map((icon) => (
                        <button
                            key={icon.id}
                            className="icon-button"
                            title={icon.label}
                            onMouseEnter={() => icon.onMouseEnter && window.api.mainOptionControl(icon.onMouseEnter)}
                            onMouseLeave={() => icon.onMouseLeave && window.api.mainOptionControl(icon.onMouseLeave)}
                            onClick={() => icon.onClick && window.api.mainOptionControl(icon.onClick)}
                        >
                            <Icon icon={icon.icon} />
                        </button>
                    ))}
                </div>

                <div
                    className="infoIsland island"
                    style={{ width: islandWidth }}
                >
                    <span style={{
                        opacity: textOpacity,
                        transition: 'opacity 0.3s ease'
                    }}>
                        {displayText}
                    </span>
                </div>

                <div
                    ref={socialOptionsRef}
                    className={`socialOptions island ${socialExpanded ? 'expanded' : ''}`}
                >
                    {socialIcons.map((icon) => (
                        <button
                            key={icon.id}
                            className="icon-button"
                            title={icon.label}
                            onMouseEnter={() => icon.onMouseEnter && window.api.mainOptionControl(icon.onMouseEnter)}
                            onMouseLeave={() => icon.onMouseLeave && window.api.mainOptionControl(icon.onMouseLeave)}
                            onClick={() => icon.onClick && window.api.mainOptionControl(icon.onClick)}
                        >
                            <Icon icon={icon.icon} />
                        </button>
                    ))}
                </div>
            </div>
            <div className="content island"></div>
        </div>
    )
}

export default MainApp