import { createClient, SupabaseClient, Session } from '@supabase/supabase-js'
import { debugLog, debugError } from './debug'

let SUPABASE_URL = process.env['SUPABASE_URL'] || ''
let SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'] || ''

let supabase: SupabaseClient | null = null
let currentSession: Session | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null
const SESSION_REFRESH_INTERVAL = 45 * 60 * 1000 // 45 minutes
const SESSION_REFRESH_RETRY_DELAY = 30 * 1000 // 30 seconds between retries

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    if (!SUPABASE_URL) SUPABASE_URL = process.env['SUPABASE_URL'] || ''
    if (!SUPABASE_ANON_KEY) SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'] || ''
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase no configurado. SUPABASE_URL y SUPABASE_ANON_KEY deben estar definidos.')
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    })
    debugLog('[Supabase] Cliente inicializado')
  }
  return supabase
}

export function setSupabaseCredentials(url: string, anonKey: string): void {
  if (supabase) {
    supabase.auth.signOut()
    supabase = null
  }
  process.env.SUPABASE_URL = url
  process.env.SUPABASE_ANON_KEY = anonKey
  getSupabaseClient()
}

export function getCurrentSession(): Session | null {
  return currentSession
}

export function setSession(session: Session | null): void {
  currentSession = session
  const client = getSupabaseClient()
  if (session) {
    client.auth.setSession(session).catch(() => {})
    startRefreshTimer()
  } else {
    stopRefreshTimer()
  }
}

function startRefreshTimer(): void {
  stopRefreshTimer()
  if (!currentSession) return

  refreshTimer = setInterval(async () => {
    debugLog('[Supabase] Periodic session refresh triggered')
    const success = await refreshSession()
    if (!success) {
      debugLog('[Supabase] Periodic refresh failed, will retry in 30s')
      setTimeout(async () => {
        const retrySuccess = await refreshSession()
        if (!retrySuccess) {
          debugError('[Supabase] Session refresh retry also failed, session may be expired')
        }
      }, SESSION_REFRESH_RETRY_DELAY)
    }
  }, SESSION_REFRESH_INTERVAL)

  debugLog(`[Supabase] Refresh timer started (interval: ${SESSION_REFRESH_INTERVAL / 1000}s)`)
}

function stopRefreshTimer(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

export function getUserId(): string | null {
  return currentSession?.user?.id || null
}

export function isOnline(): boolean {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine ?? true
  }
  return true
}

export async function refreshSession(): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    debugLog('[Supabase] Refreshing session...')
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout en refreshSession')), 10000))
    const result: any = await Promise.race([client.auth.refreshSession(), timeout])
    const { data, error } = result
    if (error) throw error
    if (data?.session) {
      currentSession = data.session
      debugLog('[Supabase] Session refreshed successfully.')
      return true
    }
    return false
  } catch (err) {
    debugError(`[Supabase] Error refrescando sesión: ${err}`)
    return false
  }
}

export async function getAuthenticatedClient(): Promise<SupabaseClient | null> {
  const client = getSupabaseClient()
  if (currentSession) {
    const now = Date.now()
    const expiresAt = currentSession.expires_at ? currentSession.expires_at * 1000 : 0
    if (expiresAt > 0 && now >= expiresAt - 60000) {
      debugLog('[Supabase] Session expiring soon, attempting refresh...')
      let refreshed = await refreshSession()
      if (!refreshed) {
        debugLog('[Supabase] First refresh attempt failed, retrying once...')
        await new Promise(r => setTimeout(r, 2000))
        refreshed = await refreshSession()
      }
      if (!refreshed) {
        debugError('[Supabase] Session refresh failed after retry, session may be invalid')
      }
    }
    if (currentSession) {
      await client.auth.setSession(currentSession).catch(() => {})
    }
  }
  return client
}
