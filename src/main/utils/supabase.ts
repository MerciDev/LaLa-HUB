import { createClient, SupabaseClient, Session } from '@supabase/supabase-js'
import { debugLog, debugError } from './debug'

let SUPABASE_URL = process.env['SUPABASE_URL'] || ''
let SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'] || ''

let supabase: SupabaseClient | null = null
let currentSession: Session | null = null

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
  }
}

export function getUserId(): string | null {
  return currentSession?.user?.id || null
}

export function isOnline(): boolean {
  return navigator?.onLine ?? true
}

export async function refreshSession(): Promise<boolean> {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client.auth.refreshSession()
    if (error) throw error
    if (data.session) {
      currentSession = data.session
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
      await refreshSession()
    }
    if (currentSession) {
      await client.auth.setSession(currentSession).catch(() => {})
    }
  }
  return client
}
