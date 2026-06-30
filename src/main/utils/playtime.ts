import { ChildProcess } from 'child_process'
import { loadSlots, saveSlots } from './storage'
import { debugLog } from './debug'
import { setActivity } from './discord'
import { showMainWindow } from '../windows/main/main'
import { pushSaveToCloud } from './cloudSaves'
import { getAuthenticatedClient, getUserId, isOnline } from './supabase'
import { updatePresenceInternal, restorePresence } from '../handlers/socialHandler'

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

    // Update Discord & LaLa Presence
    const slots = loadSlots()
    const slot = slots.find(s => s.id === slotId)
    if (slot) {
        setActivity(`Jugando: ${slot.label}`, `Empecé hace poco`)
        updatePresenceInternal(undefined, `Jugando a ${slot.label}`)
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

    // Reset Discord & LaLa Presence
    setActivity('En el Menú', 'Navegando por la colección')
    restorePresence()

    persistPlaytime(slotId, minutesPlayed)

    // Un-hide the main LaLa-HUB window since the game closed
    try {
        showMainWindow()
    } catch (err) {
        debugLog(`[Playtime] Error restoring main window: ${err}`)
    }
}

async function syncPlaytimeToCloud(slot: any, totalMinutes: number): Promise<void> {
    if (!isOnline()) {
        debugLog(`[Playtime] No hay conexión a internet, saltando sync de tiempo.`)
        return;
    }
    const userId = getUserId()
    if (!userId) {
        debugLog(`[Playtime] No hay sesión activa (userId nulo), saltando sync de tiempo.`)
        return;
    }
    const client = await getAuthenticatedClient()
    if (!client) return;

    try {
        const slugId = (slot.game?.name || slot.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const { error } = await client.from('playtime').upsert({
            user_id: userId,
            slot_id: slot.game?.searchId || slugId || slot.id,
            game_name: slot.game?.name || slot.label,
            platform: slot.game?.platform?.name || slot.game?.emulator?.name || 'PC',
            minutes: totalMinutes,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, slot_id' })
        
        if (error) {
            debugLog(`[Playtime] Error syncing to cloud: ${error.message}`)
        } else {
            debugLog(`[Playtime] Synced cloud record for ${slot.label}`)
        }
    } catch (err: any) {
        debugLog(`[Playtime] Cloud sync exception: ${err.message}`)
    }
}

export async function syncAllPlaytimesToCloud(): Promise<void> {
    if (!isOnline()) return;
    const userId = getUserId()
    if (!userId) return;
    const client = await getAuthenticatedClient()
    if (!client) return;

    const slots = loadSlots()
    const recordsToSync = slots.filter(s => s.game && (s.game.playtimeMinutes || 0) > 0)
    if (recordsToSync.length === 0) return;

    try {
        const payload = recordsToSync.map(slot => {
            const slugId = (slot.game?.name || slot.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return {
                user_id: userId,
                slot_id: slot.game?.searchId || slugId || slot.id,
                game_name: slot.game?.name || slot.label,
                platform: slot.game?.platform?.name || slot.game?.emulator?.name || 'PC',
                minutes: slot.game!.playtimeMinutes,
                updated_at: new Date().toISOString()
            }
        })

        const { error } = await client.from('playtime').upsert(payload, { onConflict: 'user_id, slot_id' })
        
        if (error) {
            debugLog(`[Playtime] Error en sync masivo a la nube: ${error.message}`)
        } else {
            debugLog(`[Playtime] Sync masivo a la nube completado (${recordsToSync.length} juegos)`)
        }
    } catch (err: any) {
        debugLog(`[Playtime] Excepción en sync masivo: ${err.message}`)
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

    if (slot.game.cloudSyncEnabled && slot.game.savesPath) {
        debugLog(`[Playtime] Triggering cloud sync push for ${slot.label}...`)
        pushSaveToCloud(slot).catch(() => {})
    }
    
    syncPlaytimeToCloud(slot, slot.game.playtimeMinutes).catch((err) => {
        debugLog(`[Playtime] Error starting cloud sync: ${err.message || err}`)
    })
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
