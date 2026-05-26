import { ipcMain, net } from 'electron'
import { MetadataProvider, GameMetadata } from '../../shared/types'
import { interfaceSettings } from '../settings/interfaceSettings'

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = net.request(url)
    request.setHeader('User-Agent', 'LaLa-HUB/1.0')
    request.on('response', (response) => {
      let data = ''
      response.on('data', (chunk) => { data += chunk.toString() })
      response.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve(null)
        }
      })
    })
    request.on('error', (err) => reject(err))
    request.end()
  })
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\[v?[\d.]+\]\s*$/, '')
    .replace(/\s*\[L\]\s*/, '')
    .replace(/\s*\[ENG(?:\s*\+\s*\w+)?\]\s*/, '')
    .replace(/\s*\[\w+\]\s*/g, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim()
}

// ─── Steam ────────────────────────────────────────────────

async function searchSteam(title: string): Promise<GameMetadata | null> {
  const q = encodeURIComponent(cleanTitle(title))
  const data = await fetchJson(`https://store.steampowered.com/api/storesearch?term=${q}&cc=us&l=en`)
  if (!data?.items?.length) return null

  const lower = cleanTitle(title).toLowerCase()
  const exact = data.items.find((i: any) => i.name?.toLowerCase() === lower)
  const best = exact || data.items[0]
  const appId: number = best.steam_appid

  // Fetch detail
  const detailData = await fetchJson(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=en`)
  const app = detailData?.[String(appId)]
  if (!app?.success) return null
  const d = app.data

  const meta: GameMetadata = {
    title: d.name || best.name,
    screenshots: [],
    platforms: [],
    genres: [],
    developers: [],
    publishers: []
  }

  meta.backgroundImage = d.background || undefined
  meta.coverImage = d.header_image || undefined
  if (d.screenshots) meta.screenshots = d.screenshots.map((s: any) => s.path_full)
  meta.description = d.about_the_game || d.detailed_description || undefined
  meta.releaseDate = d.release_date?.date || undefined

  if (d.platforms) {
    for (const [plat, val] of Object.entries(d.platforms)) {
      if (val) meta.platforms.push(plat.charAt(0).toUpperCase() + plat.slice(1))
    }
  }
  if (d.genres) meta.genres = d.genres.map((g: any) => g.description)
  if (d.metacritic) meta.metacritic = d.metacritic.score
  meta.website = d.website || undefined
  if (d.esrb) meta.esrb = d.esrb.rating
  meta.developers = d.developers || []
  meta.publishers = d.publishers || []

  return meta
}

// ─── RAWG ─────────────────────────────────────────────────

async function searchRawg(title: string): Promise<GameMetadata | null> {
  const key = interfaceSettings.rawgApiKey
  if (!key) return null

  const clean = cleanTitle(title)
  if (!clean) return null

  const q = encodeURIComponent(clean)
  const searchData = await fetchJson(
    `https://api.rawg.io/api/games?key=${key}&search=${q}&search_precise=true&page_size=5`
  )
  const results = searchData?.results || []
  if (results.length === 0) return null

  const lower = clean.toLowerCase()
  const exact = results.find((r: any) => r.name?.toLowerCase() === lower)
  const best = exact || results[0]
  const gameId: number = best.id

  // Detail
  const detail = await fetchJson(`https://api.rawg.io/api/games/${gameId}?key=${key}`)
  if (!detail) return null

  // Screenshots
  let screenshots: string[] = []
  const shotData = await fetchJson(`https://api.rawg.io/api/games/${gameId}/screenshots?key=${key}`)
  if (shotData?.results) screenshots = shotData.results.map((s: any) => s.image)

  const meta: GameMetadata = {
    title: detail.name || best.name,
    screenshots,
    platforms: [],
    genres: [],
    developers: [],
    publishers: []
  }

  meta.backgroundImage = detail.background_image || undefined
  meta.coverImage = detail.background_image || undefined
  meta.description = detail.description_raw || undefined
  meta.releaseDate = detail.released || undefined

  if (detail.platforms) {
    meta.platforms = detail.platforms
      .map((p: any) => p.platform?.name)
      .filter(Boolean)
  }
  if (detail.genres) meta.genres = detail.genres.map((g: any) => g.name)
  if (detail.rating && detail.rating > 0) meta.rating = detail.rating
  if (detail.metacritic) meta.metacritic = detail.metacritic
  meta.website = detail.website || undefined
  if (detail.esrb_rating) meta.esrb = detail.esrb_rating.name
  if (detail.developers) meta.developers = detail.developers.map((d: any) => d.name)
  if (detail.publishers) meta.publishers = detail.publishers.map((p: any) => p.name)

  return meta
}

// ─── TGDB ─────────────────────────────────────────────────

async function searchTgdb(title: string): Promise<GameMetadata | null> {
  const key = interfaceSettings.tgdbApiKey
  if (!key) return null

  const clean = cleanTitle(title)
  if (!clean) return null

  const name = encodeURIComponent(clean)
  const searchData = await fetchJson(
    `https://api.thegamesdb.net/v1/Games/ByGameName?apikey=${key}&name=${name}`
  )

  const games = searchData?.data?.games
  if (!games || games.length === 0) return null

  const lower = clean.toLowerCase()
  const exact = games.find((g: any) => g.game_title?.toLowerCase() === lower)
  const best = exact || games[0]
  const gameId: number = best.id

  // Fetch images
  let baseImage: string | undefined
  let screenshots: string[] = []
  const imgData = await fetchJson(
    `https://api.thegamesdb.net/v1/Games/Images?apikey=${key}&games_id=${gameId}`
  )
  if (imgData?.data?.images?.[String(gameId)]) {
    const imgs = imgData.data.images[String(gameId)]
    for (const img of imgs) {
      const url = `https://cdn.thegamesdb.net/images/original/${img.filename}`
      if (img.type === 'boxart' || img.type === 'fanart') {
        if (!baseImage) baseImage = url
      }
      if (img.type === 'screenshot') {
        screenshots.push(url)
      }
    }
  }

  // Fetch detail for description/platforms/genres
  const detailData = await fetchJson(
    `https://api.thegamesdb.net/v1/Games/ByGameID?apikey=${key}&id=${gameId}`
  )
  const detail = detailData?.data?.games?.[0]

  const meta: GameMetadata = {
    title: best.game_title,
    screenshots,
    platforms: [],
    genres: [],
    developers: [],
    publishers: []
  }

  meta.backgroundImage = baseImage
  meta.coverImage = baseImage
  meta.releaseDate = best.release_date || undefined

  if (detail) {
    meta.description = detail.description || undefined
    if (detail.genres) {
      meta.genres = Array.isArray(detail.genres)
        ? detail.genres.map((g: any) => (typeof g === 'string' ? g : g.genre_name || g.name))
        : typeof detail.genres === 'string'
          ? detail.genres.split(',').map((s: string) => s.trim())
          : []
    }
    if (detail.developers) {
      meta.developers = Array.isArray(detail.developers)
        ? detail.developers.map((d: any) => (typeof d === 'string' ? d : d.developer_name || d.name))
        : typeof detail.developers === 'string'
          ? [detail.developers]
          : []
    }
    if (detail.publishers) {
      meta.publishers = Array.isArray(detail.publishers)
        ? detail.publishers.map((p: any) => (typeof p === 'string' ? p : p.publisher_name || p.name))
        : typeof detail.publishers === 'string'
          ? [detail.publishers]
          : []
    }
    meta.website = detail.website || undefined
  }

  // Platform name
  if (best.platform) {
    const platName = typeof best.platform === 'string' ? best.platform : best.platform.name
    if (platName) meta.platforms.push(platName)
  }

  return meta
}

// ─── Handler registration ─────────────────────────────────

export function registerMetadataHandlers(): void {
  ipcMain.handle('metadata-search-game', async (_, title: string, provider: MetadataProvider) => {
    try {
      let result: GameMetadata | null = null
      if (provider === 'steam') result = await searchSteam(title)
      else if (provider === 'rawg') result = await searchRawg(title)
      else if (provider === 'tgdb') result = await searchTgdb(title)
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: String(err), data: null }
    }
  })
}
