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

function normalizeGameForResponse(game: any, imagesBase?: string): any {
  return {
    id: game.id,
    name: game.name || game.data?.name || '',
    console: game.console || game.data?.console || null,
    releaseDate: game.release_date || game.data?.release_date || null,
    platforms: game.platforms || game.data?.platforms || [],
    images: game.images || game.data?.images || {}
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
  if (legacy && Array.isArray(legacy)) {
    return legacy
  }
  return []
}

export async function fetchYears(): Promise<string[]> {
  if (isOnline() && getUserId()) {
    const games = await fetchFromTable<any>('games')
    const years = [...new Set(games
      .map((g: any) => g.release_date || g.data?.release_date)
      .filter(Boolean)
      .map((d: string) => d.substring(0, 4))
      .filter(y => y && !isNaN(Number(y)))
    )].sort()
    if (years.length > 0) return years
  }

  const legacy = await fetchJson(`${LEGACY_API}/api/games/years`)
  if (legacy && Array.isArray(legacy)) return legacy
  return []
}

export async function searchGames(query: string): Promise<{ results: any[] }> {
  if (isOnline() && getUserId()) {
    const games = await fetchFromTable<any>('games')
    const q = query.toLowerCase()
    const filtered = games.filter((g: any) => {
      const name = (g.name || g.data?.name || '').toLowerCase()
      return name.includes(q)
    }).slice(0, 50)

    if (filtered.length > 0) {
      debugLog(`[GameApi] ${filtered.length} juegos desde Supabase`)
      return { results: filtered.map(g => normalizeGameForResponse(g)) }
    }
  }

  const legacy = await fetchJson(`${LEGACY_API}/api/games/search?q=${encodeURIComponent(query)}`)
  if (legacy && legacy.results) return legacy
  return { results: [] }
}

export async function getGameById(id: string): Promise<any | null> {
  if (isOnline() && getUserId()) {
    const games = await fetchFromTable<any>('games')
    const found = games.find((g: any) => g.id === id || g.data?.id === id)
    if (found) return found
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
  if (legacy && legacy.results) return legacy
  return { results: [] }
}
