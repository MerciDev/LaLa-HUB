import { ipcMain, BrowserWindow } from 'electron'
import { getSupabaseClient, setSession, getCurrentSession, getUserId } from '../utils/supabase'
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
  if (!checkFileExists('auth', 'session')) return
  const stored = readJson<{ refreshToken: string; user: UserProfile }>('auth', 'session')
  if (stored) {
    authState = {
      isLoggedIn: true,
      user: stored.user,
      session: null
    }
    debugLog('[Auth] Sesión local cargada')
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
  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Usuario'
  return {
    id: user.id,
    email: user.email || '',
    username,
    avatarUrl: user.user_metadata?.avatar_url || '',
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

  ipcMain.handle('auth-update-profile', async (_, profile: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      const userId = getUserId()
      if (!userId) throw new Error('No hay sesión activa')

      const client = getSupabaseClient()
      const { error } = await client.auth.updateUser({
        data: { username: profile.username, avatar_url: profile.avatarUrl }
      })
      if (error) throw error

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
