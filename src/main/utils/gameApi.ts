import fs from 'fs'
import path from 'path'
import { debugLog, debugError } from './debug'
import { fetchFromTable } from './supabaseData'
import { getAuthenticatedClient } from './supabase'

function normalizeGameForResponse(game: any): any {
  const imgs = game.images || game.data?.images || {}
  
  const fixUrl = (u?: string) => {
    if (!u || typeof u !== 'string') return ''
    if (u.startsWith('http') || u.startsWith('media://') || u.startsWith('file://')) return u
    if (u.startsWith('/images/')) {
      const possiblePublicDirs = [
        path.join(process.cwd(), '../LaLa-API/public'),
        path.resolve(__dirname, '../../../../LaLa-API/public'),
        path.resolve(__dirname, '../../../../../LaLa-API/public')
      ]
      for (const pub of possiblePublicDirs) {
        const absPath = path.join(pub, u)
        if (fs.existsSync(absPath)) {
          return 'file:///' + absPath.replace(/\\/g, '/')
        }
      }
      return `http://localhost:3000${u}`
    }
    return u
  }

  const cover = fixUrl(imgs.cover || imgs.v_grid)
  const square = fixUrl(imgs.square || imgs.home || imgs.icon)
  const vertical = fixUrl(imgs.vertical || imgs.v_grid)
  const horizontal = fixUrl(imgs.horizontal || imgs.h_grid)
  const background = fixUrl(imgs.background || imgs.h_grid || (Array.isArray(imgs.screenshots) && imgs.screenshots[0]))
  const logo = fixUrl(imgs.logo)
  const icon = fixUrl(imgs.icon || imgs.home)

  return {
    id: game.id || game.data?.id || '',
    name: game.name || game.data?.name || '',
    console: game.console || game.data?.console || null,
    releaseDate: game.releaseDate || game.release_date || game.data?.releaseDate || game.data?.release_date || null,
    platforms: game.platforms || game.data?.platforms || [],
    savesPath: game.savesPath || game.data?.savesPath || null,
    savesExtension: game.savesExtension || game.data?.savesExtension || null,
    images: {
      cover,
      square,
      vertical,
      horizontal,
      background,
      logo,
      icon
    }
  }
}

// @ts-ignore
function getLocalApiGamesDir(): string | null {
  const possiblePaths = [
    path.join(process.cwd(), '../LaLa-API/src/data/games'),
    path.resolve(__dirname, '../../../../LaLa-API/src/data/games'),
    path.resolve(__dirname, '../../../../../LaLa-API/src/data/games')
  ]
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function loadLocalApiGames(): any[] {
  return [] // Obsoleto: ahora usamos la DB directamente
}

export async function fetchConsoles(): Promise<any[]> {
  let fromDb = await fetchFromTable<any>('consoles')
  if (fromDb && fromDb.length > 0) {
    debugLog(`[GameApi] ${fromDb.length} consolas desde tabla 'consoles'`)
    return fromDb
  }

  const games = await fetchFromTable<any>('games')
  const consoleMap = new Map<string, any>()
  if (games) {
    for (const g of games) {
      const c = g.console || g.data?.console
      if (c && !consoleMap.has(c)) {
        consoleMap.set(c, { id: c, name: c.toUpperCase(), slug: c })
      }
    }
  }
  if (consoleMap.size > 0) return Array.from(consoleMap.values())

  const possiblePaths = [
    path.join(process.cwd(), '../LaLa-API/src/data/consoles.json'),
    path.resolve(__dirname, '../../../../LaLa-API/src/data/consoles.json'),
    path.resolve(__dirname, '../../../../../LaLa-API/src/data/consoles.json')
  ]
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'))
        if (Array.isArray(parsed)) return parsed
      } catch {}
    }
  }
  return []
}

export async function fetchYears(): Promise<string[]> {
  let games = await fetchFromTable<any>('games')
  if (!games || games.length === 0) {
    games = loadLocalApiGames()
  }
  const years = [...new Set(games
    .map((g: any) => g.releaseDate || g.release_date || g.data?.releaseDate || g.data?.release_date)
    .filter(Boolean)
    .map((d: any) => typeof d === 'string' ? d.substring(0, 4) : '')
    .filter(y => y && !isNaN(Number(y)))
  )].sort()
  return years
}

export async function searchGames(query: string): Promise<{ results: any[] }> {
  let q = query
  try { q = decodeURIComponent(query) } catch {}
  q = (q || '').trim()

  let client: any = null
  try {
    client = await getAuthenticatedClient()
  } catch (err) {
    debugLog(`[GameApi] Error getting auth client: ${err}`)
  }

  let filtered: any[] = []

  if (client) {
    let supabaseQuery = client.from('games').select('*')
    if (q) {
      // Usamos .or() para buscar tanto en el nombre (ilike) como en el id (ilike o eq)
      supabaseQuery = supabaseQuery.or(`name.ilike.%${q}%,id.ilike.%${q}%`)
    }
    
    const { data, error } = await supabaseQuery.limit(50)
    
    debugLog(`[GameApi] RAW DB QUERY -> Error: ${JSON.stringify(error)}, Data count: ${data?.length}`)

    if (error) {
      debugError(`[GameApi] Supabase Query Error: ${error.message}`)
    }
    
    if (!error && data) {
      filtered = data.map((row: any) => {
        let d = row.data
        if (typeof d === 'string') {
          try { d = JSON.parse(d) } catch {}
        }
        if (d && typeof d === 'object') {
          return { id: row.id, name: row.name, ...d }
        }
        return row
      })
    }
  }

  debugLog(`[GameApi] Búsqueda "${query}": ${filtered.length} juegos encontrados en DB`)
  return { results: filtered.map(g => normalizeGameForResponse(g)) }
}

export async function getGameById(id: string): Promise<any | null> {
  let games = await fetchFromTable<any>('games')
  if (!games || games.length === 0) {
    games = loadLocalApiGames()
  }

  let cleanId = id
  try { cleanId = decodeURIComponent(id) } catch {}
  const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const nid = norm(cleanId)

  const found = games.find((g: any) => {
    const gid = g.id || g.data?.id || ''
    return gid === cleanId || norm(gid) === nid
  })
  if (found) return normalizeGameForResponse(found)
  return null
}

export async function searchAllGames(): Promise<{ results: any[] }> {
  let games = await fetchFromTable<any>('games')
  if (!games || games.length === 0) {
    games = loadLocalApiGames()
  }
  return { results: games.slice(0, 50).map(g => normalizeGameForResponse(g)) }
}
