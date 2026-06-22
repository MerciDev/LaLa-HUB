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
    let page = 0
    let cellCursor = 0

    const sorted = [...items].sort((a, b) => {
        const pa = (a.page ?? 0) * 1000 + (a.position ?? 0)
        const pb = (b.page ?? 0) * 1000 + (b.position ?? 0)
        return pa - pb
    })

    for (const item of sorted) {
        const cSpan = item.colSpan ?? 1
        const rSpan = item.rowSpan ?? 1

        let placed = false
        while (!placed) {
            const occupied = buildOccupiedCells(updated, page, cols)
            let found = false
            for (let pos = 0; pos < slotsPerPage && !found; pos++) {
                const startRow = Math.floor(pos / cols)
                const startCol = pos % cols
                if (startCol + cSpan > cols) continue
                if (startRow + rSpan > rows) continue
                const cells = getSlotCells(pos, cSpan, rSpan, cols)
                if (cells.every(c => !occupied.has(c))) {
                    updated.push({ ...item, position: pos, page })
                    found = true
                    placed = true
                }
            }
            if (!found) {
                page++
                cellCursor = 0
            }
        }
        cellCursor++
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
