import { GameMetadata, MetadataProvider } from '../../../../shared/types'

const searchCache = new Map<string, GameMetadata | null>()
const pendingSearches = new Map<string, Promise<GameMetadata | null>>()

let cachedProvider: MetadataProvider | null = null

export async function getProvider(): Promise<MetadataProvider> {
  if (cachedProvider) return cachedProvider
  try {
    const settings = await window.api.ui.getSettings()
    cachedProvider = settings.gameMetadataProvider ?? 'steam'
  } catch {
    cachedProvider = 'steam'
  }
  return cachedProvider
}

export function invalidateProviderCache(): void {
  cachedProvider = null
}

export async function isConfigured(): Promise<boolean> {
  const provider = await getProvider()
  if (provider === 'steam') return true
  const settings = await window.api.ui.getSettings()
  if (provider === 'rawg') return !!settings.rawgApiKey
  if (provider === 'tgdb') return !!settings.tgdbApiKey
  return false
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
    const provider = await getProvider()
    try {
      const result = await window.api.metadata.searchGame(title, provider)
      const data = result.data ?? null
      searchCache.set(key, data)
      return data
    } catch {
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
}
