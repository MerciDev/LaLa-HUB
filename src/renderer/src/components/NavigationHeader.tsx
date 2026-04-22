import React, { useRef, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { IconOption } from '../../../shared/types'

interface NavigationHeaderProps {
    mainIcons: IconOption[]
    socialIcons: IconOption[]
    mainExpanded: boolean
    socialExpanded: boolean
    displayText: string
    islandWidth: string
    textOpacity: number
    focusedHeader?: 'left' | 'right' | null
    focusedIndex?: number
}

function NavigationHeader({
    mainIcons,
    socialIcons,
    mainExpanded,
    socialExpanded,
    displayText,
    islandWidth,
    textOpacity,
    focusedHeader,
    focusedIndex = 0
}: NavigationHeaderProps): React.JSX.Element {
    const mainOptionsRef = useRef<HTMLDivElement>(null)
    const socialOptionsRef = useRef<HTMLDivElement>(null)

    const isMainExpanded = mainExpanded || focusedHeader === 'left'
    const isSocialExpanded = socialExpanded || focusedHeader === 'right'

    useEffect(() => {
        if (!isMainExpanded && mainOptionsRef.current) {
            mainOptionsRef.current.scrollLeft = 0
        }
    }, [isMainExpanded])

    useEffect(() => {
        if (!isSocialExpanded && socialOptionsRef.current) {
            socialOptionsRef.current.scrollLeft = 0
        }
    }, [isSocialExpanded])

    // Scroll to focused element so it doesn't get hidden under the pill radius
    useEffect(() => {
        if (focusedHeader === 'left' && mainOptionsRef.current) {
            const btn = mainOptionsRef.current.children[focusedIndex] as HTMLElement
            if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
        } else if (focusedHeader === 'right' && socialOptionsRef.current) {
            const btn = socialOptionsRef.current.children[focusedIndex] as HTMLElement
            if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
        }
    }, [focusedHeader, focusedIndex])

    return (
        <div className="header">
            {/* Left pill */}
            <div
                ref={mainOptionsRef}
                className={`mainOptions island ${isMainExpanded ? 'expanded' : ''}`}
            >
                {mainIcons.map((icon, idx) => {
                    const focused = focusedHeader === 'left' && focusedIndex === idx
                    return (
                        <button
                            key={icon.id}
                            className={`icon-button ${focused ? 'focused' : ''}`}
                            title={icon.label}
                            onMouseEnter={() => icon.onMouseEnter && window.api.mainOptionControl(icon.onMouseEnter)}
                            onMouseLeave={() => icon.onMouseLeave && window.api.mainOptionControl(icon.onMouseLeave)}
                            onClick={() => icon.onClick && window.api.mainOptionControl(icon.onClick)}
                        >
                            <Icon icon={icon.icon} />
                        </button>
                    )
                })}
            </div>

            {/* Center info island */}
            <div
                className="infoIsland island"
                style={{
                    width: islandWidth,
                    maxWidth: islandWidth
                }}
            >
                <span style={{ opacity: textOpacity, transition: 'opacity 0.3s ease' }}>
                    {displayText}
                </span>
            </div>

            {/* Right pill */}
            <div
                ref={socialOptionsRef}
                className={`socialOptions island ${isSocialExpanded ? 'expanded' : ''}`}
            >
                {socialIcons.map((icon, idx) => {
                    const focused = focusedHeader === 'right' && focusedIndex === idx
                    return (
                        <button
                            key={icon.id}
                            className={`icon-button ${focused ? 'focused' : ''}`}
                            title={icon.label}
                            onMouseEnter={() => icon.onMouseEnter && window.api.mainOptionControl(icon.onMouseEnter)}
                            onMouseLeave={() => icon.onMouseLeave && window.api.mainOptionControl(icon.onMouseLeave)}
                            onClick={() => icon.onClick && window.api.mainOptionControl(icon.onClick)}
                        >
                            <Icon icon={icon.icon} />
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default NavigationHeader
