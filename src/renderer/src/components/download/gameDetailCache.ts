import { GameMetadata, HomeSlot } from '../../../../shared/types'

const searchCache = new Map<string, GameMetadata | null>()
const pendingSearches = new Map<string, Promise<GameMetadata | null>>()
let libraryCache: HomeSlot[] | null = null
let libraryLoadPromise: Promise<HomeSlot[]> | null = null

function loadLibrary(): Promise<HomeSlot[]> {
  if (libraryCache) return Promise.resolve(libraryCache)
  if (libraryLoadPromise) return libraryLoadPromise
  libraryLoadPromise = window.api.slots.getAll().then((slots) => {
    libraryCache = slots
    libraryLoadPromise = null
    return slots
  }).catch(() => {
    libraryCache = []
    libraryLoadPromise = null
    return []
  })
  return libraryLoadPromise
}

function gameInLibrary(title: string): { coverUrl?: string; bgUrl?: string; logoUrl?: string } | null {
  if (!libraryCache) return null
  const lower = title.toLowerCase().trim()
  for (const slot of libraryCache) {
    const slotName = (slot.label || slot.game?.name || '').toLowerCase().trim()
    if (slotName === lower) {
      return {
        coverUrl: slot.verticalImage || slot.squareImage || slot.coverImage,
        bgUrl: slot.horizontalImage || slot.backgroundImage || slot.squareImage,
        logoUrl: slot.logoImage
      }
    }
  }
  return null
}

export function invalidateProviderCache(): void {
  searchCache.clear()
  pendingSearches.clear()
  libraryCache = null
  libraryLoadPromise = null
}

export async function isConfigured(): Promise<boolean> {
  const settings = await window.api.ui.getSettings()
  return !!settings.sgdbApiKey
}

export function imageUrl(url?: string): string | undefined {
  return url || undefined
}

export function searchGameByTitle(title: string): Promise<GameMetadata | null> {
  const key = title.toLowerCase().trim()

  const cached = searchCache.get(key)
  if (cached !== undefined) return Promise.resolve(cached)

  const inFlight = pendingSearches.get(key)
  if (inFlight) return inFlight

  const promise = (async (): Promise<GameMetadata | null> => {
    // 1. Check local library first
    await loadLibrary()
    const local = gameInLibrary(title)
    if (local && (local.coverUrl || local.bgUrl || local.logoUrl)) {
      console.log('[Cache] Found in library:', title, JSON.stringify(local))
      const meta: GameMetadata = {
        title,
        screenshots: [],
        platforms: [],
        genres: [],
        developers: [],
        publishers: [],
        coverImage: local.coverUrl,
        backgroundImage: local.bgUrl,
        logoImage: local.logoUrl
      }
      searchCache.set(key, meta)
      return meta
    }

    // 2. Fallback to SGDB
    console.log('[Cache] Not in library, searching SGDB:', title)
    try {
      const result = await window.api.metadata.searchGame(title)
      console.log('[Cache] SGDB result:', result.success ? (result.data ? `${result.data.title} cover=${!!result.data.coverImage} bg=${!!result.data.backgroundImage} logo=${!!result.data.logoImage}` : 'null data') : 'error: ' + result.error)
      const data = result.data ?? null
      searchCache.set(key, data)
      return data
    } catch (err) {
      console.log('[Cache] searchGameByTitle error:', err)
      searchCache.set(key, null)
      return null
    } finally {
      pendingSearches.delete(key)
    }
  })()

  pendingSearches.set(key, promise)
  return promise
}

export function clearCache(): void {
  searchCache.clear()
  libraryCache = null
}
