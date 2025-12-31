import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { AppAction, HomeGrid, IconOption, ContextOption } from '../../../../shared/types'

function MainApp(): React.JSX.Element {
    const [infoText, setInfoText] = useState('')

    // State
    const [mainIcons, setMainIcons] = useState<IconOption[]>([])
    const [mainExpanded, setMainExpanded] = useState(false)
    const mainOptionsRef = useRef<HTMLDivElement>(null)
    const pendingSelectionRef = useRef<number | null>(null)

    const [socialIcons, setSocialIcons] = useState<IconOption[]>([])
    const [socialExpanded, setSocialExpanded] = useState(false)
    const socialOptionsRef = useRef<HTMLDivElement>(null)

    // Context Menu State
    const [contextMenuVisible, setContextMenuVisible] = useState(false)
    const [contextOptions, setContextOptions] = useState<ContextOption[]>([])
    const [contextMenuSelectedIndex, setContextMenuSelectedIndex] = useState(0)

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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(0)
    const [direction, setDirection] = useState<'next' | 'prev'>('next')

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
            }, wave * 25) // 25ms between each wave
        }
    }, [homeGrid.rows, homeGrid.cols, animationComplete, currentPage])

    // Add Game Modal
    const [addGameModalVisible, setAddGameModalVisible] = useState(false)
    const [addGameSelectedIndex, setAddGameSelectedIndex] = useState(0)

    const handleContextOptionClick = (option: ContextOption) => {
        if (option.label === 'Add' || option.action === 'ADD_GAME') {
            setAddGameModalVisible(true)
            setAddGameSelectedIndex(0) // Reset to first input
            setContextMenuVisible(false)
            setSelectedSlotIndex(null) // Deselect grid item
            setInfoText('Add Game')
            setIslandWidth('50%')
            window.api.movementControl.send('SET_SECTION', 'add-game-modal')
        } else if (option.action) {
            window.api.contextMenuControl.send('execute', option.action)
        }
    }

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
                case 'SET_GRID_PAGE':
                    setDirection(action.payload > currentPage ? 'next' : 'prev')
                    setVisibleSlots(new Set()) // Reset visibility
                    setCurrentPage(action.payload)
                    setAnimationComplete(false) // Trigger animation reset

                    // Apply pending selection if page changed via boundary
                    if (pendingSelectionRef.current !== null) {
                        setSelectedSlotIndex(pendingSelectionRef.current)
                        pendingSelectionRef.current = null
                    }
                    break

                // Context Menu Actions
                case 'TOGGLE_CONTEXT_MENU':
                    setContextMenuVisible(action.payload)
                    break
                case 'SET_CONTEXT_OPTIONS':
                    setContextOptions(action.payload)
                    break
                case 'ADD_CONTEXT_OPTION':
                    setContextOptions(prev => [...prev, action.payload])
                    break
                case 'REMOVE_CONTEXT_OPTION':
                    setContextOptions(prev => prev.filter(o => o.id !== action.payload))
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
            if (section === 'grid') {
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
                        if ((selectedSlotIndex + 1) % cols === 0) {
                            const row = Math.floor(selectedSlotIndex / cols)
                            pendingSelectionRef.current = row * cols
                            window.api.movementControl.send('PAGE_ACTION', 'next')
                        } else if ((selectedSlotIndex + 1) % cols !== 0) nextIndex++
                        break
                    case 'left':
                        if (selectedSlotIndex % cols === 0) {
                            const row = Math.floor(selectedSlotIndex / cols)
                            pendingSelectionRef.current = row * cols + cols - 1
                            window.api.movementControl.send('PAGE_ACTION', 'prev')
                        } else if (selectedSlotIndex % cols !== 0) nextIndex--
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
            } else if (section === 'context-menu') {
                if (contextOptions.length === 0) return

                switch (action) {
                    case 'right':
                        setContextMenuSelectedIndex(prev => (prev + 1) % contextOptions.length)
                        break
                    case 'left':
                        setContextMenuSelectedIndex(prev => (prev - 1 + contextOptions.length) % contextOptions.length)
                        break
                    case 'select':
                        const selectedOption = contextOptions[contextMenuSelectedIndex]
                        if (selectedOption) {
                            if (selectedOption.label === 'Add' || selectedOption.action === 'ADD_GAME') {
                                setAddGameModalVisible(true)
                                setAddGameSelectedIndex(0)
                                setContextMenuVisible(false)
                                setSelectedSlotIndex(null)
                                setInfoText('Add Game')
                                setIslandWidth('50%')
                                window.api.movementControl.send('SET_SECTION', 'add-game-modal')
                            } else if (selectedOption.action) {
                                window.api.contextMenuControl.send('execute', selectedOption.action)
                            }
                        }
                        break
                }
            } else if (section === 'add-game-modal') {
                /*
                  Map Index:
                  0: Game Name
                  1: Game Path
                  2: Browse Button
                  3: Console
                  4: Is Emulated
                  5: Cancel
                  6: Save
                */
                switch (action) {
                    case 'down':
                        if (addGameSelectedIndex === 0) setAddGameSelectedIndex(1)
                        else if (addGameSelectedIndex === 1) setAddGameSelectedIndex(3)
                        else if (addGameSelectedIndex === 2) setAddGameSelectedIndex(4) // From Browse to Checkbox
                        else if (addGameSelectedIndex === 3) setAddGameSelectedIndex(5) // From Console to Cancel
                        else if (addGameSelectedIndex === 4) setAddGameSelectedIndex(6) // From Checkbox to Save
                        break
                    case 'up':
                        if (addGameSelectedIndex === 1) setAddGameSelectedIndex(0)
                        else if (addGameSelectedIndex === 2) setAddGameSelectedIndex(0)
                        else if (addGameSelectedIndex === 3) setAddGameSelectedIndex(1)
                        else if (addGameSelectedIndex === 4) setAddGameSelectedIndex(2) // From Checkbox to Browse
                        else if (addGameSelectedIndex === 5) setAddGameSelectedIndex(3) // From Cancel to Console
                        else if (addGameSelectedIndex === 6) setAddGameSelectedIndex(4) // From Save to Checkbox
                        break
                    case 'right':
                        if (addGameSelectedIndex === 1) setAddGameSelectedIndex(2) // Path -> Browse
                        else if (addGameSelectedIndex === 3) setAddGameSelectedIndex(4) // Console -> Checkbox
                        else if (addGameSelectedIndex === 5) setAddGameSelectedIndex(6) // Cancel -> Save
                        break
                    case 'left':
                        if (addGameSelectedIndex === 2) setAddGameSelectedIndex(1) // Browse -> Path
                        else if (addGameSelectedIndex === 4) setAddGameSelectedIndex(3) // Checkbox -> Console
                        else if (addGameSelectedIndex === 6) setAddGameSelectedIndex(5) // Save -> Cancel
                        break
                    case 'back':
                    case 'escape': // Support escape key too if valid action
                        setAddGameModalVisible(false)
                        setInfoText('')
                        setIslandWidth('56px')
                        window.api.movementControl.send('SET_SECTION', 'grid')
                        break
                    case 'select':
                        if (addGameSelectedIndex === 5) { // Cancel
                            setAddGameModalVisible(false)
                            setInfoText('')
                            setIslandWidth('56px')
                            window.api.movementControl.send('SET_SECTION', 'grid')
                        }
                        // Handle other selects like Save or Browse here later
                        break
                }
            }
        }

        const removeListener = window.api.movementControl.onAction((section, action) => handleMovementAction(section, action))
        return () => removeListener()

    }, [homeGrid.rows, homeGrid.cols, selectedSlotIndex, selectedSlotItem, contextOptions, contextMenuSelectedIndex, addGameSelectedIndex])

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
                        const item = homeGrid.items.find(i => i.position === index && (i.page ?? 0) === currentPage)

                        return (
                            <div
                                key={index}
                                className={`homeSlot ${item ? 'fullSlot' : 'emptySlot'} ${selectedSlotIndex === index ? 'selected' : ''}`}
                                style={{
                                    opacity: visibleSlots.has(index) ? 1 : 0,
                                    transform: !animationComplete
                                        ? (visibleSlots.has(index) ? 'scale(1) translateX(0)' : `scale(0.8) translateX(${direction === 'next' ? '100px' : '-100px'})`)
                                        : undefined,
                                    transition: !animationComplete
                                        ? 'opacity 0.3s ease-out, transform 0.3s ease-out'
                                        : undefined
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
            <div className={`contextMenu island ${contextMenuVisible ? 'visible' : ''}`}>
                {contextOptions.map((option, index) => (
                    <div
                        key={option.id}
                        className={`contextOption ${index === contextMenuSelectedIndex ? 'selected' : ''}`}
                        onClick={() => handleContextOptionClick(option)}
                    >
                        <Icon icon={option.icon} width="24" height="24" style={{ marginRight: '8px' }} />
                        {option.label}
                    </div>
                ))}
            </div>
            <div className={`modal-addGame island ${addGameModalVisible ? 'visible' : ''}`}>
                <div className="modalContent">
                    <input
                        type="text"
                        className={`input-field ${addGameSelectedIndex === 0 ? 'focused' : ''}`}
                        placeholder="Game Name"
                        style={{ outline: addGameSelectedIndex === 0 ? '2px solid var(--home-blue)' : 'none' }}
                    />

                    <div className="pathContainer">
                        <input
                            type="text"
                            className={`input-field ${addGameSelectedIndex === 1 ? 'focused' : ''}`}
                            placeholder="Game Path"
                            style={{ outline: addGameSelectedIndex === 1 ? '2px solid var(--home-blue)' : 'none' }}
                        />
                        <button
                            className={`btn btn-secondary ${addGameSelectedIndex === 2 ? 'focused' : ''}`}
                            style={{ outline: addGameSelectedIndex === 2 ? '2px solid var(--home-blue)' : 'none' }}
                        >
                            Browse
                        </button>
                    </div>

                    <div className="consoleContainer">
                        <input
                            type="text"
                            className={`input-field ${addGameSelectedIndex === 3 ? 'focused' : ''}`}
                            placeholder="Console"
                            style={{ outline: addGameSelectedIndex === 3 ? '2px solid var(--home-blue)' : 'none' }}
                        />
                        <label
                            className={`checkbox-field ${addGameSelectedIndex === 4 ? 'focused' : ''}`}
                            style={{ outline: addGameSelectedIndex === 4 ? '2px solid var(--home-blue)' : 'none', padding: '5px', borderRadius: '8px' }}
                        >
                            <input type="checkbox" />
                            <span>Is Emulated</span>
                        </label>
                    </div>

                    <div className="buttonContainer">
                        <button
                            className={`btn btn-secondary ${addGameSelectedIndex === 5 ? 'focused' : ''}`}
                            onClick={() => {
                                setAddGameModalVisible(false)
                                setInfoText('')
                                setIslandWidth('56px')
                                window.api.movementControl.send('SET_SECTION', 'grid')
                            }}
                            style={{ outline: addGameSelectedIndex === 5 ? '2px solid var(--home-blue)' : 'none' }}
                        >
                            Cancel
                        </button>
                        <button
                            className={`btn btn-primary ${addGameSelectedIndex === 6 ? 'focused' : ''}`}
                            style={{ outline: addGameSelectedIndex === 6 ? '2px solid var(--home-blue)' : 'none' }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div >
    )
}

export default MainApp