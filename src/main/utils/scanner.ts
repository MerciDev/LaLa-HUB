import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { HomeSlot, Game, Emulator } from '../shared/types'

/**
 * Scans a directory for files matching the given extensions.
 * Returns a list of HomeSlot objects ready to be added to the HUB.
 * 
 * @param directoryPath Path to scan.
 * @param emulator The emulator to associate with the found games.
 * @param extensions List of extensions to include (e.g., ['.nes', '.bin']).
 * @param recursive Whether to scan subdirectories.
 */
export async function scanDirectoryForRoms(
    directoryPath: string,
    emulator: Emulator,
    extensions: string[],
    recursive: boolean = false
): Promise<HomeSlot[]> {
    const slots: HomeSlot[] = []
    
    if (!fs.existsSync(directoryPath)) {
        throw new Error(`Directory does not exist: ${directoryPath}`)
    }

    const files = await getFiles(directoryPath, extensions, recursive)

    for (const file of files) {
        const fileName = path.basename(file, path.extname(file))
        const id = uuidv4()

        const game: Game = {
            id: id,
            name: fileName,
            emulator: emulator,
            path: file,
            playtimeMinutes: 0
        }

        const slot: HomeSlot = {
            id: id,
            icon: 'mynaui:ghost', // Default icon for unknown games
            label: fileName,
            game: game
        }

        slots.push(slot)
    }

    return slots
}

/** Helper to get files recursively or not. */
async function getFiles(dir: string, extensions: string[], recursive: boolean): Promise<string[]> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    const files = await Promise.all(entries.map((res) => {
        const resPath = path.resolve(dir, res.name)
        if (res.isDirectory()) {
            return recursive ? getFiles(resPath, extensions, recursive) : []
        } else {
            const ext = path.extname(res.name).toLowerCase()
            return extensions.map(e => e.toLowerCase()).includes(ext) ? [resPath] : []
        }
    }))
    
    return files.flat()
}
