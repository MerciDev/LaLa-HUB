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

    const unplaced: HomeSlot[] = []

    // Pass 1: Try to restore ideal sizes first, then shrink to fit, then fallback
    for (const item of items) {
        if (item.position !== undefined && item.page !== undefined) {
            const pos = item.position
            let page = item.page
            let cSpan = item.colSpan ?? 1
            let rSpan = item.rowSpan ?? 1
            const startCol = pos % cols
            const startRow = Math.floor(pos / cols)

            // Try to restore from ideal (best effort: clip size to available space)
            const ideal = idealSlots?.get(item.id)
            if (ideal && ideal.page !== undefined) {
                const idealPos = ideal.row * cols + ideal.col
                if (idealPos < slotsPerPage) {
                    const iCol = idealPos % cols
                    const iRow = Math.floor(idealPos / cols)
                    const maxC = Math.min(ideal.colSpan, cols - iCol)
                    const maxR = Math.min(ideal.rowSpan, rows - iRow)
                    if (maxC >= 1 && maxR >= 1) {
                        const occupied = buildOccupiedCells(updated, ideal.page, cols)
                        const idealCells = getSlotCells(idealPos, maxC, maxR, cols)
                        if (idealCells.every(c => !occupied.has(c))) {
                            updated.push({
                                ...item,
                                position: idealPos,
                                page: ideal.page,
                                colSpan: maxC,
                                rowSpan: maxR,
                            })
                            continue
                        }
                    }
                }
            }

            // Try current position with current size
            if (pos < slotsPerPage && startCol + cSpan <= cols && startRow + rSpan <= rows) {
                const occupied = buildOccupiedCells(updated, page, cols)
                const cells = getSlotCells(pos, cSpan, rSpan, cols)
                if (cells.every(c => !occupied.has(c))) {
                    updated.push(item)
                    continue
                }
            }

            // Try shrinking (down to 1x1) to keep position
            let shrinkC = cSpan
            let shrinkR = rSpan
            while ((shrinkC > 1 || shrinkR > 1) && pos < slotsPerPage) {
                if (startCol + shrinkC > cols && shrinkC > 1) shrinkC--
                else if (startRow + shrinkR > rows && shrinkR > 1) shrinkR--
                else break
            }
            if (pos < slotsPerPage && startCol + shrinkC <= cols && startRow + shrinkR <= rows) {
                const occupied = buildOccupiedCells(updated, page, cols)
                const cells = getSlotCells(pos, shrinkC, shrinkR, cols)
                if (cells.every(c => !occupied.has(c))) {
                    const shrunk = shrinkC !== cSpan || shrinkR !== rSpan
                    updated.push(shrunk ? { ...item, colSpan: shrinkC, rowSpan: shrinkR } : item)
                    continue
                }
            }

            // Try same position with 1x1 as last resort before moving page
            if (pos < slotsPerPage) {
                const occupied = buildOccupiedCells(updated, page, cols)
                if (!occupied.has(pos)) {
                    updated.push({ ...item, colSpan: 1, rowSpan: 1 })
                    continue
                }
            }

            // Couldn't keep on same page
            unplaced.push(item)
        } else {
            unplaced.push(item)
        }
    }

    // Pass 2: Place any unplaced/colliding/out-of-bounds items into first available slots
    let page = 0
    for (const item of unplaced) {
        const cSpan = item.colSpan ?? 1
        const rSpan = item.rowSpan ?? 1
        let placed = false
        while (!placed) {
            const occupied = buildOccupiedCells(updated, page, cols)
            let found = false
            for (let pos = 0; pos < slotsPerPage && !found; pos++) {
                const startRow = Math.floor(pos / cols)
                const startCol = pos % cols
                if (startCol + cSpan > cols || startRow + rSpan > rows) continue
                const cells = getSlotCells(pos, cSpan, rSpan, cols)
                if (cells.every(c => !occupied.has(c))) {
                    updated.push({ ...item, position: pos, page })
                    found = true
                    placed = true
                }
            }
            if (!found) page++
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
