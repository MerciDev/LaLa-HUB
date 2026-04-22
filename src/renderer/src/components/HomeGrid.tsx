import React, { useRef, useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { HomeGrid as HomeGridType, HomeSlot } from '../../../shared/types'

/**
 * Returns all [row, col] positions covered by a slot given its position index.
 */
export function getSlotCells(
    position: number,
    colSpan: number,
    rowSpan: number,
    cols: number
): number[] {
    const startRow = Math.floor(position / cols)
    const startCol = position % cols
    const cells: number[] = []
    for (let r = 0; r < rowSpan; r++) {
        for (let c = 0; c < colSpan; c++) {
            cells.push((startRow + r) * cols + (startCol + c))
        }
    }
    return cells
}

/**
 * Builds a Set of all cell indices occupied by any slot on this page.
 * The "anchor" slot (the one being moved/resized) can be excluded so it doesn't conflict with itself.
 */
export function buildOccupiedCells(
    items: HomeSlot[],
    page: number,
    cols: number,
    excludeId?: string
): Set<number> {
    const occupied = new Set<number>()
    for (const item of items) {
        if ((item.page ?? 0) !== page) continue
        if (item.id === excludeId) continue
        if (item.position === undefined) continue
        const cells = getSlotCells(item.position, item.colSpan ?? 1, item.rowSpan ?? 1, cols)
        cells.forEach(c => occupied.add(c))
    }
    return occupied
}

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
}

function HomeGrid({
    homeGrid,
    currentPage,
    direction,
    selectedSlotIndex,
    moveMode,
    resizeMode,
    onSlotClick,
    onSlotHoverEnter,
    onSlotHoverLeave
}: HomeGridProps): React.JSX.Element {
    const contentRef = useRef<HTMLDivElement>(null)
    const [cellSize, setCellSize] = useState({ width: 0, height: 0 })
    const [currentGap, setCurrentGap] = useState(homeGrid.gap)

    // Staircase Animation State
    const [visibleSlots, setVisibleSlots] = useState<Set<number>>(new Set())
    const [animationComplete, setAnimationComplete] = useState(false)

    // Recalculate grid dimensions on container resize
    useEffect(() => {
        const calculateGrid = () => {
            if (!contentRef.current) return
            const style = window.getComputedStyle(contentRef.current)
            const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
            const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)

            const W = contentRef.current.clientWidth - paddingX
            const H = contentRef.current.clientHeight - paddingY
            const { rows, cols, aspectRatio } = homeGrid

            const gapVal = W < 1000 ? Math.max(4, homeGrid.gap / 2) : homeGrid.gap
            setCurrentGap(gapVal)

            const totalGapW = gapVal * (cols - 1)
            const totalGapH = gapVal * (rows - 1)
            const availableW = Math.max(1, W - totalGapW)
            const availableH = Math.max(1, H - totalGapH)

            const wFromWidth = availableW / cols
            const hFromWidth = wFromWidth / aspectRatio
            const hFromHeight = availableH / rows
            const wFromHeight = hFromHeight * aspectRatio

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
    }, [homeGrid])

    // Staircase diagonal wave animation on page change
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

    // Reset animation when page changes
    useEffect(() => {
        setVisibleSlots(new Set())
        setAnimationComplete(false)
    }, [currentPage])

    const { rows, cols } = homeGrid
    const totalCells = rows * cols

    // Build a map of cell-index -> slot for fast lookup
    const cellToSlot = new Map<number, HomeSlot>()
    // Track which cells are "covered" by a spanning slot (but not the anchor cell)
    const coveredCells = new Set<number>()

    for (const item of homeGrid.items) {
        if ((item.page ?? 0) !== currentPage) continue
        if (item.position === undefined) continue
        const cSpan = item.colSpan ?? 1
        const rSpan = item.rowSpan ?? 1
        const cells = getSlotCells(item.position, cSpan, rSpan, cols)
        cells.forEach((cell, idx) => {
            if (idx === 0) {
                cellToSlot.set(cell, item)
            } else {
                coveredCells.add(cell)
            }
        })
    }

    // For move mode: figure out which cells would be covered by ghost
    const movingSlot = moveMode
        ? homeGrid.items.find(i => i.id === moveMode.slotId)
        : undefined

    const ghostCells = new Set<number>()
    let ghostValid = false
    if (moveMode && movingSlot && moveMode.ghostPosition !== undefined) {
        const cSpan = movingSlot.colSpan ?? 1
        const rSpan = movingSlot.rowSpan ?? 1
        const startCol = moveMode.ghostPosition % cols
        const startRow = Math.floor(moveMode.ghostPosition / cols)
        // Check fits in grid
        const fitsInGrid = startCol + cSpan <= cols && startRow + rSpan <= rows
        const occupied = buildOccupiedCells(homeGrid.items, currentPage, cols, moveMode.slotId)
        const cells = fitsInGrid ? getSlotCells(moveMode.ghostPosition, cSpan, rSpan, cols) : []
        ghostValid = fitsInGrid && cells.every(c => !occupied.has(c))
        cells.forEach(c => ghostCells.add(c))
    }

    // For resize mode
    const resizingSlot = resizeMode
        ? homeGrid.items.find(i => i.id === resizeMode.slotId)
        : undefined

    return (
        <div className="content" ref={contentRef}>
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, x: direction === 'next' ? 40 : -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction === 'next' ? -40 : 40 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cols}, ${cellSize.width}px)`,
                        gridTemplateRows: `repeat(${rows}, ${cellSize.height}px)`,
                        gap: `${currentGap}px`,
                    }}
                >
                    {Array.from({ length: totalCells }).map((_, index) => {
                        // Skip cells that are covered by a spanning slot
                        if (coveredCells.has(index)) return null

                        const item = cellToSlot.get(index)
                        const cSpan = item?.colSpan ?? 1
                        const rSpan = item?.rowSpan ?? 1

                        // A slot is selected if selectedSlotIndex falls within any of its cells
                        const isSelected = selectedSlotIndex !== null && item != null
                            ? getSlotCells(item.position!, cSpan, rSpan, cols).includes(selectedSlotIndex)
                            : selectedSlotIndex === index && item == null

                        const isVisible = animationComplete || visibleSlots.has(index)

                        // Move mode ghost highlight
                        const isGhostCell = ghostCells.has(index)
                        const isMoveOrigin = moveMode && item?.id === moveMode.slotId

                        // Resize mode
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
                                    isGhostCell && !item ? (ghostValid ? 'ghost-valid' : 'ghost-invalid') : '',
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
                                {isGhostCell && !item && (
                                    <div className={`slot-ghost ${ghostValid ? 'slot-ghost--valid' : 'slot-ghost--invalid'}`}>
                                        <Icon icon={ghostValid ? 'mynaui:check' : 'mynaui:x'} />
                                    </div>
                                )}
                                {item ? (
                                    <div className="item">
                                        {item.thumbImage || item.squareImage ? (
                                            <img
                                                src={item.thumbImage || item.squareImage}
                                                className="slot-image"
                                                draggable={false}
                                            />
                                        ) : (
                                            <Icon icon={item.icon} />
                                        )}
                                        <div className="slot-label">{item.label}</div>
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
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

export default HomeGrid
