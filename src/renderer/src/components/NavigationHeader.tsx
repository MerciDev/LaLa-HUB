import React, { useRef, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { IconOption } from '../../../shared/types'

interface NavigationHeaderProps {
    socialIcons: IconOption[]
    personalIcons: IconOption[]
    socialExpanded: boolean
    personalExpanded: boolean
    displayText: string
    islandWidth: string
    textOpacity: number
    focusedHeader?: 'left' | 'right' | null
    focusedIndex?: number
}

function NavigationHeader({
    socialIcons,
    personalIcons,
    socialExpanded,
    personalExpanded,
    displayText,
    islandWidth,
    textOpacity,
    focusedHeader,
    focusedIndex = 0
}: NavigationHeaderProps): React.JSX.Element {
    const socialOptionsRef = useRef<HTMLDivElement>(null)
    const personalOptionsRef = useRef<HTMLDivElement>(null)
    const textMeasureRef = useRef<HTMLSpanElement>(null)
    const [textWidth, setTextWidth] = React.useState(0)
    const [windowWidth, setWindowWidth] = React.useState(window.innerWidth)

    const isSocialExpanded = socialExpanded || focusedHeader === 'left'
    const isPersonalExpanded = personalExpanded || focusedHeader === 'right'

    // Track window size for max-width calculations
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Measure text width for smooth transitions
    useEffect(() => {
        if (textMeasureRef.current) {
            setTextWidth(textMeasureRef.current.offsetWidth)
        }
    }, [displayText])

    const measuredWidth = textWidth + 48
    const maxWidthPx = windowWidth * 0.6
    // Trigger marquee if text doesn't fit in the island with padding (approx 60px total padding)
    const isOverflowing = textWidth > (maxWidthPx - 60)
    
    const currentIslandWidth = islandWidth === 'fit-content' 
        ? (isOverflowing ? `${maxWidthPx}px` : `${measuredWidth}px`)
        : islandWidth

    useEffect(() => {
        if (isSocialExpanded || isPersonalExpanded) {
            console.log(`[DEBUG] NavigationHeader - SocialExpanded: ${isSocialExpanded}, PersonalExpanded: ${isPersonalExpanded}, Focused: ${focusedHeader}`)
        }
    }, [isSocialExpanded, isPersonalExpanded, focusedHeader])

    useEffect(() => {
        if (!isSocialExpanded && socialOptionsRef.current) {
            socialOptionsRef.current.scrollLeft = 0
        }
    }, [isSocialExpanded])

    useEffect(() => {
        if (!isPersonalExpanded && personalOptionsRef.current) {
            personalOptionsRef.current.scrollLeft = 0
        }
    }, [isPersonalExpanded])

    // Scroll to focused element so it doesn't get hidden under the pill radius
    useEffect(() => {
        if (focusedHeader === 'left' && socialOptionsRef.current) {
            const btn = socialOptionsRef.current.children[focusedIndex] as HTMLElement
            if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
        } else if (focusedHeader === 'right' && personalOptionsRef.current) {
            const btn = personalOptionsRef.current.children[focusedIndex] as HTMLElement
            if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
        }
    }, [focusedHeader, focusedIndex])

    return (
        <div className="header">
            {/* Left pill (Social) */}
            <div className="header-group social-group">
                <div
                    ref={socialOptionsRef}
                    className={`mainOptions island ${isSocialExpanded ? 'expanded' : ''}`}
                >
                    {socialIcons.map((icon, idx) => {
                        const focused = focusedHeader === 'left' && focusedIndex === idx
                        const hasFriends = icon.id === 'friends' && icon.extraData?.friends
                        const friends = icon.extraData?.friends || []

                        return (
                            <button
                                key={icon.id}
                                className={`icon-button ${focused ? 'focused' : ''} ${hasFriends ? 'icon-button--friends' : ''}`}
                                title={icon.label}
                                onMouseEnter={() => icon.onMouseEnter && window.api.mainOptionControl(icon.onMouseEnter)}
                                onMouseLeave={() => icon.onMouseLeave && window.api.mainOptionControl(icon.onMouseLeave)}
                                onClick={() => icon.onClick && window.api.mainOptionControl(icon.onClick)}
                            >
                                {hasFriends && friends.length > 0 ? (
                                    <div className="friends-stack">
                                        {friends.slice(0, 3).map((f, i) => (
                                            <div key={f.id} className="friend-avatar-wrapper" style={{ zIndex: 10 - i }}>
                                                <div className="friend-avatar">
                                                    <Icon icon="mynaui:user" />
                                                </div>
                                                {f.playingIcon ? (
                                                    <div className="status-dot-mini status-icon-wrapper-mini">
                                                        <Icon icon={f.playingIcon} className="status-platform-icon-mini" />
                                                    </div>
                                                ) : (
                                                    <span className={`status-dot-mini status-dot--${f.status}`} />
                                                )}
                                            </div>
                                        ))}
                                        {friends.length > 3 && (
                                            <div className="friends-remaining">
                                                +{friends.length - 3}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Icon icon={icon.icon} />
                                )}
                            </button>
                        )
                    })}
                </div>
                <div className={`expansion-indicator expansion-indicator--right ${isSocialExpanded ? 'expanded' : ''}`}>
                    <Icon icon="mynaui:chevron-right" />
                </div>
            </div>

            {/* Center info island */}
            <div className="center-group">
                <div
                    className={`infoIsland island ${isOverflowing ? 'is-overflowing' : ''}`}
                    style={{
                        width: currentIslandWidth,
                        maxWidth: currentIslandWidth,
                        display: 'flex',
                        justifyContent: isOverflowing ? 'flex-start' : 'center',
                        padding: isOverflowing ? '0 32px' : '0'
                    }}
                >
                    <div 
                        className={`marquee-container ${isOverflowing ? 'active' : ''}`}
                        style={{ 
                            '--scroll-dist': `-50%`,
                            display: 'flex',
                            width: isOverflowing ? 'max-content' : '100%',
                            justifyContent: isOverflowing ? 'flex-start' : 'center'
                        } as React.CSSProperties}
                    >
                        <span 
                            ref={textMeasureRef}
                            style={{ 
                                opacity: textOpacity, 
                                transition: `opacity 0.15s ease`, 
                                whiteSpace: 'nowrap',
                                paddingRight: isOverflowing ? '80px' : '0'
                            }}
                        >
                            {displayText}
                        </span>
                        {isOverflowing && (
                            <span 
                                style={{ 
                                    opacity: textOpacity, 
                                    transition: `opacity 0.15s ease`, 
                                    whiteSpace: 'nowrap',
                                    paddingRight: '80px'
                                }}
                            >
                                {displayText}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right pill (Personal) */}
            <div className="header-group personal-group">
                <div className={`expansion-indicator expansion-indicator--left ${isPersonalExpanded ? 'expanded' : ''}`}>
                    <Icon icon="mynaui:chevron-left" />
                </div>
                <div
                    ref={personalOptionsRef}
                    className={`socialOptions island ${isPersonalExpanded ? 'expanded' : ''}`}
                >
                    {personalIcons.map((icon, idx) => {
                        const focused = focusedHeader === 'right' && focusedIndex === idx
                        const hasExtraData = icon.extraData

                        return (
                            <button
                                key={icon.id}
                                className={`icon-button ${focused ? 'focused' : ''} ${hasExtraData ? 'icon-button--profile' : ''}`}
                                title={icon.label}
                                onMouseEnter={() => icon.onMouseEnter && window.api.mainOptionControl(icon.onMouseEnter)}
                                onMouseLeave={() => icon.onMouseLeave && window.api.mainOptionControl(icon.onMouseLeave)}
                                onClick={() => icon.onClick && window.api.mainOptionControl(icon.onClick)}
                            >
                                {hasExtraData ? (
                                    <>
                                        <div className="profile-info">
                                            <div 
                                                className={`profile-username-marquee-container ${icon.extraData?.username && icon.extraData.username.length > 15 ? 'active' : ''}`}
                                            >
                                                <span className={`profile-username ${icon.extraData?.username && icon.extraData.username.length > 15 ? 'marquee-active' : ''}`} style={{ paddingRight: icon.extraData?.username && icon.extraData.username.length > 15 ? '40px' : '0' }}>
                                                    {icon.extraData?.username}
                                                </span>
                                                {icon.extraData?.username && icon.extraData.username.length > 15 && (
                                                    <span className="profile-username marquee-active" style={{ paddingRight: '40px' }}>
                                                        {icon.extraData?.username}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`profile-status`}>
                                                {icon.extraData?.playingIcon ? (
                                                    <div className="status-icon-wrapper">
                                                        <Icon icon={icon.extraData.playingIcon} className="status-platform-icon" />
                                                    </div>
                                                ) : (
                                                    <span className={`status-dot status-dot--${icon.extraData?.status || 'offline'}`} />
                                                )}
                                                <div 
                                                    className={`profile-status-marquee-container ${icon.extraData?.isPlaying ? 'active' : ''}`}
                                                >
                                                    <span className={icon.extraData?.isPlaying ? 'marquee-active' : ''} style={{ paddingRight: icon.extraData?.isPlaying ? '40px' : '0' }}>
                                                        {icon.extraData?.isPlaying ? `Jugando a ${icon.extraData.isPlaying}` : icon.extraData?.status}
                                                    </span>
                                                    {icon.extraData?.isPlaying && (
                                                        <span className="marquee-active" style={{ paddingRight: '40px' }}>
                                                            {`Jugando a ${icon.extraData.isPlaying}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="profile-avatar">
                                            <Icon icon={icon.icon} />
                                        </div>
                                    </>
                                ) : (
                                    <Icon icon={icon.icon} />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default NavigationHeader
