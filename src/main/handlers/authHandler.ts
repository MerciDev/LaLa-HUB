import { ipcMain, BrowserWindow } from 'electron'
import { getSupabaseClient, getAuthenticatedClient, setSession, getCurrentSession, getUserId } from '../utils/supabase'
import { debugLog } from '../utils/debug'
import { readJson, saveJson, checkFileExists, USER_DATA_PATH } from '../utils/storage'
import { AuthState, LoginCredentials, RegisterCredentials, UserProfile } from '../../shared/types'
import * as fs from 'fs'
import * as path from 'path'

let authState: AuthState = {
  isLoggedIn: false,
  user: null,
  session: null
}

function notifyAuthState(mainWindow: BrowserWindow | null): void {
  mainWindow?.webContents.send('auth-state-changed', authState)
}

export function getAuthState(): AuthState {
  return authState
}

function loadStoredSession(): void {
  try {
    if (!checkFileExists('auth', 'session')) return
    const stored = readJson<{ refreshToken: string; user: UserProfile }>('auth', 'session')
    if (stored) {
      authState = {
        isLoggedIn: true,
        user: stored.user,
        session: null
      }
      debugLog('[Auth] Sesión local cargada')

      if (stored.refreshToken) {
        // Defer getSupabaseClient() until after app is ready and env vars are loaded
        Promise.resolve().then(() => {
          try {
            const client = getSupabaseClient()
            debugLog('[Auth] Solicitando refreshSession a Supabase...')
            const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout de 10s en refreshSession')), 10000))
            return Promise.race([client.auth.refreshSession({ refresh_token: stored.refreshToken }), timeout])
              .then((result: any) => {
                const { data } = result
                debugLog('[Auth] Respuesta de refreshSession recibida.')
                if (data?.session) {
                  setSession(data.session)
                  persistSession(stored.user) // Update token on disk if it changed
                  debugLog('[Auth] Sesión de Supabase restaurada con token')

                  try {
                    import('../utils/syncEngine').then(({ triggerSync }) => triggerSync()).catch(() => {})
                  } catch { }

                  try {
                    import('../utils/playtime').then(({ syncAllPlaytimesToCloud }) => syncAllPlaytimesToCloud()).catch(() => {})
                  } catch { }

                  try {
                    import('./socialHandler').then(({ triggerPresenceSetup }) => triggerPresenceSetup()).catch(() => {})
                  } catch { }
                }
              })
              .catch(err => debugLog(`[Auth] Fallo restaurando token en Supabase: ${err.message}`))
          } catch (err: any) {
            debugLog(`[Auth] Supabase no configurado al restaurar sesión: ${err.message}`)
          }
        })
      }
    }
  } catch (err: any) {
    debugLog(`[Auth] Error cargando sesión local: ${err.message}`)
  }
}

function persistSession(user: UserProfile): void {
  saveJson('auth', 'session', {
    refreshToken: getCurrentSession()?.refresh_token || '',
    user
  })
}

function clearStoredSession(): void {
  const sessionPath = path.join(USER_DATA_PATH, 'auth', 'session.json')
  try {
    if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath)
  } catch { }
}

async function mapUserToProfile(user: any): Promise<UserProfile> {
  let username = user.user_metadata?.username || user.email?.split('@')[0] || 'Usuario'
  let avatarUrl = user.user_metadata?.avatar_url || ''
  let bannerUrl = ''
  let accountType = 'standard'

  try {
    const client = getSupabaseClient()
    const { data } = await client.from('profiles').select('username, avatar_url, banner_url, account_type').eq('id', user.id).single()
    if (data) {
      if (data.account_type) accountType = data.account_type
      if (data.username) username = data.username
      if (data.avatar_url) avatarUrl = data.avatar_url
      if (data.banner_url) bannerUrl = data.banner_url
    }
  } catch (err: any) {
    debugLog(`[Auth] Error fetching profile para ${user.id}: ${err.message}`)
  }

  return {
    id: user.id,
    email: user.email || '',
    username,
    avatarUrl,
    bannerUrl,
    accountType,
    createdAt: user.created_at || new Date().toISOString()
  }
}

export function registerAuthHandlers(mainWindow: BrowserWindow | null): void {
  loadStoredSession()

  ipcMain.handle('auth-login', async (_, credentials: LoginCredentials): Promise<{ success: boolean; error?: string; user?: UserProfile }> => {
    try {
      const client = getSupabaseClient()
      const { data, error } = await client.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })
      if (error) throw error
      if (!data.session) throw new Error('No se obtuvo sesión')

      setSession(data.session)
      const user = await mapUserToProfile(data.user)
      authState = { isLoggedIn: true, user, session: null }
      persistSession(user)
      notifyAuthState(mainWindow)
      debugLog(`[Auth] Usuario ${user.email} inició sesión`)

      try {
        const { triggerSync } = await import('../utils/syncEngine')
        triggerSync()
      } catch { }

      try {
        const { syncAllPlaytimesToCloud } = await import('../utils/playtime')
        syncAllPlaytimesToCloud()
      } catch { }

      try {
        const { triggerPresenceSetup } = await import('./socialHandler')
        triggerPresenceSetup()
      } catch { }

      return { success: true, user }
    } catch (err: any) {
      debugLog(`[Auth] Error login: ${err.message}`)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('auth-register', async (_, credentials: RegisterCredentials): Promise<{ success: boolean; error?: string; user?: UserProfile }> => {
    try {
      const client = getSupabaseClient()
      const { data, error } = await client.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: { username: credentials.username }
        }
      })
      if (error) throw error
      if (!data.session) {
        return { success: true, error: 'Revisa tu email para confirmar la cuenta (si tienes confirmación habilitada). Puedes iniciar sesión después.' }
      }
      setSession(data.session)
      const user = await mapUserToProfile(data.user)
      authState = { isLoggedIn: true, user, session: null }
      persistSession(user)
      notifyAuthState(mainWindow)
      debugLog(`[Auth] Usuario ${user.email} registrado`)

      try {
        const { triggerPresenceSetup } = await import('./socialHandler')
        triggerPresenceSetup()
      } catch { }

      return { success: true, user }
    } catch (err: any) {
      debugLog(`[Auth] Error registro: ${err.message}`)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('auth-logout', async () => {
    try {
      const client = getSupabaseClient()
      await client.auth.signOut()
    } catch { }
    setSession(null)
    authState = { isLoggedIn: false, user: null, session: null }
    clearStoredSession()
    notifyAuthState(mainWindow)
    debugLog('[Auth] Sesión cerrada')
  })

  ipcMain.handle('auth-get-status', async (): Promise<AuthState> => {
    return authState
  })

  ipcMain.handle('auth-refresh-profile', async (): Promise<AuthState> => {
    if (!authState.isLoggedIn || !authState.user) return authState
    try {
      const client = getSupabaseClient()
      const { data } = await client.from('profiles').select('username, avatar_url, banner_url, account_type').eq('id', authState.user.id).single()
      if (data) {
        let changed = false
        if (data.account_type && data.account_type !== authState.user.accountType) {
          authState.user.accountType = data.account_type
          changed = true
        }
        if (data.username && data.username !== authState.user.username) {
          authState.user.username = data.username
          changed = true
        }
        if (data.avatar_url !== undefined && data.avatar_url !== null && data.avatar_url !== authState.user.avatarUrl) {
          authState.user.avatarUrl = data.avatar_url
          changed = true
        }
        if (data.banner_url !== undefined && data.banner_url !== null && data.banner_url !== authState.user.bannerUrl) {
          authState.user.bannerUrl = data.banner_url
          changed = true
        }
        if (changed) {
          persistSession(authState.user)
          notifyAuthState(mainWindow)
          debugLog(`[Auth] Perfil refrescado desde BD`)
        }
      }
    } catch (err: any) {
      debugLog(`[Auth] Error refrescando perfil: ${err.message}`)
    }
    return authState
  })

  ipcMain.handle('auth-update-profile', async (_, profile: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      const userId = getUserId()
      if (!userId) throw new Error('No hay sesión activa')

      const client = (await getAuthenticatedClient()) || getSupabaseClient()
      const { error } = await client.auth.updateUser({
        data: { username: profile.username, avatar_url: profile.avatarUrl }
      })
      if (error) throw error

      const updates: any = { updated_at: new Date().toISOString() }
      if (profile.username !== undefined) updates.username = profile.username
      if (profile.avatarUrl !== undefined) updates.avatar_url = profile.avatarUrl
      if (profile.bannerUrl !== undefined) updates.banner_url = profile.bannerUrl

      const { error: pError } = await client.from('profiles').update(updates).eq('id', userId)

      if (pError) {
        debugLog(`[Auth] Warning: Error actualizando profiles DB: ${pError.message}`)
      }

      if (authState.user) {
        authState.user = { ...authState.user, ...profile }
        persistSession(authState.user)
        notifyAuthState(mainWindow)
      }
      return { success: true }
    } catch (err: any) {
      debugLog(`[Auth] Error actualizando perfil: ${err.message}`)
      return { success: false, error: err.message }
    }
  })
}
