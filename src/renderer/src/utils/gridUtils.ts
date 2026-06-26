import { HomeSlot } from '../../../shared/types'

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

export function repackItemsAfterResize(items: HomeSlot[], cols: number, rows: number): HomeSlot[] {
    const slotsPerPage = cols * rows
    const updated: HomeSlot[] = []
    const unplaced: HomeSlot[] = []

    // Pass 1: Keep items at their exact position and page if valid and not colliding
    for (const item of items) {
        if (item.position !== undefined && item.page !== undefined) {
            const pos = item.position
            const page = item.page
            const cSpan = item.colSpan ?? 1
            const rSpan = item.rowSpan ?? 1
            const startCol = pos % cols
            const startRow = Math.floor(pos / cols)

            if (pos < slotsPerPage && startCol + cSpan <= cols && startRow + rSpan <= rows) {
                const occupied = buildOccupiedCells(updated, page, cols)
                const cells = getSlotCells(pos, cSpan, rSpan, cols)
                if (cells.every(c => !occupied.has(c))) {
                    updated.push(item)
                    continue
                }
            }
        }
        unplaced.push(item)
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
