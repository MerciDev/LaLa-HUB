import React, { useRef, useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { IconOption } from '../../../../shared/types'
import './PersonalMenu.css'

interface PersonalMenuProps {
    personalIcons: IconOption[]
    personalExpanded: boolean
    focusedHeader?: 'left' | 'right' | null
    focusedIndex: number
    sideWidth: number
    profileRef: React.RefObject<HTMLButtonElement | null>
}

function PersonalMenu({
    personalIcons,
    personalExpanded,
    focusedHeader = null,
    focusedIndex = 0,
    sideWidth,
    profileRef
}: PersonalMenuProps): React.JSX.Element {
    const personalOptionsRef = useRef<HTMLDivElement>(null)
    const [usernameOverflows, setUsernameOverflows] = useState<{ [key: string]: boolean }>({})
    const [statusOverflows, setStatusOverflows] = useState<{ [key: string]: boolean }>({})
    
    const usernameRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
    const statusRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

    const isPersonalExpanded = personalExpanded || focusedHeader === 'right'

    useEffect(() => {
        if (!isPersonalExpanded && personalOptionsRef.current) {
            personalOptionsRef.current.scrollLeft = 0
        }
    }, [isPersonalExpanded])

    useEffect(() => {
        if (focusedHeader === 'right' && personalOptionsRef.current) {
            const btn = personalOptionsRef.current.children[focusedIndex] as HTMLElement
            if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
        }
    }, [focusedHeader, focusedIndex])

    useEffect(() => {
        const checkOverflow = () => {
            const newUsernameOverflows: { [key: string]: boolean } = {}
            const newStatusOverflows: { [key: string]: boolean } = {}

            personalIcons.forEach((icon) => {
                if (icon.extraData?.username) {
                    const container = usernameRefs.current[icon.id]
                    if (container) {
                        const wrapper = container.querySelector('.marquee-wrapper') as HTMLElement
                        if (wrapper && (wrapper.scrollWidth / 2) > container.clientWidth) {
                            newUsernameOverflows[icon.id] = true
                        }
                    }
                }
                
                if (icon.extraData?.isPlaying || icon.extraData?.status) {
                    const container = statusRefs.current[icon.id]
                    if (container) {
                        const wrapper = container.querySelector('.marquee-wrapper') as HTMLElement
                        if (wrapper && (wrapper.scrollWidth / 2) > container.clientWidth) {
                            newStatusOverflows[icon.id] = true
                        }
                    }
                }
            })

            setUsernameOverflows(newUsernameOverflows)
            setStatusOverflows(newStatusOverflows)
        }

        checkOverflow()
        const timeoutId = setTimeout(checkOverflow, 150)
        window.addEventListener('resize', checkOverflow)
        
        return () => {
            clearTimeout(timeoutId)
            window.removeEventListener('resize', checkOverflow)
        }
    }, [personalIcons, sideWidth])

    return (
        <div className="header-group personal-group">
            <div className={`expansion-indicator expansion-indicator--left ${isPersonalExpanded ? 'expanded' : ''}`}>
                <Icon icon="mynaui:chevron-left" />
            </div>
            
            <div
                ref={personalOptionsRef}
                className={`personal-options ${isPersonalExpanded ? 'expanded' : ''}`}
            >
                {personalIcons.map((icon, idx) => {
                    const focused = focusedHeader === 'right' && focusedIndex === idx
                    const hasExtraData = icon.extraData

                    return (
                        <button
                            key={icon.id}
                            ref={hasExtraData ? profileRef : null}
                            className={`icon-button ${focused ? 'focused' : ''} ${hasExtraData ? 'icon-button--profile' : ''}`}
                            style={hasExtraData && sideWidth > 0 ? { minWidth: `${Math.max(sideWidth, 120)}px` } : {}}
                            title={icon.label}
                            onMouseEnter={() => icon.onMouseEnter && (window as any).api?.mainOptionControl(icon.onMouseEnter)}
                            onMouseLeave={() => icon.onMouseLeave && (window as any).api?.mainOptionControl(icon.onMouseLeave)}
                            onClick={() => icon.onClick && (window as any).api?.mainOptionControl(icon.onClick)}
                        >
                            {hasExtraData ? (
                                <>
                                    <div className="profile-info">
                                        <div
                                            ref={(el) => { usernameRefs.current[icon.id] = el }}
                                            className={`marquee-container ${usernameOverflows[icon.id] ? 'active' : ''}`}
                                        >
                                            <div
                                                className="marquee-wrapper"
                                                style={usernameOverflows[icon.id] ? { animation: 'marquee-scroll 10s linear infinite' } : {}}
                                            >
                                                <span className="profile-username">
                                                    {icon.extraData?.username}
                                                </span>
                                                {usernameOverflows[icon.id] && (
                                                    <span className="profile-username" aria-hidden="true">
                                                        {icon.extraData?.username}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="profile-status">
                                            {icon.extraData?.playingIcon ? (
                                                <div className="status-icon-wrapper">
                                                    <Icon icon={icon.extraData.playingIcon} className="status-platform-icon" />
                                                </div>
                                            ) : (
                                                <span className={`status-dot status-dot--${icon.extraData?.status?.toLowerCase() || 'offline'}`} />
                                            )}
                                            
                                            <div
                                                ref={(el) => { statusRefs.current[icon.id] = el }}
                                                className={`marquee-container ${statusOverflows[icon.id] ? 'active' : ''}`}
                                            >
                                                <div
                                                    className="marquee-wrapper"
                                                    style={statusOverflows[icon.id] ? { animation: 'marquee-scroll 10s linear infinite' } : {}}
                                                >
                                                    <span>
                                                        {icon.extraData?.isPlaying ? `Jugando a ${icon.extraData.isPlaying}` : icon.extraData?.status}
                                                    </span>
                                                    {statusOverflows[icon.id] && (
                                                        <span aria-hidden="true">
                                                            {icon.extraData?.isPlaying ? `Jugando a ${icon.extraData.isPlaying}` : icon.extraData?.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {icon.extraData?.avatar ? (
                                        <img
                                            src={icon.extraData.avatar}
                                            alt="User"
                                            className="profile-user-img"
                                        />
                                    ) : (
                                        <div className="profile-avatar-no-circle">
                                            <Icon icon={icon.icon} width="22" height="22" />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Icon icon={icon.icon} width="20" height="20" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default PersonalMenu