import { useRef, useState } from 'react'
import { HomeSlot } from '../../../shared/types'
import { getSlotCells } from '../components/HomeGrid'

/**
 * Given any cell index (including covered cells of spanning slots),
 * returns the anchor cell index of the slot that occupies it.
 * If no slot occupies it, returns the cell index itself.
 */
function resolveAnchor(cellIndex: number, items: HomeSlot[], page: number, cols: number): number {
    for (const item of items) {
        if ((item.page ?? 0) !== page) continue
        if (item.position === undefined) continue
        const cSpan = item.colSpan ?? 1
        const rSpan = item.rowSpan ?? 1
        if (cSpan === 1 && rSpan === 1) continue // no need to check single cells
        const cells = getSlotCells(item.position, cSpan, rSpan, cols)
        if (cells.includes(cellIndex)) return item.position
    }
    return cellIndex
}

/**
 * When navigating INTO a spanning slot from a direction, we want to land on
 * the anchor cell, but we need to find the right "entry" cell first.
 * 
 * From 'right': the leftmost column of the slot
 * From 'left': the rightmost column of the slot
 * From 'down': the topmost row of the slot
 * From 'up': the bottommost row of the slot
 */
function resolveAnchorFromDirection(
    rawNext: number,
    items: HomeSlot[],
    page: number,
    cols: number,
    action: string
): number {
    // Find which slot owns rawNext
    for (const item of items) {
        if ((item.page ?? 0) !== page) continue
        if (item.position === undefined) continue
        const cSpan = item.colSpan ?? 1
        const rSpan = item.rowSpan ?? 1
        if (cSpan === 1 && rSpan === 1) continue
        const cells = getSlotCells(item.position, cSpan, rSpan, cols)
        if (cells.includes(rawNext)) {
            // Always land on anchor
            return item.position
        }
    }
    return rawNext
}

/**
 * Compute the "effective right edge" of the slot at startPos.
 * Used to determine if 'right' should go to the cell after the span ends.
 */
function getRightEdge(pos: number, items: HomeSlot[], page: number, cols: number): number {
    const item = items.find(i => i.position === pos && (i.page ?? 0) === page)
    if (!item) return pos
    const cSpan = item.colSpan ?? 1
    const startCol = pos % cols
    return pos + (cSpan - 1) // rightmost anchor-row cell of this span
}

function getBottomEdge(pos: number, items: HomeSlot[], page: number, cols: number): number {
    const item = items.find(i => i.position === pos && (i.page ?? 0) === page)
    if (!item) return pos
    const rSpan = item.rowSpan ?? 1
    return pos + (rSpan - 1) * cols // bottommost anchor-col cell of this span
}

/**
 * Custom hook to manage grid selection and page-boundary navigation.
 * Span-aware: correctly resolves anchor cells for multi-cell slots.
 */
export function useGridNavigation(rows: number, cols: number) {
    const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(0)
    const pendingSelectionRef = useRef<number | null>(null)

    const navigate = (action: string, items: HomeSlot[], currentPage: number, totalPages: number = 1) => {
        const totalSlots = rows * cols
        let pageActionToTrigger: 'next' | 'prev' | null = null

        const prevIndex = selectedSlotIndex

        if (prevIndex === null) {
            if (['up', 'down', 'left', 'right'].includes(action)) {
                setSelectedSlotIndex(0)
            }
            return
        }

        // Resolve to anchor in case we're somehow on a covered cell
        const anchoredPrev = resolveAnchor(prevIndex, items, currentPage, cols)
        let nextIndex = anchoredPrev

        switch (action) {
            case 'right': {
                const rightEdge = getRightEdge(anchoredPrev, items, currentPage, cols)
                const rightEdgeCol = rightEdge % cols
                if (rightEdgeCol === cols - 1) {
                    if (currentPage < totalPages - 1) {
                        if (pendingSelectionRef.current === null) {
                            const row = Math.floor(anchoredPrev / cols)
                            pendingSelectionRef.current = row * cols
                            pageActionToTrigger = 'next'
                        }
                    }
                } else {
                    const raw = rightEdge + 1
                    nextIndex = resolveAnchorFromDirection(raw, items, currentPage, cols, 'right')
                }
                break
            }
            case 'left': {
                const startCol = anchoredPrev % cols
                if (startCol === 0) {
                    if (currentPage > 0) {
                        if (pendingSelectionRef.current === null) {
                            const row = Math.floor(anchoredPrev / cols)
                            pendingSelectionRef.current = row * cols + cols - 1
                            pageActionToTrigger = 'prev'
                        }
                    }
                } else {
                    const raw = anchoredPrev - 1
                    nextIndex = resolveAnchorFromDirection(raw, items, currentPage, cols, 'left')
                }
                break
            }
            case 'down': {
                const bottomEdge = getBottomEdge(anchoredPrev, items, currentPage, cols)
                if (bottomEdge + cols < totalSlots) {
                    const raw = bottomEdge + cols
                    nextIndex = resolveAnchorFromDirection(raw, items, currentPage, cols, 'down')
                }
                break
            }
            case 'up': {
                if (anchoredPrev - cols >= 0) {
                    const raw = anchoredPrev - cols
                    nextIndex = resolveAnchorFromDirection(raw, items, currentPage, cols, 'up')
                }
                break
            }
            case 'back':
                setSelectedSlotIndex(null)
                return
            case 'select': {
                const selectedItem = items.find(
                    (i) => i.position === anchoredPrev && (i.page ?? 0) === currentPage
                )
                if (selectedItem?.onClick) {
                    window.api.gridItemControl(selectedItem.onClick, selectedItem)
                }
                nextIndex = anchoredPrev
                break
            }
        }

        setSelectedSlotIndex(nextIndex)

        if (pageActionToTrigger) {
            window.api.movementControl.send('PAGE_ACTION', pageActionToTrigger)
        }
    }

    const applyPendingSelection = () => {
        if (pendingSelectionRef.current !== null) {
            setSelectedSlotIndex(pendingSelectionRef.current)
            pendingSelectionRef.current = null
        }
    }

    const clearPendingSelection = () => {
        pendingSelectionRef.current = null
    }

    return {
        selectedSlotIndex,
        setSelectedSlotIndex,
        navigate,
        applyPendingSelection,
        clearPendingSelection
    }
}
