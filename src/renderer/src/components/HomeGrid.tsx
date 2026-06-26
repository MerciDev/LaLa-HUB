import React, { useRef, useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { HomeGrid as HomeGridType, HomeSlot } from '../../../shared/types'
import { getSlotCells, buildOccupiedCells } from '../utils/gridUtils'

interface HomeGridProps {
    homeGrid: HomeGridType
    currentPage: number
    direction: 'next' | 'prev'
    selectedSlotIndex: number | null
    moveMode?: { slotId: string; ghostPosition: number }
    resizeMode?: { slotId: string }
    onSlotClick: (index: number, item: HomeSlot | undefined) => void
    onSlotHoverEnter: (index: number, item: HomeSlot | undefined) => void
    onSlotHoverLeave: (item: HomeSlot | undefined) => void
    onGridDimensionsAutoChange?: (rows: number, cols: number) => void
}

function getBestSlotImage(item: HomeSlot, cSpan: number, rSpan: number): string | undefined {
    const gameImgs = (item.game as any)?.data?.images || (item.game as any)?.images || {}
    const sq = item.squareImage || gameImgs.home || gameImgs.icon || item.coverImage || item.thumbImage || item.verticalImage || item.horizontalImage || item.image
    const v = item.verticalImage || gameImgs.v_grid || item.coverImage || item.squareImage || item.thumbImage || item.horizontalImage || item.image
    const h = item.horizontalImage || gameImgs.h_grid || item.backgroundImage || item.squareImage || item.coverImage || item.thumbImage || item.verticalImage || item.image

    if (cSpan === rSpan) {
        return sq
    } else if (rSpan > cSpan) {
        return v
    } else {
        return h
    }
}

function HomeGrid({
    homeGrid,
    currentPage,
    selectedSlotIndex,
    moveMode,
    resizeMode,
    onSlotClick,
    onSlotHoverEnter,
    onSlotHoverLeave,
    onGridDimensionsAutoChange
}: HomeGridProps): React.JSX.Element {
    const contentRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useState(0)
    const [cellSize, setCellSize] = useState({ width: 0, height: 0 })
    const [currentGap, setCurrentGap] = useState(homeGrid.gap)

    const autoChangeRef = useRef(onGridDimensionsAutoChange)
    autoChangeRef.current = onGridDimensionsAutoChange

    // Staircase Animation State (runs once on mount)
    const [visibleSlots, setVisibleSlots] = useState<Set<number>>(new Set())
    const [animationComplete, setAnimationComplete] = useState(false)

    // Recalculate grid dimensions on container resize
    useEffect(() => {
        const calculateGrid = () => {
            if (!contentRef.current) return
            const style = window.getComputedStyle(contentRef.current)
            const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
            const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)

            const rawW = contentRef.current.clientWidth - paddingX
            const H = contentRef.current.clientHeight - paddingY
            setContainerWidth(rawW)

            const { rows, cols, aspectRatio } = homeGrid
            const gapVal = rawW < 1000 ? Math.max(4, homeGrid.gap / 2) : homeGrid.gap
            setCurrentGap(gapVal)

            // Auto-adjust density for TARGET_W ~ 200px
            if (rawW > 100 && H > 100 && autoChangeRef.current) {
                const TARGET_W = 200
                const TARGET_H = TARGET_W / aspectRatio
                const idealCols = Math.floor(rawW / (TARGET_W + gapVal)) - 1
                const safeCols = Math.max(3, Math.min(18, idealCols))
                const idealRows = Math.floor((H + gapVal) / (TARGET_H + gapVal))
                const safeRows = Math.max(2, Math.min(8, idealRows))

                if (safeCols !== cols || safeRows !== rows) {
                    autoChangeRef.current(safeRows, safeCols)
                }
            }

            // Calculate cell width so that active grid + half-column peeks + gaps perfectly fill rawW
            const availableW = Math.max(1, rawW - gapVal * (cols + 1))
            const wFromWidth = availableW / (cols + 1)

            const totalGapH = gapVal * (rows - 1)
            const availableH = Math.max(1, H - totalGapH)
            const hFromHeight = availableH / rows
            const wFromHeight = hFromHeight * aspectRatio

            const hFromWidth = wFromWidth / aspectRatio

            let w: number
            let h: number
            if (hFromWidth * rows <= availableH) {
                w = wFromWidth
                h = hFromWidth
            } else {
                w = wFromHeight
                h = hFromHeight
            }

            setCellSize({ width: Math.floor(w), height: Math.floor(h) })
        }

        calculateGrid()
        const observer = new ResizeObserver(calculateGrid)
        if (contentRef.current) observer.observe(contentRef.current)
        return () => observer.disconnect()
    }, [homeGrid.rows, homeGrid.cols, homeGrid.aspectRatio, homeGrid.gap])

    // Staircase diagonal wave animation on initial app load
    useEffect(() => {
        if (animationComplete) return

        const { rows, cols } = homeGrid
        const maxWave = rows - 1 + (cols - 1)

        for (let wave = 0; wave <= maxWave; wave++) {
            setTimeout(() => {
                setVisibleSlots((prev) => {
                    const next = new Set(prev)
                    for (let row = 0; row < rows; row++) {
                        const col = wave - row
                        if (col >= 0 && col < cols) {
                            next.add(row * cols + col)
                        }
                    }
                    return next
                })
                if (wave === maxWave) {
                    setAnimationComplete(true)
                }
            }, wave * 30)
        }
    }, [homeGrid.rows, homeGrid.cols, animationComplete])

    const { rows, cols } = homeGrid
    const totalCells = rows * cols

    // For move mode: figure out which cells would be covered by ghost
    const movingSlot = moveMode
        ? homeGrid.items.find(i => i.id === moveMode.slotId)
        : undefined

    let ghostValid = false
    if (moveMode && movingSlot && moveMode.ghostPosition !== undefined) {
        const cSpan = movingSlot.colSpan ?? 1
        const rSpan = movingSlot.rowSpan ?? 1
        const startCol = moveMode.ghostPosition % cols
        const startRow = Math.floor(moveMode.ghostPosition / cols)
        const fitsInGrid = startCol + cSpan <= cols && startRow + rSpan <= rows
        const occupied = buildOccupiedCells(homeGrid.items, currentPage, cols, moveMode.slotId)
        const cells = fitsInGrid ? getSlotCells(moveMode.ghostPosition, cSpan, rSpan, cols) : []
        ghostValid = fitsInGrid && cells.every(c => !occupied.has(c))
    }

    const renderPageSlots = (page: number, isInteractive: boolean) => {
        const cellMap = new Map<number, HomeSlot>()
        const covered = new Set<number>()

        for (const item of homeGrid.items) {
            if ((item.page ?? 0) !== page) continue
            if (item.position === undefined) continue
            const cSpan = item.colSpan ?? 1
            const rSpan = item.rowSpan ?? 1
            const cells = getSlotCells(item.position, cSpan, rSpan, cols)
            cells.forEach((cell, idx) => {
                if (idx === 0) cellMap.set(cell, item)
                else covered.add(cell)
            })
        }

        return (
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, ${cellSize.width}px)`,
                    gridTemplateRows: `repeat(${rows}, ${cellSize.height}px)`,
                    gap: `${currentGap}px`,
                }}
            >
                {Array.from({ length: totalCells }).map((_, index) => {
                    if (covered.has(index)) return null

                    const item = cellMap.get(index)
                    const cSpan = item?.colSpan ?? 1
                    const rSpan = item?.rowSpan ?? 1

                    if (!isInteractive) {
                        return (
                            <div
                                key={index}
                                className={['homeSlot', item ? 'fullSlot' : 'emptySlot'].filter(Boolean).join(' ')}
                                style={{
                                    gridColumn: cSpan > 1 ? `span ${cSpan}` : undefined,
                                    gridRow: rSpan > 1 ? `span ${rSpan}` : undefined,
                                }}
                                onClick={() => onSlotClick(item ? (item.position ?? index) : index, item)}
                            >
                                {item ? (
                                    <div className="item">
                                        {(() => {
                                            const bestImg = getBestSlotImage(item, cSpan, rSpan)
                                            return bestImg ? (
                                                <img src={bestImg} className="slot-image" draggable={false} />
                                            ) : (
                                                <Icon icon={item.icon} />
                                            )
                                        })()}
                                    </div>
                                ) : (
                                    <div className="slotDot" />
                                )}
                            </div>
                        )
                    }

                    // A slot is selected if selectedSlotIndex falls within any of its cells
                    const isSelected = selectedSlotIndex !== null && item != null
                        ? getSlotCells(item.position!, cSpan, rSpan, cols).includes(selectedSlotIndex)
                        : selectedSlotIndex === index && item == null

                    const isVisible = animationComplete || visibleSlots.has(index)
                    const isMoveOrigin = moveMode && item?.id === moveMode.slotId
                    const isResizeTarget = resizeMode && item?.id === resizeMode.slotId

                    return (
                        <motion.div
                            key={index}
                            className={[
                                'homeSlot',
                                item ? 'fullSlot' : 'emptySlot',
                                isSelected ? 'selected' : '',
                                isMoveOrigin ? 'move-origin' : '',
                                isResizeTarget ? 'resize-target' : '',
                            ].filter(Boolean).join(' ')}
                            initial={false}
                            animate={{
                                opacity: isVisible ? (isMoveOrigin ? 0.4 : 1) : 0,
                                scale: isSelected ? 1.02 : 1,
                                y: isVisible ? 0 : 10,
                                zIndex: isSelected ? 10 : 1
                            }}
                            transition={{
                                scale: { type: 'spring', stiffness: 350, damping: 25 },
                                opacity: { duration: 0.25 },
                                y: { duration: 0.25 }
                            }}
                            style={{
                                gridColumn: cSpan > 1 ? `span ${cSpan}` : undefined,
                                gridRow: rSpan > 1 ? `span ${rSpan}` : undefined,
                            }}
                            title={item?.label}
                            onClick={() => onSlotClick(item ? (item.position ?? index) : index, item)}
                            onMouseEnter={() => onSlotHoverEnter(item ? (item.position ?? index) : index, item)}
                            onMouseLeave={() => onSlotHoverLeave(item)}
                        >
                            {item ? (
                                <div className="item">
                                    {(() => {
                                        const bestImg = getBestSlotImage(item, cSpan, rSpan)
                                        return bestImg ? (
                                            <img src={bestImg} className="slot-image" draggable={false} />
                                        ) : (
                                            <Icon icon={item.icon} />
                                        )
                                    })()}
                                    {(() => {
                                        const labelPos = item.labelPosition || 'bottom'
                                        const iconPos = item.iconPosition || 'bottom-right'
                                        return (
                                            <>
                                                <div 
                                                    className={`slot-label ${item.showLabel ? 'slot-label--always' : ''}`}
                                                    style={{
                                                        opacity: item.showLabel ? 1 : undefined,
                                                        bottom: labelPos === 'top' || labelPos === 'center' ? 'auto' : 0,
                                                        top: labelPos === 'top' ? 0 : labelPos === 'center' ? '50%' : 'auto',
                                                        transform: item.showLabel ? (labelPos === 'center' ? 'translateY(-50%)' : 'none') : undefined,
                                                        background: labelPos === 'top' ? 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%)' : labelPos === 'center' ? 'rgba(0,0,0,0.75)' : undefined
                                                    }}
                                                >
                                                    {item.label}
                                                </div>
                                                {item.showIcon && (
                                                    <div
                                                        className="slot-icon-badge"
                                                        style={{
                                                            position: 'absolute',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: (item.iconSize || 64) - 8,
                                                            zIndex: 5,
                                                            color: '#fff',
                                                            filter: 'drop-shadow(0px 2px 5px rgba(0,0,0,0.8))',
                                                            top: iconPos.startsWith('top') ? 10 : 'auto',
                                                            bottom: iconPos.startsWith('bottom') ? 10 : 'auto',
                                                            left: iconPos.endsWith('left') ? 10 : 'auto',
                                                            right: iconPos.endsWith('right') ? 10 : 'auto',
                                                        }}
                                                    >
                                                        {item.iconImage ? (
                                                            <img src={item.iconImage} alt="icon" style={{ width: item.iconSize || 64, height: item.iconSize || 64, objectFit: 'cover', borderRadius: 8 }} />
                                                        ) : (
                                                            <Icon icon={item.icon} />
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )
                                    })()}
                                    {isResizeTarget && (
                                        <div className="resize-overlay">
                                            <span>{cSpan}×{rSpan}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="slotDot" />
                            )}
                        </motion.div>
                    )
                })}
                {isInteractive && moveMode && movingSlot && moveMode.ghostPosition !== undefined && (() => {
                    const cSpan = movingSlot.colSpan ?? 1
                    const rSpan = movingSlot.rowSpan ?? 1
                    const startCol = (moveMode.ghostPosition % cols) + 1
                    const startRow = Math.floor(moveMode.ghostPosition / cols) + 1
                    return (
                        <div
                            className={`homeSlot ghost-merged ${ghostValid ? 'ghost-valid' : 'ghost-invalid'}`}
                            style={{
                                gridColumn: `${startCol} / span ${Math.min(cSpan, cols - startCol + 1)}`,
                                gridRow: `${startRow} / span ${Math.min(rSpan, rows - startRow + 1)}`,
                                pointerEvents: 'none',
                                zIndex: 25,
                                position: 'relative'
                            }}
                        >
                            <div className={`slot-ghost ${ghostValid ? 'slot-ghost--valid' : 'slot-ghost--invalid'}`} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon icon={ghostValid ? 'mynaui:check' : 'mynaui:x'} style={{ fontSize: '2.5rem' }} />
                            </div>
                        </div>
                    )
                })()}
            </div>
        )
    }

    const maxPage = Math.max(2, ...homeGrid.items.map((i) => i.page ?? 0))
    const totalPages = Math.max(homeGrid.totalPages || 3, maxPage + 1, currentPage + 2)
    const fullGridW = cols * cellSize.width + (cols - 1) * currentGap

    const sideMargin = Math.max(0, (containerWidth - fullGridW) / 2)
    const trackOffset = sideMargin - currentPage * (fullGridW + currentGap)

    return (
        <div className="content" ref={contentRef} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
            <motion.div
                className="grid-slider-track"
                animate={{ x: trackOffset }}
                transition={{ type: 'spring', stiffness: 350, damping: 32 }}
                style={{
                    display: 'flex',
                    gap: `${currentGap}px`,
                    alignItems: 'center',
                    height: '100%',
                    width: 'max-content'
                }}
            >
                {Array.from({ length: totalPages }).map((_, pIndex) => (
                    <div
                        key={pIndex}
                        style={{
                            width: fullGridW,
                            flexShrink: 0,
                            opacity: pIndex === currentPage ? 1 : 0.65,
                            transition: 'opacity 0.3s ease'
                        }}
                    >
                        {renderPageSlots(pIndex, pIndex === currentPage)}
                    </div>
                ))}
            </motion.div>
        </div>
    )
}

export default HomeGrid
