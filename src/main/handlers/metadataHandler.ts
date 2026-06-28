import { ipcMain, net } from 'electron'
import { GameMetadata } from '../../shared/types'
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

// ─── SteamGridDB ────────────────────────────────────────────

function fetchSgdb(url: string, key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = net.request(url)
    request.setHeader('User-Agent', 'LaLa-HUB/1.0')
    request.setHeader('Authorization', `Bearer ${key}`)
    request.setHeader('Accept', 'application/json')
    request.on('response', (response) => {
      let data = ''
      response.on('data', (chunk) => { data += chunk.toString() })
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (response.statusCode && response.statusCode >= 400) {
            console.log(`[SGDB] HTTP ${response.statusCode} for ${url.slice(0, 80)}:`, JSON.stringify(parsed).slice(0, 300))
          }
          resolve(parsed)
        } catch {
          console.log(`[SGDB] Failed to parse response (HTTP ${response.statusCode}) from ${url.slice(0, 80)}`)
          resolve(null)
        }
      })
    })
    request.on('error', (err) => {
      console.log('[SGDB] Network error:', err.message)
      reject(err)
    })
    request.end()
  })
}

async function searchSgdb(title: string): Promise<GameMetadata | null> {
  const key = interfaceSettings.sgdbApiKey
  if (!key) {
    console.log('[SGDB] No API key found in interfaceSettings')
    return null
  }
  console.log('[SGDB] Key present, length:', key.length)

  const clean = cleanTitle(title)
  if (!clean) {
    console.log('[SGDB] Empty title after cleaning:', title)
    return null
  }

  const q = encodeURIComponent(clean)

  // Search game on SteamGridDB
  const searchUrl = `https://www.steamgriddb.com/api/v2/search/autocomplete/${q}`
  const searchData = await fetchSgdb(searchUrl, key)
  console.log('[SGDB] Autocomplete response:', searchData ? 'received' : 'null')
  const results = searchData?.data || []
  if (results.length === 0) {
    console.log('[SGDB] No autocomplete results for:', clean)
    return null
  }

  const lower = clean.toLowerCase()
  const exact = results.find((r: any) => r.name?.toLowerCase() === lower)
  const best = exact || results[0]
  const sgdbId: number = best.id

  // Fetch grids (covers)
  let coverUrl: string | undefined
  let heroUrl: string | undefined
  let logoUrl: string | undefined
  const gridsUrl = `https://www.steamgriddb.com/api/v2/grids/game/${sgdbId}`
  const gridsData = await fetchSgdb(gridsUrl, key)
  if (gridsData?.data?.length) {
    const sorted = gridsData.data.sort((a: any, b: any) => (b.width || 0) - (a.width || 0))
    coverUrl = sorted[0]?.url || undefined
    console.log('[SGDB] Found cover:', coverUrl)
  }

  // Fetch heroes (backgrounds)
  const heroesUrl = `https://www.steamgriddb.com/api/v2/heroes/game/${sgdbId}`
  const heroesData = await fetchSgdb(heroesUrl, key)
  if (heroesData?.data?.length) {
    const sorted = heroesData.data.sort((a: any, b: any) => (b.width || 0) - (a.width || 0))
    heroUrl = sorted[0]?.url || undefined
    console.log('[SGDB] Found hero:', heroUrl)
  }

  // Fetch logos
  const logosUrl = `https://www.steamgriddb.com/api/v2/logos/game/${sgdbId}`
  const logosData = await fetchSgdb(logosUrl, key)
  if (logosData?.data?.length) {
    const sorted = logosData.data.sort((a: any, b: any) => (b.width || 0) - (a.width || 0))
    logoUrl = sorted[0]?.url || undefined
    console.log('[SGDB] Found logo:', logoUrl)
  }

  // Try to get additional metadata from Steam
  let description: string | undefined
  let releaseDate: string | undefined
  let platforms: string[] = []
  let genres: string[] = []
  let developers: string[] = []
  let publishers: string[] = []
  let rating: number | undefined
  let screenshots: string[] = []

  const steamData = await fetchJson(`https://store.steampowered.com/api/storesearch?term=${q}&cc=us&l=en`)
  if (steamData?.items?.length) {
    const exactSteam = steamData.items.find((i: any) => i.name?.toLowerCase() === lower)
    const bestSteam = exactSteam || steamData.items[0]
    const appId: number = bestSteam.steam_appid
    if (appId) {
      const detailData = await fetchJson(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=us&l=en`)
      const app = detailData?.[String(appId)]
      if (app?.success) {
        const d = app.data
        description = d.about_the_game || d.detailed_description || undefined
        releaseDate = d.release_date?.date || undefined
        if (d.platforms) {
          for (const [plat, val] of Object.entries(d.platforms)) {
            if (val) platforms.push(plat.charAt(0).toUpperCase() + plat.slice(1))
          }
        }
        if (d.genres) genres = d.genres.map((g: any) => g.description)
        if (d.developers) developers = d.developers
        if (d.publishers) publishers = d.publishers
        if (d.screenshots) screenshots = d.screenshots.map((s: any) => s.path_full)
      }
    }
  }

  const meta: GameMetadata = {
    title: best.name || clean,
    screenshots,
    platforms,
    genres,
    developers,
    publishers
  }

  meta.backgroundImage = heroUrl
  meta.coverImage = coverUrl
  meta.logoImage = logoUrl
  meta.description = description
  meta.releaseDate = releaseDate
  meta.website = `https://www.steamgriddb.com/game/${sgdbId}`

  return meta
}

// ─── Handler registration ─────────────────────────────────

export function registerMetadataHandlers(): void {
  ipcMain.handle('metadata-search-game', async (_, title: string) => {
    console.log('[Metadata] searchGame:', title)
    try {
      const result = await searchSgdb(title)
      console.log('[Metadata] result:', result ? `${result.title} cover=${!!result.coverImage} bg=${!!result.backgroundImage} logo=${!!result.logoImage}` : 'null')
      return { success: true, data: result }
    } catch (err) {
      console.log('[Metadata] searchGame error:', err)
      return { success: false, error: String(err), data: null }
    }
  })
}
