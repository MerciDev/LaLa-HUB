import DiscordRPC from 'discord-rpc'
import { debugLog, debugError } from './debug'

// Placeholder Client ID - Replace with your own from Discord Developer Portal
const CLIENT_ID = '123456789012345678' 

let rpc: DiscordRPC.Client | null = null
let isReady = false

/**
 * Initializes the Discord Rich Presence client.
 */
export function initDiscordRPC(): void {
    if (rpc) return

    rpc = new DiscordRPC.Client({ transport: 'ipc' })

    rpc.on('ready', () => {
        debugLog('[Discord] RPC Ready')
        isReady = true
        setActivity('En el Menú', 'Navegando por la colección')
    })

    if (CLIENT_ID === '123456789012345678') {
        debugLog('[Discord] Usando Client ID por defecto. Por favor, configura tu propia App en el portal de desarrolladores para usar Rich Presence.')
        return
    }

    rpc.login({ clientId: CLIENT_ID }).catch((err) => {
        debugError(`[Discord] Error de conexión: ${err.message}. Asegúrate de que Discord esté abierto.`)
    })
}

/**
 * Updates the current Discord activity.
 */
export function setActivity(details: string, state: string, largeImageKey: string = 'logo'): void {
    if (!rpc || !isReady) return

    rpc.setActivity({
        details,
        state,
        startTimestamp: Date.now(),
        largeImageKey,
        largeImageText: 'LaLa HUB',
        instance: false,
    }).catch(err => {
        debugError(`[Discord] SetActivity failed: ${err.message}`)
    })
}

/**
 * Clears the Discord activity (e.g. when app closes).
 */
export function clearActivity(): void {
    if (!rpc) return
    rpc.clearActivity()
}
