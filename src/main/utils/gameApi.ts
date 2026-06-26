import { debugLog } from './debug'
import { isOnline, getUserId } from './supabase'
import { fetchFromTable } from './supabaseData'

const LEGACY_API = 'http://localhost:3000'

async function fetchJson(url: string): Promise<any> {
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    return await resp.json()
  } catch {
    return null
  }
}

function normalizeGameForResponse(game: any): any {
  const imgs = game.images || game.data?.images || {}
  const cover = imgs.cover || imgs.v_grid || ''
  const square = imgs.square || imgs.home || imgs.icon || ''
  const vertical = imgs.vertical || imgs.v_grid || ''
  const horizontal = imgs.horizontal || imgs.h_grid || ''
  const background = imgs.background || imgs.h_grid || (Array.isArray(imgs.screenshots) && imgs.screenshots[0]) || ''
  const logo = imgs.logo || ''
  const icon = imgs.icon || imgs.home || ''

  return {
    id: game.id || game.data?.id || '',
    name: game.name || game.data?.name || '',
    console: game.console || game.data?.console || null,
    releaseDate: game.releaseDate || game.release_date || game.data?.releaseDate || game.data?.release_date || null,
    platforms: game.platforms || game.data?.platforms || [],
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

export async function fetchConsoles(): Promise<any[]> {
  if (isOnline() && getUserId()) {
    const fromDb = await fetchFromTable<any>('consoles')
    if (fromDb.length > 0) {
      debugLog(`[GameApi] ${fromDb.length} consoles desde Supabase`)
      return fromDb
    }
  }

  const legacy = await fetchJson(`${LEGACY_API}/api/consoles?hasGames=true`)
  return Array.isArray(legacy) ? legacy : []
}

export async function fetchYears(): Promise<string[]> {
  if (isOnline() && getUserId()) {
    const games = await fetchFromTable<any>('games')
    const years = [...new Set(games
      .map((g: any) => g.releaseDate || g.release_date || g.data?.releaseDate || g.data?.release_date)
      .filter(Boolean)
      .map((d: any) => typeof d === 'string' ? d.substring(0, 4) : '')
      .filter(y => y && !isNaN(Number(y)))
    )].sort()
    if (years.length > 0) return years
  }

  const legacy = await fetchJson(`${LEGACY_API}/api/games/years`)
  return Array.isArray(legacy) ? legacy : []
}

export async function searchGames(query: string): Promise<{ results: any[] }> {
  if (isOnline() && getUserId()) {
    const games = await fetchFromTable<any>('games')
    let q = query
    try { q = decodeURIComponent(query) } catch {}
    q = q.toLowerCase().trim()
    
    const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const nq = norm(q)

    const filtered = nq
      ? games.filter((g: any) => {
          const name = (g.name || g.data?.name || '').toLowerCase()
          const id = (g.id || g.data?.id || '').toLowerCase()
          return name.includes(q) || id === q || norm(name).includes(nq) || norm(id).includes(nq)
        })
      : games

    if (filtered.length > 0) {
      debugLog(`[GameApi] ${filtered.length} juegos desde Supabase`)
      return { results: filtered.slice(0, 50).map(g => normalizeGameForResponse(g)) }
    }
  }

  const legacy = await fetchJson(`${LEGACY_API}/api/games/search?q=${encodeURIComponent(query)}`)
  return legacy && legacy.results ? legacy : { results: [] }
}

export async function getGameById(id: string): Promise<any | null> {
  if (isOnline() && getUserId()) {
    const games = await fetchFromTable<any>('games')
    let cleanId = id
    try { cleanId = decodeURIComponent(id) } catch {}
    const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const nid = norm(cleanId)

    const found = games.find((g: any) => {
      const gid = g.id || g.data?.id || ''
      return gid === cleanId || norm(gid) === nid
    })
    if (found) return normalizeGameForResponse(found)
  }

  return await fetchJson(`${LEGACY_API}/api/games/${encodeURIComponent(id)}`)
}

export async function searchAllGames(): Promise<{ results: any[] }> {
  if (isOnline() && getUserId()) {
    const games = await fetchFromTable<any>('games')
    if (games.length > 0) {
      const results = games.slice(0, 50).map(g => normalizeGameForResponse(g))
      return { results }
    }
  }

  const legacy = await fetchJson(`${LEGACY_API}/api/games/search?q=`)
  return legacy && legacy.results ? legacy : { results: [] }
}
