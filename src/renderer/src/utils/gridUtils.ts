import { HomeSlot } from '../../../shared/types'

export interface SlotIdeal {
    colSpan: number
    rowSpan: number
    col: number
    row: number
    page: number
}

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

export function repackItemsAfterResize(
    items: HomeSlot[],
    cols: number,
    rows: number,
    idealSlots?: Map<string, SlotIdeal>
): HomeSlot[] {
    const slotsPerPage = cols * rows
    const updated: HomeSlot[] = []
    const unplaced: { item: HomeSlot; cSpan: number; rSpan: number; preferredPage: number }[] = []

    // Pass 1: Try to place items at their desired coordinates without altering their spans
    for (const item of items) {
        const ideal = idealSlots?.get(item.id)
        const desiredCSpan = ideal?.colSpan ?? item.colSpan ?? 1
        const desiredRSpan = ideal?.rowSpan ?? item.rowSpan ?? 1
        
        // Clamp span only if it is physically larger than the grid itself
        const cSpan = Math.max(1, Math.min(desiredCSpan, cols))
        const rSpan = Math.max(1, Math.min(desiredRSpan, rows))

        let targetCol = ideal ? ideal.col : (item.col !== undefined ? item.col : (item.position !== undefined ? item.position % cols : 0))
        let targetRow = ideal ? ideal.row : (item.row !== undefined ? item.row : (item.position !== undefined ? Math.floor(item.position / cols) : 0))
        let targetPage = ideal ? (ideal.page ?? 0) : (item.page ?? 0)

        // Check if item fits within grid boundaries at this coordinate
        if (targetCol + cSpan <= cols && targetRow + rSpan <= rows) {
            const pos = targetRow * cols + targetCol
            if (pos < slotsPerPage) {
                const occupied = buildOccupiedCells(updated, targetPage, cols)
                const cells = getSlotCells(pos, cSpan, rSpan, cols)
                if (cells.every(c => !occupied.has(c))) {
                    updated.push({
                        ...item,
                        position: pos,
                        col: targetCol,
                        row: targetRow,
                        page: targetPage,
                        colSpan: cSpan,
                        rowSpan: rSpan
                    })
                    continue
                }
            }
        }

        // If it collides or is out of bounds, push to unplaced without shrinking!
        unplaced.push({ item, cSpan, rSpan, preferredPage: targetPage })
    }

    // Pass 2: Place any unplaced items into the first available spot where their full size fits
    for (const { item, cSpan, rSpan, preferredPage } of unplaced) {
        let page = preferredPage
        let placed = false
        while (!placed) {
            const occupied = buildOccupiedCells(updated, page, cols)
            for (let pos = 0; pos < slotsPerPage && !placed; pos++) {
                const startRow = Math.floor(pos / cols)
                const startCol = pos % cols
                if (startCol + cSpan > cols || startRow + rSpan > rows) continue
                const cells = getSlotCells(pos, cSpan, rSpan, cols)
                if (cells.every(c => !occupied.has(c))) {
                    updated.push({
                        ...item,
                        position: pos,
                        col: startCol,
                        row: startRow,
                        page,
                        colSpan: cSpan,
                        rowSpan: rSpan
                    })
                    placed = true
                }
            }
            if (!placed) page++
        }
    }

    return updated
}

export function computeMinGridDimensions(items: HomeSlot[]): { minRows: number; minCols: number } {
    let maxRowSpan = 1
    let maxColSpan = 1
    for (const item of items) {
        maxRowSpan = Math.max(maxRowSpan, item.rowSpan ?? 1)
        maxColSpan = Math.max(maxColSpan, item.colSpan ?? 1)
    }
    return { minRows: maxRowSpan, minCols: maxColSpan }
}
