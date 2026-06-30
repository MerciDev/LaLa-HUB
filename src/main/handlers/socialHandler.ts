import { ipcMain, BrowserWindow } from 'electron'
import { getSupabaseClient, getUserId } from '../utils/supabase'
import { debugLog, debugError } from '../utils/debug'
import { FriendProfile, PresenceState } from '../../shared/types'
import { getAuthState, generateRandomFriendCode } from './authHandler'

let presenceChannel: any = null
let presenceStates: Record<string, PresenceState> = {}

let _setupPresence: (() => Promise<void>) | null = null

export function triggerPresenceSetup(): void {
  if (_setupPresence) _setupPresence()
}

export function registerSocialHandlers(mainWindow: BrowserWindow | null): void {
  // Listen for presence initialization when user logs in
  const setupPresence = async () => {
    const userId = getUserId()
    const authState = getAuthState()
    if (!userId || !authState.user) return

    try {
      const client = getSupabaseClient()
      if (presenceChannel) {
        client.removeChannel(presenceChannel)
      }

      presenceChannel = client.channel('lala-hub-presence', {
        config: {
          presence: {
            key: userId
          }
        }
      })

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState()
          presenceStates = {}
          for (const key in state) {
            const userPresences = state[key] as any[]
            if (userPresences && userPresences.length > 0) {
              const latest = userPresences[userPresences.length - 1]
              presenceStates[key] = {
                userId: key,
                username: latest.username || 'Usuario',
                status: latest.status || 'online',
                statusText: latest.statusText || 'En línea'
              }
            }
          }
          console.log('[Social Debug] Usuarios online detectados en presencia:', Object.values(presenceStates).map(u => `${u.username} (${u.status})`))
          mainWindow?.webContents.send('social-presence-update', Object.values(presenceStates))
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
          console.log('[Social Debug] Cambio detectado en tabla friendships en tiempo real. Notificando a interfaz para refrescar amigos...')
          mainWindow?.webContents.send('social-presence-update', Object.values(presenceStates))
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              username: authState.user?.username || 'Usuario',
              status: 'online',
              statusText: 'Explorando el Hub'
            })
            debugLog('[Social] Conectado exitosamente al canal de presencia Realtime')
          }
        })
    } catch (err: any) {
      debugError(`[Social] Error conectando a presencia Realtime: ${err.message}`)
    }
  }

  _setupPresence = setupPresence

  // Trigger setup immediately if logged in
  if (getUserId()) {
    setupPresence()
  }

  ipcMain.handle('social-update-presence', async (_, status: 'online' | 'away' | 'dnd' | 'offline', statusText: string) => {
    const authState = getAuthState()
    if (!presenceChannel || !authState.user) return { success: false }
    try {
      await presenceChannel.track({
        username: authState.user.username,
        status,
        statusText
      })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('social-get-friends', async (): Promise<{ success: boolean; data?: FriendProfile[]; error?: string }> => {
    const userId = getUserId()
    if (!userId) return { success: false, error: 'No autenticado' }

    try {
      const client = getSupabaseClient()
      
      // Fetch user's friendships
      const { data: rels, error } = await client
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

      if (error) {
        // If table doesn't exist yet, return empty list gracefully
        if (error.code === '42P01') {
          return { success: true, data: [] }
        }
        throw error
      }

      if (!rels || rels.length === 0) {
        console.log(`[Social Debug] No se encontraron amistades para el usuario ${userId}`)
        return { success: true, data: [] }
      }

      console.log(`[Social Debug] Amistades encontradas para ${userId}:`, rels)

      // Get friend IDs
      const friendIds = rels.map(r => r.user_id === userId ? r.friend_id : r.user_id)
      
      // Fetch profiles
      const { data: profiles, error: profError } = await client
        .from('profiles')
        .select('id, username, avatar_url, banner_url, friend_code')
        .in('id', friendIds)

      if (profError) {
        console.error('[Social Debug] Error obteniendo perfiles de amigos:', profError)
        throw profError
      }

      console.log(`[Social Debug] Perfiles de amigos obtenidos:`, profiles)

      const result: FriendProfile[] = profError ? [] : (profiles || []).map(p => {
        const rel = rels.find(r => r.user_id === p.id || r.friend_id === p.id)
        const presence = presenceStates[p.id]
        
        return {
          id: p.id,
          username: p.username || 'Usuario',
          friendCode: p.friend_code || '',
          avatarUrl: p.avatar_url || '',
          bannerUrl: p.banner_url || '',
          status: presence?.status || 'offline',
          statusText: presence?.statusText || 'Desconectado',
          friendshipStatus: rel ? rel.status : 'none',
          isSender: rel?.user_id === userId
        }
      })

      return { success: true, data: result }
    } catch (err: any) {
      debugError(`[Social] Error obteniendo amigos: ${err.message}`)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('social-search-users', async (_, query: string): Promise<{ success: boolean; data?: any[]; error?: string }> => {
    const userId = getUserId()
    if (!userId) return { success: false, error: 'Debes iniciar sesión en tu cuenta para buscar amigos.' }
    if (!query || query.trim().length < 2) return { success: true, data: [] }

    try {
      const client = getSupabaseClient()
      const { data, error } = await client
        .from('profiles')
        .select('id, username, avatar_url, friend_code')
        .or(`username.ilike.%${query}%,friend_code.ilike.%${query}%`)
        .neq('id', userId)
        .limit(10)

      debugLog(`[Social] Búsqueda de "${query}" por usuario ${userId}. Resultado: ${JSON.stringify(data)} | Error: ${error?.message || 'Ninguno'}`)

      if (error) {
        if (error.code === '42P01') return { success: true, data: [] }
        throw error
      }
      
      const mapped = (data || []).map(u => ({
        id: u.id,
        username: u.username || 'Usuario',
        friendCode: u.friend_code || '',
        avatarUrl: u.avatar_url || ''
      }))
      return { success: true, data: mapped }
    } catch (err: any) {
      debugError(`[Social] Error en búsqueda de usuarios: ${err.message}`)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('social-send-request', async (_, friendId: string): Promise<{ success: boolean; error?: string }> => {
    const userId = getUserId()
    if (!userId) return { success: false, error: 'No autenticado' }

    try {
      const client = getSupabaseClient()
      const { error } = await client
        .from('friendships')
        .insert({
          user_id: userId,
          friend_id: friendId,
          status: 'pending'
        })

      if (error) throw error
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('social-accept-request', async (_, friendId: string): Promise<{ success: boolean; error?: string }> => {
    const userId = getUserId()
    if (!userId) return { success: false, error: 'No autenticado' }

    try {
      const client = getSupabaseClient()
      const { error } = await client
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('user_id', friendId)
        .eq('friend_id', userId)

      if (error) throw error
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('social-remove-friend', async (_, friendId: string): Promise<{ success: boolean; error?: string }> => {
    const userId = getUserId()
    if (!userId) return { success: false, error: 'No autenticado' }

    try {
      const client = getSupabaseClient()
      const { error } = await client
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)

      if (error) throw error
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('social-get-user-profile', async (_, targetUserId: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    const userId = getUserId()
    if (!userId) return { success: false, error: 'No autenticado' }

    console.log(`[Social Debug] Obteniendo perfil para targetUserId: ${targetUserId} (solicitado por ${userId})`)

    try {
      const client = getSupabaseClient()
      
      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id, username, avatar_url, banner_url, friend_code')
        .eq('id', targetUserId)
        .single()

      console.log(`[Social Debug] Resultado profile:`, profile, `Error profile:`, profileError)

      if (profileError) {
        // Si hay error al obtener perfil (ej RLS), intentemos buscarlo en friends o devolver datos básicos
        console.error(`[Social Debug] Error en profile:`, profileError)
      }

      const { data: playtimes, error: playtimeError } = await client
        .from('playtime')
        .select('*')
        .eq('user_id', targetUserId)
        .order('minutes', { ascending: false })

      console.log(`[Social Debug] Resultado playtime:`, playtimes, `Error playtime:`, playtimeError)

      if (playtimeError && playtimeError.code !== '42P01') {
        console.error(`[Social Debug] Error en playtime:`, playtimeError)
      }

      const gameNames = Array.from(new Set((playtimes || []).map((p: any) => p.game_name).filter(Boolean))) as string[]
      const playtimeSlotIds = Array.from(new Set((playtimes || []).map((p: any) => p.slot_id).filter(Boolean))) as string[]
      
      const gameAssetsMap: Record<string, string> = {}
      const gameNamesMap: Record<string, string> = {}

      if (gameNames.length > 0 || playtimeSlotIds.length > 0) {
        const generatedSlugs = gameNames.map(n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
        const possibleIds = Array.from(new Set([...generatedSlugs, ...playtimeSlotIds]))

        const { data: gamesByName } = await client.from('games').select('id, name, data').in('name', gameNames)
        const { data: gamesById } = await client.from('games').select('id, name, data').in('id', possibleIds)
        
        const allGames = [...(gamesByName || []), ...(gamesById || [])]
        const games = Array.from(new Map(allGames.map(g => [g.id, g])).values())

        if (games && games.length > 0) {
          for (const g of games) {
            gameNamesMap[g.id] = g.name
            
            // Extract image from game.data.images if available
            let dataObj = g.data || {};
            if (typeof g.data === 'string') {
              try { dataObj = JSON.parse(g.data); } catch (e) {}
            }
            
            const imgs = dataObj.images || {}
            const cover = imgs.v_grid || imgs.cover || imgs.vertical || imgs.square || imgs.boxart || imgs.h_grid
            if (cover) {
              // Si es un path local o /images/, lo dejamos tal cual o lo parseamos (idealmente usar URLs absolutas)
              gameAssetsMap[g.id] = cover
              for (const originalName of gameNames) {
                const slug = originalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                if (originalName === g.name || slug === g.id) {
                  gameAssetsMap[originalName] = cover
                }
              }
            }
          }

          const gameIds = games.map((g: any) => g.id)
          const { data: assets } = await client
            .from('assets')
            .select('game_id, storage_path')
            .in('game_id', gameIds)
            .in('type', ['boxart', 'cover'])

          if (assets && assets.length > 0) {
            for (const asset of assets) {
              const game = games.find((g: any) => g.id === asset.game_id)
              if (game) {
                const { data } = client.storage.from('game-images').getPublicUrl(asset.storage_path)
                gameAssetsMap[game.id] = data.publicUrl
                for (const originalName of gameNames) {
                  const slug = originalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                  if (originalName === game.name || slug === game.id) {
                    gameAssetsMap[originalName] = data.publicUrl
                  }
                }
              }
            }
          }
        }
      }

      const combinedPlaytimes = (playtimes || []).map((p: any) => ({
        gameName: gameNamesMap[p.slot_id] || p.game_name || p.slot_id || 'Desconocido',
        platform: p.platform || 'PC',
        minutes: p.minutes || 0,
        imageUrl: gameAssetsMap[p.slot_id] || (p.game_name ? gameAssetsMap[p.game_name] : null) || null
      }))

      const presence = presenceStates[targetUserId]
      const result = {
        id: targetUserId,
        username: profile?.username || 'Usuario',
        friendCode: profile?.friend_code || '',
        avatarUrl: profile?.avatar_url || '',
        bannerUrl: profile?.banner_url || '',
        status: presence?.status || 'offline',
        statusText: presence?.statusText || 'Desconectado',
        playtimes: combinedPlaytimes
      }

      console.log(`[Social Debug] Devolviendo result final para perfil:`, result)

      return { success: true, data: result }
    } catch (err: any) {
      console.error(`[Social Debug] Error general en social-get-user-profile:`, err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('social-renew-friend-code', async (): Promise<{ success: boolean; friendCode?: string; error?: string }> => {
    const userId = getUserId()
    if (!userId) return { success: false, error: 'No autenticado' }
    try {
      const client = getSupabaseClient()
      const newCode = generateRandomFriendCode()
      const { error } = await client.from('profiles').update({ friend_code: newCode }).eq('id', userId)
      if (error) throw error

      const authState = getAuthState()
      if (authState.user) {
        authState.user.friendCode = newCode
      }
      return { success: true, friendCode: newCode }
    } catch (err: any) {
      debugError(`[Social] Error renovando código de amigo: ${err.message}`)
      return { success: false, error: err.message }
    }
  })
}
