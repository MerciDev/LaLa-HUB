import { ChildProcess } from 'child_process'
import { loadSlots, saveSlots } from './storage'
import { debugLog } from './debug'
import { setActivity } from './discord'
import { showMainWindow } from '../windows/main/main'

export interface PlaySession {
    slotId: string
    startTime: number   // Date.now() at launch
    process: ChildProcess
}

/** Active play sessions, keyed by slot ID */
const activeSessions = new Map<string, PlaySession>()

/**
 * Starts tracking a play session for the given slot.
 * When the process exits, the elapsed minutes are added to the slot's playtime.
 */
export function startPlaySession(slotId: string, gameProcess: ChildProcess): void {
    if (activeSessions.has(slotId)) {
        debugLog(`[Playtime] Session already active for slot: ${slotId}`)
        return
    }

    const session: PlaySession = { slotId, startTime: Date.now(), process: gameProcess }
    activeSessions.set(slotId, session)
    debugLog(`[Playtime] Session started: ${slotId}`)

    // Update Discord Presence
    const slots = loadSlots()
    const slot = slots.find(s => s.id === slotId)
    if (slot) {
        setActivity(`Jugando: ${slot.label}`, `Empecé hace poco`)
    }

    gameProcess.on('close', () => {
        endPlaySession(slotId)
    })
}

/**
 * Ends a session and persists the recorded minutes to the slot's JSON.
 */
function endPlaySession(slotId: string): void {
    const session = activeSessions.get(slotId)
    if (!session) return

    const elapsed = Date.now() - session.startTime
    const minutesPlayed = Math.round(elapsed / 1000 / 60)

    activeSessions.delete(slotId)
    debugLog(`[Playtime] Session ended: ${slotId}, +${minutesPlayed} min`)

    // Reset Discord Presence
    setActivity('En el Menú', 'Navegando por la colección')

    persistPlaytime(slotId, minutesPlayed)

    // Un-hide the main LaLa-HUB window since the game closed
    try {
        showMainWindow()
    } catch (err) {
        debugLog(`[Playtime] Error restoring main window: ${err}`)
    }
}

function persistPlaytime(slotId: string, minutes: number): void {
    const slots = loadSlots()
    const slot = slots.find(s => s.id === slotId)

    if (!slot?.game) {
        debugLog(`[Playtime] Slot not found or has no game: ${slotId}`)
        return
    }

    slot.game.playtimeMinutes = (slot.game.playtimeMinutes || 0) + minutes
    saveSlots(slots)
    debugLog(`[Playtime] Total playtime for ${slot.label}: ${slot.game.playtimeMinutes} min`)
}

/** Returns the active session for a slot, or undefined if not playing. */
export function getActiveSession(slotId: string): PlaySession | undefined {
    return activeSessions.get(slotId)
}

/** Returns the first active session we find and its associated slot data, or null. */
export function getCurrentSessionData() {
    const session = Array.from(activeSessions.values())[0]
    if (!session) return null
    
    const slots = loadSlots()
    const slot = slots.find(s => s.id === session.slotId)
    if (!slot) return null
    
    return { session, slot }
}

/** Human-readable playtime string (e.g. "2h 34m" or "45m") */
export function formatPlaytime(minutes: number): string {
    if (minutes <= 0) return '0m'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
}
