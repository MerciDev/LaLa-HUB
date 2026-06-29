import React, { useRef, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { IconOption } from '../../../shared/types'
import PersonalMenu from './personal-menu/PersonalMenu'

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
    const textMeasureRef = useRef<HTMLSpanElement>(null)
    const [textWidth, setTextWidth] = React.useState(0)
    const [windowWidth, setWindowWidth] = React.useState(window.innerWidth)

    const [sideWidth, setSideWidth] = React.useState(0)
    const [realFriends, setRealFriends] = React.useState<any[]>([])
    const profileRef = useRef<HTMLButtonElement>(null)
    const friendsRef = useRef<HTMLButtonElement>(null)

    const isSocialExpanded = socialExpanded || focusedHeader === 'left'

    useEffect(() => {
        const load = () => {
            window.api?.social?.getFriends()?.then(res => {
                if (res?.success && res.data) setRealFriends(res.data)
            }).catch(() => {})
        }
        load()
        const unsub = window.api?.social?.onPresenceUpdate?.(() => load())
        return () => { unsub && unsub() }
    }, [])

    // Synchronize side widths (Profile and Friends)
    useEffect(() => {
        const observer = new ResizeObserver(() => {
            const pWidth = profileRef.current?.getBoundingClientRect().width || 0
            const fWidth = friendsRef.current?.getBoundingClientRect().width || 0
            const maxW = Math.max(pWidth, fWidth)
            if (maxW > 0) {
                setSideWidth(maxW)
            }
        })

        if (profileRef.current) observer.observe(profileRef.current)
        if (friendsRef.current) observer.observe(friendsRef.current)

        return () => observer.disconnect()
    }, [socialIcons, personalIcons]) // Re-run if icons change

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
        if (!isSocialExpanded && socialOptionsRef.current) {
            socialOptionsRef.current.scrollLeft = 0
        }
    }, [isSocialExpanded])

    useEffect(() => {
        if (focusedHeader === 'left' && socialOptionsRef.current) {
            const btn = socialOptionsRef.current.children[focusedIndex] as HTMLElement
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
                        const isFriendsIcon = icon.id === 'friends'
                        const acceptedFriends = isFriendsIcon ? realFriends.filter(f => f.friendshipStatus === 'accepted') : []
                        const onlineFriends = acceptedFriends.filter(f => f.status !== 'offline')
                        const displayFriends = onlineFriends.length > 0 ? onlineFriends : acceptedFriends
                        const hasFriends = isFriendsIcon

                        return (
                            <button
                                key={icon.id}
                                ref={hasFriends ? friendsRef : null}
                                className={`icon-button ${focused ? 'focused' : ''} ${hasFriends ? 'icon-button--friends' : ''}`}
                                style={hasFriends ? { minWidth: sideWidth > 0 ? `${Math.max(sideWidth, 240)}px` : '240px' } : {}}
                                title={icon.label}
                                onMouseEnter={() => icon.onMouseEnter && window.api.mainOptionControl(icon.onMouseEnter)}
                                onMouseLeave={() => icon.onMouseLeave && window.api.mainOptionControl(icon.onMouseLeave)}
                                onClick={() => icon.onClick && window.api.mainOptionControl(icon.onClick)}
                            >
                                {hasFriends ? (
                                    <>
                                        {displayFriends.length > 0 ? (
                                            <div className="friends-stack-container">
                                                <div className="friends-stack">
                                                    {displayFriends.slice(0, 3).map((f, i) => (
                                                        <div key={f.id} className="friend-avatar-wrapper" style={{ zIndex: 10 - i }}>
                                                            <div className="friend-avatar" style={{ overflow: 'hidden' }}>
                                                                {f.avatarUrl ? (
                                                                    <img src={f.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <span style={{ fontSize: 11, fontWeight: 'bold' }}>{f.username?.charAt(0).toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <span className={`status-dot-mini status-dot--${f.status || 'offline'}`} />
                                                        </div>
                                                    ))}
                                                    {displayFriends.length > 3 && (
                                                        <div className="friends-remaining">
                                                            +{displayFriends.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <Icon icon="mynaui:users-group" style={{ fontSize: 22, marginRight: 6 }} />
                                        )}
                                        <div className="friends-info">
                                            <div 
                                                className={`friends-label-marquee-container ${icon.label && icon.label.length > 15 ? 'active' : ''}`}
                                            >
                                                <span className={`friends-label ${icon.label && icon.label.length > 15 ? 'marquee-active' : ''}`}>
                                                    {icon.label}
                                                </span>
                                            </div>
                                            <div className="friends-status">
                                                <span className={`status-dot status-dot--${onlineFriends.length > 0 ? 'online' : 'offline'}`} />
                                                <div 
                                                    className={`friends-status-marquee-container`}
                                                >
                                                    <span>
                                                        {onlineFriends.length} en línea
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
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

            <div className="header-divider" />

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

            <div className="header-divider" />

            <PersonalMenu
                personalIcons={personalIcons}
                personalExpanded={personalExpanded}
                focusedHeader={focusedHeader}
                focusedIndex={focusedIndex}
                sideWidth={sideWidth}
                profileRef={profileRef}
            />
        </div>
    )
}

export default NavigationHeader
