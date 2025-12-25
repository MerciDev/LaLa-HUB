import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { AppAction, HomeGrid, IconOption } from '../../../../shared/types'

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

    const [homeGrid, setHomeGrid] = useState<HomeGrid>({
        rows: 4,
        cols: 6,
        aspectRatio: 1,
        gap: 10,
        items: []
    })

    // Staircase Animation State
    const [visibleSlots, setVisibleSlots] = useState<Set<number>>(new Set())
    const [animationComplete, setAnimationComplete] = useState(false)

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

    // Content - Home Grid
    const contentRef = useRef<HTMLDivElement>(null)
    const [cellSize, setCellSize] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const calculateGrid = () => {
            if (!contentRef.current) return

            const { clientWidth: W, clientHeight: H } = contentRef.current
            const { rows, cols, aspectRatio, gap } = homeGrid

            const availableW = W - (gap * (cols + 1))
            const availableH = H - (gap * (rows + 1))

            const w = Math.min(
                availableW / cols,
                (availableH * aspectRatio) / rows
            )

            const h = w / aspectRatio

            setCellSize({ width: w, height: h })
        }

        calculateGrid()

        const observer = new ResizeObserver(calculateGrid)
        if (contentRef.current) observer.observe(contentRef.current)

        return () => observer.disconnect()
    }, [homeGrid])

    // Staircase Animation Effect
    useEffect(() => {
        if (animationComplete) return

        const { rows, cols } = homeGrid
        const maxWave = (rows - 1) + (cols - 1) // Maximum diagonal wave

        // Animate each wave
        for (let wave = 0; wave <= maxWave; wave++) {
            setTimeout(() => {
                setVisibleSlots(prev => {
                    const newSet = new Set(prev)
                    // Add all positions in this diagonal wave
                    for (let row = 0; row < rows; row++) {
                        const col = wave - row
                        if (col >= 0 && col < cols) {
                            newSet.add(row * cols + col)
                        }
                    }
                    return newSet
                })

                // Mark animation as complete after last wave
                if (wave === maxWave) {
                    setAnimationComplete(true)
                }
            }, wave * 100) // 50ms between each wave
        }
    }, [homeGrid.rows, homeGrid.cols, animationComplete])

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

                // Grid Actions Handler
                case 'UPDATE_GRID_CONFIG':
                    setHomeGrid(prev => ({ ...prev, ...action.payload }))
                    break
                case 'SET_GRID_ITEMS':
                    setHomeGrid(prev => ({ ...prev, items: action.payload }))
                    break
                case 'ADD_GRID_ITEM':
                    setHomeGrid(prev => ({ ...prev, items: [...prev.items, action.payload] }))
                    break
                case 'REMOVE_GRID_ITEM':
                    setHomeGrid(prev => ({ ...prev, items: prev.items.filter(i => i.id !== action.payload) }))
                    break
                case 'SET_SELECTED_INDEX':
                    if (action.payload.section === 'grid') {
                        setSelectedSlotIndex(action.payload.index)
                    }
                    break
            }
        })

        return () => {
            window.api.offMainMessage()
        }
    }, [])

    // Navigation Logic
    const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null)
    const selectedSlotItem = selectedSlotIndex !== null
        ? homeGrid.items.find(i => i.position === selectedSlotIndex) || null
        : null

    useEffect(() => {
        if (selectedSlotItem) {
            // Inform Main process about selection change
            window.api.movementControl.send('SELECTION_CHANGED', selectedSlotItem)
        } else {
            // Inform about no selection
            window.api.movementControl.send('SELECTION_CHANGED', null)
        }
    }, [selectedSlotItem])

    useEffect(() => {
        window.api.movementControl.send('SET_SECTION', 'grid')
    }, [])

    useEffect(() => {
        const handleMovementAction = (section: string, action: string) => {
            if (section !== 'grid') return
            const { rows, cols } = homeGrid
            const totalSlots = rows * cols

            // Default selection if none
            if (selectedSlotIndex === null) {
                if (['up', 'down', 'left', 'right'].includes(action)) {
                    setSelectedSlotIndex(0)
                }
                return
            }

            let nextIndex = selectedSlotIndex

            switch (action) {
                case 'right':
                    if ((selectedSlotIndex + 1) % cols !== 0) nextIndex++
                    break
                case 'left':
                    if (selectedSlotIndex % cols !== 0) nextIndex--
                    break
                case 'down':
                    if (selectedSlotIndex + cols < totalSlots) nextIndex += cols
                    break
                case 'up':
                    if (selectedSlotIndex - cols >= 0) nextIndex -= cols
                    break
                case 'back':
                    setSelectedSlotIndex(null)
                    break
                case 'select':
                    if (selectedSlotItem && selectedSlotItem.onClick) {
                        window.api.gridItemControl(selectedSlotItem.onClick, selectedSlotItem)
                    }
                    break
            }

            if (nextIndex !== selectedSlotIndex) {
                setSelectedSlotIndex(nextIndex)
            }
        }

        const removeListener = window.api.movementControl.onAction((section, action) => handleMovementAction(section, action))
        return () => removeListener()

    }, [homeGrid.rows, homeGrid.cols, selectedSlotIndex, selectedSlotItem])

    return (
        <div className='app dot-background'>
            {/* ... Header ... */}
            <div className="header">
                {/* (Header content unchanged) */}
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

            <div className="content island" ref={contentRef}>
                <div className="homeGrid" style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${homeGrid.cols}, ${cellSize.width}px)`,
                    gridTemplateRows: `repeat(${homeGrid.rows}, ${cellSize.height}px)`,
                    gap: `${homeGrid.gap}px`,
                    justifyContent: 'center',
                    alignContent: 'center'
                }}>
                    {Array.from({ length: homeGrid.rows * homeGrid.cols }).map((_, index) => {
                        const item = homeGrid.items.find(i => i.position === index)

                        return (
                            <div
                                key={index}
                                className={`homeSlot ${item ? 'fullSlot' : 'emptySlot'} ${selectedSlotIndex === index ? 'selected' : ''}`}
                                style={{
                                    opacity: visibleSlots.has(index) ? 1 : 0,
                                    transform: visibleSlots.has(index) ? 'scale(1)' : 'scale(0.8)',
                                    transition: 'opacity 0.3s ease-out, transform 0.3s ease-out'
                                }}
                                title={item?.label}
                                onClick={() => {
                                    setSelectedSlotIndex(index)
                                    item?.onClick && window.api.gridItemControl(item.onClick, item)
                                }}
                                onMouseEnter={() => {
                                    setSelectedSlotIndex(index)
                                    item?.onMouseEnter && window.api.gridItemControl(item.onMouseEnter, item)
                                }}
                                onMouseLeave={() => item?.onMouseLeave && window.api.gridItemControl(item.onMouseLeave, item)}
                            >
                                {item ? (
                                    <div className='item' style={{ fontSize: '3rem', color: '#333' }}>
                                        <Icon icon={item.icon} />
                                    </div>
                                ) : (
                                    <div className="slotDot"></div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default MainApp