import { app, BrowserWindow, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import * as dns from 'dns'
import { v4 as uuidv4 } from 'uuid'
import { DownloadEntry, DownloadSource, DownloadTask, DownloadProgress } from '../../shared/types'
import { saveJson, readJson, ensureDirectory } from './storage'
import { debugLog, debugError } from './debug'
import { interfaceSettings } from '../settings/interfaceSettings'

let webTorrentClient: any = null

function base32ToHex(base32Str: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (let i = 0; i < base32Str.length; i++) {
    const val = alphabet.indexOf(base32Str[i].toUpperCase())
    if (val >= 0) {
      bits += val.toString(2).padStart(5, '0')
    }
  }
  let hex = ''
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    const chunk = bits.substring(i, i + 4)
    hex += parseInt(chunk, 2).toString(16)
  }
  return hex.toLowerCase()
}

function parseInfoHash(magnetUri: string): string | null {
  const match = magnetUri.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i)
  if (!match) return null
  const hash = match[1]
  if (hash.length === 32) {
    return base32ToHex(hash)
  }
  return hash.toLowerCase()
}

function destroyExistingTorrent(client: any, uri: string): void {
  const targetHash = parseInfoHash(uri)
  if (!targetHash || !client.torrents) return
  const existing = client.torrents.find((t: any) => {
    const tHash = parseInfoHash(t.magnetURI || t.link || '')
    return tHash === targetHash
  })
  if (existing && !existing.destroyed) {
    debugLog(`[DownloadManager] Destroying existing torrent: ${uri.substring(0, 60)}...`)
    existing.destroy()
  }
}
const DHT_BOOTSTRAP_NODES = [
  'router.bittorrent.com:6881',
  'dht.transmissionbt.com:6881',
  'router.utorrent.com:6881',
  'dht.aelitis.com:6881'
]

const ALT_DNS_SERVERS = ['8.8.8.8', '1.1.1.1', '8.8.4.4']

async function getWebTorrentClient() {
  if (!webTorrentClient) {
    try {
      dns.setServers(ALT_DNS_SERVERS)
      const pkg = await import('webtorrent')
      const WebTorrent = pkg.default || pkg
      webTorrentClient = new WebTorrent({
        dht: { bootstrap: DHT_BOOTSTRAP_NODES }
      })
      debugLog('[DownloadManager] WebTorrent client initialized successfully.')
    } catch (e: any) {
      debugError(`[DownloadManager] Failed to initialize WebTorrent: ${e.message || e}`)
    }
  }
  return webTorrentClient
}

// ── qBittorrent Web API ──────────────────────────────────────────────────────
const QB_DEFAULTS = {
  host: 'http://localhost:8080',
  username: 'admin',
  password: 'adminadmin'
}

async function qbLogin(): Promise<boolean> {
  if (qbSession) return true
  try {
    const res = await fetch(`${QB_DEFAULTS.host}/api/v2/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${QB_DEFAULTS.username}&password=${QB_DEFAULTS.password}`,
      signal: AbortSignal.timeout(5000)
    })
    if (res.ok) {
      const cookie = res.headers.get('set-cookie') || ''
      qbSession = { host: QB_DEFAULTS.host, cookie }
      debugLog('[DownloadManager] qBittorrent Web API connected')
      return true
    }
  } catch { /* qBittorrent not running */ }
  return false
}

async function qbStartTorrent(infoHash: string): Promise<void> {
  if (!qbSession) return
  try {
    const body = new URLSearchParams()
    body.set('hashes', infoHash)
    await fetch(`${qbSession.host}/api/v2/torrents/start`, {
      method: 'POST',
      headers: { 'Cookie': qbSession.cookie },
      body,
      signal: AbortSignal.timeout(3000)
    }).catch(() => {})
    await fetch(`${qbSession.host}/api/v2/torrents/resume`, {
      method: 'POST',
      headers: { 'Cookie': qbSession.cookie },
      body,
      signal: AbortSignal.timeout(3000)
    }).catch(() => {})

    const forceBody = new URLSearchParams()
    forceBody.set('hashes', infoHash)
    forceBody.set('value', 'true')
    await fetch(`${qbSession.host}/api/v2/torrents/setForceStart`, {
      method: 'POST',
      headers: { 'Cookie': qbSession.cookie },
      body: forceBody,
      signal: AbortSignal.timeout(3000)
    }).catch(() => {})
  } catch {}
}

async function qbPauseTorrent(infoHash: string): Promise<void> {
  if (!qbSession) return
  try {
    const body = new URLSearchParams()
    body.set('hashes', infoHash)
    await fetch(`${qbSession.host}/api/v2/torrents/stop`, {
      method: 'POST',
      headers: { 'Cookie': qbSession.cookie },
      body,
      signal: AbortSignal.timeout(3000)
    }).catch(() => {})
    await fetch(`${qbSession.host}/api/v2/torrents/pause`, {
      method: 'POST',
      headers: { 'Cookie': qbSession.cookie },
      body,
      signal: AbortSignal.timeout(3000)
    }).catch(() => {})
  } catch {}
}

async function qbAddMagnet(magnet: string, savePath: string): Promise<string | null> {
  if (!qbSession) return null
  try {
    const body = new URLSearchParams()
    body.set('urls', magnet)
    body.set('savepath', savePath)
    const res = await fetch(`${qbSession.host}/api/v2/torrents/add`, {
      method: 'POST',
      headers: { 'Cookie': qbSession.cookie },
      body,
      signal: AbortSignal.timeout(10000)
    })
    if (res.ok) {
      const hash = parseInfoHash(magnet)
      if (hash) {
        await qbStartTorrent(hash)
        return hash
      }
    }
  } catch {}
  return null
}

async function qbGetTorrentInfo(infoHash: string): Promise<any | null> {
  if (!qbSession) return null
  try {
    const res = await fetch(
      `${qbSession.host}/api/v2/torrents/info?hashes=${infoHash}`,
      { headers: { 'Cookie': qbSession.cookie }, signal: AbortSignal.timeout(5000) }
    )
    if (res.ok) {
      const list = await res.json()
      return list[0] || null
    }
  } catch {}
  return null
}

async function qbRemoveTorrent(infoHash: string, deleteFiles = false): Promise<void> {
  if (!qbSession) return
  try {
    const body = new URLSearchParams()
    body.set('hashes', infoHash)
    body.set('deleteFiles', deleteFiles ? 'true' : 'false')
    await fetch(`${qbSession.host}/api/v2/torrents/delete`, {
      method: 'POST',
      headers: { 'Cookie': qbSession.cookie },
      body,
      signal: AbortSignal.timeout(5000)
    })
  } catch {}
}

// ── Public trackers ──────────────────────────────────────────────────────────
const PUBLIC_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'http://tracker.openbittorrent.com:80/announce',
  'udp://tracker.openbittorrent.com:6969/announce',
  'https://tracker.openbittorrent.com:443/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'http://tracker.ipv6tracker.org:80/announce',
  'https://tracker.nrekwup.com:443/announce',
  'udp://tracker.moeking.me:6969/announce'
]

const DOWNLOADS_FILE = 'downloads'
const DOWNLOADS_FOLDER = 'data'
const SOURCES_CACHE_FOLDER = 'cache'
const SOURCES_CACHE_FILE = 'sources-cache'

export const DOWNLOAD_DIR = app.getPath('downloads')

function resolveDownloadDir(): string {
  const customPath = interfaceSettings.downloadPath
  const dir = customPath && path.isAbsolute(customPath)
    ? customPath
    : path.join(DOWNLOAD_DIR, 'LaLa-HUB')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function parseFileSize(sizeStr: string): number {
  const match = sizeStr.trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i)
  if (!match) return 0
  const value = parseFloat(match[1])
  const unit = match[2].toUpperCase()
  const units: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }
  return Math.round(value * (units[unit] || 1))
}

export interface SourceCache {
  url: string
  data: DownloadSource
  fetchedAt: string
}

let activeHttpDownloads = new Map<
  string,
  { controller: AbortController; bytesReceived: number; totalBytes: number; startTime: number }
>()
let activeTorrentDownloads = new Map<
  string,
  { torrent: any; interval: NodeJS.Timeout }
>()

interface QBDownload {
  hash: string
  interval: NodeJS.Timeout
}
let activeQBDownloads = new Map<string, QBDownload>()
let qbSession: { host: string; cookie: string } | null = null

let tasks: DownloadTask[] = []
let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}

export function loadTasks(): DownloadTask[] {
  const saved = readJson<DownloadTask[]>(DOWNLOADS_FOLDER, DOWNLOADS_FILE)
  if (saved) {
    tasks = saved.map(t => {
      if (t.status === 'downloading') {
        return {
          ...t,
          status: 'paused',
          speed: 'Pausado',
          speedBytes: 0
        }
      }
      return t
    })
  } else {
    tasks = []
  }
  return tasks
}

function persistTasks(): void {
  saveJson(DOWNLOADS_FOLDER, DOWNLOADS_FILE, tasks)
}

function pushProgress(progress: DownloadProgress): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download-progress', progress)
  }
}

export function processQueue(): void {
  const isDownloading = tasks.some((t) => t.status === 'downloading')
  if (isDownloading) return

  const nextTask = tasks.find((t) => t.status === 'queued')
  if (nextTask) {
    executeDownload(nextTask).catch((err) => debugError(`[DownloadManager] Download failed: ${err}`))
  }
}

function hashUrl(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex')
}

export async function fetchSource(url: string): Promise<DownloadSource> {
  const cacheKey = SOURCES_CACHE_FILE + '-' + hashUrl(url)
  const cache = readJson<SourceCache>(SOURCES_CACHE_FOLDER, cacheKey)
  if (cache && Date.now() - new Date(cache.fetchedAt).getTime() < 5 * 60 * 1000) {
    debugLog(`[DownloadManager] Using cached source: ${url}`)
    return cache.data
  }

  debugLog(`[DownloadManager] Fetching source: ${url}`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  const data: DownloadSource = await response.json()

  ensureDirectory(SOURCES_CACHE_FOLDER)
  saveJson(SOURCES_CACHE_FOLDER, cacheKey, {
    url,
    data,
    fetchedAt: new Date().toISOString()
  } satisfies SourceCache)

  return data
}

export function getSourcesConfig(): Array<{ name: string; url: string }> {
  return [
    { name: 'GOG', url: 'https://hydralinks.pages.dev/sources/gog.json' },
    { name: 'Steam', url: 'https://hydralinks.pages.dev/sources/steam.json' },
    { name: 'FitGirl', url: 'https://hydralinks.pages.dev/sources/fitgirl.json' },
    { name: 'SteamGG', url: 'https://wkeynhk.online/steamgg.json' }
  ]
}

export function getTasks(): DownloadTask[] {
  return tasks
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Upgrade-Insecure-Requests': '1'
}

let gofileGuestToken = ''
let gofileTokenPromise: Promise<string> | null = null

async function getGofileToken(): Promise<string> {
  if (gofileGuestToken) return gofileGuestToken
  if (gofileTokenPromise) return gofileTokenPromise

  gofileTokenPromise = (async () => {
    try {
      const res = await fetch('https://api.gofile.io/accounts', {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      })
      const data = await res.json()
      if (data && data.status === 'ok' && data.data && data.data.token) {
        gofileGuestToken = data.data.token
        return gofileGuestToken
      }
    } catch {}
    return ''
  })()

  const token = await gofileTokenPromise
  gofileTokenPromise = null
  return token
}

export function resolveDirectUrl(url: string): string {
  if (!url) return url
  try {
    const pdMatch = url.match(/^https?:\/\/(?:www\.)?pixeldrain\.com\/u\/([a-zA-Z0-9_-]+)/i)
    if (pdMatch && pdMatch[1]) {
      return `https://pixeldrain.com/api/file/${pdMatch[1]}`
    }
  } catch {}
  return url
}

export async function resolveDirectUrlAsync(
  url: string,
  extraHeaders: Record<string, string> = {},
  signal?: AbortSignal
): Promise<{ url: string; headers: Record<string, string> }> {
  if (!url) return { url, headers: extraHeaders }

  try {
    // 1. Pixeldrain
    const pdMatch = url.match(/^https?:\/\/(?:www\.)?pixeldrain\.com\/u\/([a-zA-Z0-9_-]+)/i)
    if (pdMatch && pdMatch[1]) {
      return { url: `https://pixeldrain.com/api/file/${pdMatch[1]}`, headers: extraHeaders }
    }

    // 2. Gofile folder / file URL (`https://gofile.io/d/NNQCcs`)
    const gfMatch = url.match(/^https?:\/\/(?:www\.)?gofile\.io\/d\/([a-zA-Z0-9_-]+)/i)
    if (gfMatch && gfMatch[1]) {
      const contentId = gfMatch[1]
      debugLog(`[DownloadManager] Resolviendo enlace Gofile (ID: ${contentId})...`)
      const token = await getGofileToken()
      const urlsToQuery = [
        `https://api.gofile.io/contents/${contentId}?wt=4fd6sg89d7s6&cache=true`,
        `https://api.gofile.io/getContent?contentId=${contentId}&token=${token}&wt=4fd6sg89d7s6`,
        `https://api.gofile.io/contents/${contentId}`
      ]

      let data: any = null
      for (const apiUrl of urlsToQuery) {
        try {
          const res = await fetch(apiUrl, {
            signal,
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Accept': 'application/json',
              ...BROWSER_HEADERS
            }
          })
          const d = await res.json()
          if (d && d.status === 'ok' && d.data) {
            data = d
            break
          }
        } catch {}
      }

      if (data && data.status === 'ok' && data.data) {
        debugLog(`[DownloadManager] Gofile API respuesta para ${contentId} (claves: ${Object.keys(data.data).join(', ')})`)
        let directLink: string | null = data.data.link || data.data.directLink || data.data.url || null
        if (!directLink) {
          const items = Object.values(data.data.children || data.data.contents || data.data.list || data.data.files || {}) as any[]
          const files = items.filter((c: any) => c && (c.type === 'file' || c.mimetype || c.link || c.directLink || c.url))
          if (files.length > 0) {
            files.sort((a, b) => (b.size || 0) - (a.size || 0))
            directLink = files[0].link || files[0].directLink || files[0].url
          }
        }
        if (directLink) {
          debugLog(`[DownloadManager] Gofile resuelto a enlace directo: ${directLink}`)
          const updatedHeaders = { ...extraHeaders }
          if (token) {
            updatedHeaders['Cookie'] = `accountToken=${token}`
          }
          return { url: directLink, headers: updatedHeaders }
        }
      } else {
        debugLog(`[DownloadManager] Gofile API no devolvió datos válidos para ${contentId}: ${JSON.stringify(data)}`)
      }
    }

    // 3. Mediafire (`https://www.mediafire.com/file/...`)
    if (url.includes('mediafire.com/file/')) {
      debugLog(`[DownloadManager] Resolviendo enlace Mediafire (${url})...`)
      const res = await fetch(url, { headers: BROWSER_HEADERS, signal })
      const html = await res.text()
      const mfMatch =
        html.match(/id="downloadButton"\s+href="([^"]+)"/i) ||
        html.match(/href="(https?:\/\/download[^"]+mediafire\.com[^"]+)"/i)
      if (mfMatch && mfMatch[1]) {
        return { url: mfMatch[1], headers: extraHeaders }
      }
    }

    // 4. AkiraBox / Qiwi / Datanodes / Cyberlockers (Referer requerido para evitar 403)
    if (url.includes('akirabox.com') || url.includes('qiwi.gg') || url.includes('datanodes.to') || url.includes('send.cm') || url.includes('megaup.net') || url.includes('filekeeper.net')) {
      debugLog(`[DownloadManager] Configurando Referer para cyberlocker (${url})...`)
      const baseLandingUrl = url.replace(/\/file\/?$/, '')
      const res = await fetch(baseLandingUrl, { headers: BROWSER_HEADERS, signal })
      const cookies = res.headers.get('set-cookie') || ''
      const html = await res.text()
      const dlMatch =
        html.match(/id=["']?download[^"'>]*["']?\s+[^>]*href=["'](https?:\/\/[^"'>]+)["']/i) ||
        html.match(/href=["'](https?:\/\/[^"'>]+akirabox[^"'>]+\/file[^"'>]*)["']/i) ||
        html.match(/href=["'](https?:\/\/[^"'>]+\.(?:rar|zip|7z|bin|iso|exe|part1|001))["']/i)

      const updatedHeaders = { ...extraHeaders, 'Referer': baseLandingUrl }
      if (cookies) {
        updatedHeaders['Cookie'] = cookies.split(';')[0]
      }
      if (dlMatch && dlMatch[1]) {
        return { url: dlMatch[1], headers: updatedHeaders }
      }
      return { url: url, headers: updatedHeaders }
    }
  } catch (err) {
    debugLog(`[DownloadManager] Error en resolución de URL (${url}): ${err}`)
  }

  return { url: resolveDirectUrl(url), headers: extraHeaders }
}

export async function checkUriStatus(uri: string): Promise<boolean> {
  if (!uri) return false
  if (uri.startsWith('magnet:') || uri.endsWith('.torrent') || uri.includes('mega.nz') || uri.includes('drive.google.com')) {
    // Magnet, torrents, MEGA y GDrive se abren por cliente/navegador o son P2P, los damos por activos
    return true
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const { url: resolved, headers } = await resolveDirectUrlAsync(uri, BROWSER_HEADERS, controller.signal)

    const response = await fetch(resolved, {
      signal: controller.signal,
      method: 'GET',
      headers
    })
    
    clearTimeout(timeout)
    controller.abort()

    return response.ok || response.status < 400
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return false
    }
    return false
  }
}

function matchTitle(search: string, target: string): boolean {
  const s = search.toLowerCase()
  const t = target.toLowerCase()
  if (t === s) return true
  
  // Clean titles by removing common brackets
  const cleanT = t.replace(/\[.*?\]|\(.*?\)/g, '').trim()
  if (cleanT === s) return true

  const sParts = s.split(/[\s\-:\[\]\(\)]+/).filter((p) => p.length > 2)
  if (sParts.length === 0) return t.includes(s)
  
  // All parts from the search string must be in the target string
  return sParts.every((part) => t.includes(part))
}

export async function searchGameInSources(
  title: string
): Promise<{ sourceName: string; entry: DownloadEntry }[]> {
  const sources = getSourcesConfig()
  const results: { sourceName: string; entry: DownloadEntry }[] = []

  for (const src of sources) {
    try {
      const data = await fetchSource(src.url)
      for (const entry of data.downloads) {
        if (matchTitle(title, entry.title)) {
          results.push({ sourceName: src.name, entry })
        }
      }
    } catch (e) {
      debugError(`[DownloadManager] Error searching in source ${src.name}: ${e}`)
    }
  }

  return results
}

export async function startDownload(
  entry: DownloadEntry,
  sourceName: string
): Promise<DownloadTask> {
  const uri = entry.uris[0]
  if (!uri) throw new Error('No URIs available')

  const task: DownloadTask = {
    id: uuidv4(),
    title: entry.title,
    source: sourceName,
    uri,
    uris: entry.uris,
    fileSize: entry.fileSize,
    status: 'queued',
    progress: 0,
    speed: '',
    addedAt: new Date().toISOString()
  }

  tasks.push(task)
  persistTasks()

  processQueue()

  return task
}

async function executeDownload(task: DownloadTask): Promise<void> {
  const uri = task.uri

  if (uri.startsWith('magnet:')) {
    await handleMagnet(task)
  } else if (uri.startsWith('http:') || uri.startsWith('https:')) {
    await handleHttpDownload(task)
  } else {
    updateTaskStatus(task.id, 'error', 'Unsupported URI scheme')
  }
}

const TORRENT_STALL_TIMEOUT = 120_000

async function handleMagnet(task: DownloadTask): Promise<void> {
  updateTaskStatus(task.id, 'downloading', undefined, 0)
  const targetDir = resolveDownloadDir()

  // ── Try qBittorrent Web API first ─────────────────────────────────────────
  if (await qbLogin()) {
    task.statusMessage = 'Añadiendo a qBittorrent...'
    const hash = await qbAddMagnet(task.uri, targetDir)
    if (hash) {
      debugLog(`[DownloadManager] qBittorrent added: ${task.title} (${hash})`)
      const interval = setInterval(async () => {
        const info = await qbGetTorrentInfo(hash)
        if (!info) return

        if (task.status === 'downloading' && (info.state === 'pausedDL' || info.state === 'queuedDL' || info.state === 'stoppable')) {
          qbStartTorrent(hash).catch(() => {})
        }

        const progress = Math.min(100, Math.max(0, parseFloat(((info.progress || 0) * 100).toFixed(1))))
        const speedBytes = info.dlspeed || 0
        const speedStr = speedBytes > 1024 * 1024
          ? `${(speedBytes / (1024 * 1024)).toFixed(1)} MB/s`
          : speedBytes > 1024
            ? `${(speedBytes / 1024).toFixed(1)} KB/s`
            : speedBytes > 0
              ? `${speedBytes.toFixed(0)} B/s`
              : info.state === 'queuedDL' || info.state === 'pausedDL'
                ? 'En cola'
                : info.state === 'stalledDL'
                  ? 'Esperando pares...'
                  : info.state === 'checkingDL' || info.state === 'checkingUP'
                    ? 'Verificando...'
                    : info.state === 'metaDL'
                      ? 'Obteniendo metadatos...'
                      : info.num_complete > 0
                        ? `${info.num_complete} seeders, ${info.num_leech} leechers`
                        : 'Conectando...'

        const DownloadedBytes = info.completed || info.downloaded || 0
        const totalBytes = info.total_size || info.size || 0
        const peers = info.num_leech || 0
        const state = info.state || ''

        const isCompleted = state === 'uploading' || state === 'stalledUP' ||
          (progress >= 100 && (state === 'pausedUP' || state === 'queuedUP' || state === 'checkingUP'))

        const rawEta = info.eta || 0
        const etaSeconds = rawEta >= 8640000 || rawEta < 0 || rawEta > 86400 * 30 ? 0 : rawEta

        pushProgress({
          id: task.id,
          progress,
          speed: speedStr,
          speedBytes: speedBytes,
          status: isCompleted ? 'completed' : 'downloading',
          downloadedBytes: DownloadedBytes,
          totalBytes,
          peers: peers + (info.num_complete || 0),
          etaSeconds,
          statusMessage: task.statusMessage || ''
        })
        task.progress = progress
        task.speed = speedStr
        task.speedBytes = speedBytes
        task.downloadedBytes = DownloadedBytes
        task.totalBytes = totalBytes
        task.peers = peers
        task.etaSeconds = etaSeconds

        if (isCompleted) {
          clearInterval(interval)
          activeQBDownloads.delete(task.id)
          debugLog(`[DownloadManager] qBittorrent download completed: ${task.title}`)
          updateTaskStatus(task.id, 'completed', undefined, 100)
          pushProgress({
            id: task.id,
            progress: 100,
            speed: 'Completado',
            status: 'completed',
            downloadedBytes: totalBytes,
            totalBytes,
            etaSeconds: 0,
            statusMessage: undefined
          })
        }
      }, 1000)

      activeQBDownloads.set(task.id, { hash, interval })
      return
    }
    debugLog(`[DownloadManager] qBittorrent add failed, falling back to WebTorrent`)
  }

  // ── Fallback: embedded WebTorrent ────────────────────────────────────────
  const client = await getWebTorrentClient()
  if (client) {
    debugLog(`[DownloadManager] Starting embedded torrent download for ${task.title} into ${targetDir}`)
    try {
      destroyExistingTorrent(client, task.uri)
      task.statusMessage = 'Iniciando torrent...'
      const torrent = client.add(task.uri, { path: targetDir, announce: PUBLIC_TRACKERS })

      let stallTimer: NodeJS.Timeout | null = setTimeout(() => {
        if (torrent.numPeers === 0 && (!torrent.downloaded || torrent.downloaded === 0)) {
          debugLog(`[DownloadManager] Torrent stalled (no peers) for ${task.title}`)
          task.statusMessage = 'Sin pares disponibles. Verifica que el torrent tenga seeders.'
        }
      }, TORRENT_STALL_TIMEOUT)

      const interval = setInterval(() => {
        if (torrent.destroyed) {
          clearInterval(interval)
          return
        }
        if (stallTimer && (torrent.numPeers > 0 || (torrent.downloaded || 0) > 0)) {
          clearTimeout(stallTimer)
          stallTimer = null
          task.statusMessage = undefined
        }

        const progress = Math.min(100, Math.max(0, parseFloat(((torrent.progress || 0) * 100).toFixed(1))))
        const speedBytes = torrent.downloadSpeed || 0
        const speedStr = speedBytes > 1024 * 1024
          ? `${(speedBytes / (1024 * 1024)).toFixed(1)} MB/s`
          : speedBytes > 1024
            ? `${(speedBytes / 1024).toFixed(1)} KB/s`
            : speedBytes > 0
              ? `${speedBytes.toFixed(0)} B/s`
              : (torrent.numPeers || 0) > 0
                ? `Conectando a ${torrent.numPeers} pares...`
                : task.statusMessage || `Buscando pares en red...`

        const downloadedBytes = torrent.downloaded || 0
        const totalBytes = torrent.length || 0
        const peers = torrent.numPeers || 0
        const remainingBytes = totalBytes > downloadedBytes ? totalBytes - downloadedBytes : 0
        const etaSeconds = speedBytes > 0 ? Math.round(remainingBytes / speedBytes) : 0

        pushProgress({
          id: task.id,
          progress,
          speed: speedStr,
          speedBytes: speedBytes,
          status: 'downloading',
          downloadedBytes,
          totalBytes,
          peers,
          etaSeconds,
          statusMessage: task.statusMessage || ''
        })
        task.progress = progress
        task.speed = speedStr
        task.speedBytes = speedBytes
        task.downloadedBytes = downloadedBytes
        task.totalBytes = totalBytes
        task.peers = peers
        task.etaSeconds = etaSeconds
      }, 1000)

      activeTorrentDownloads.set(task.id, { torrent, interval })

      torrent.on('done', () => {
        clearInterval(interval)
        if (stallTimer) clearTimeout(stallTimer)
        activeTorrentDownloads.delete(task.id)
        debugLog(`[DownloadManager] Torrent completed: ${task.title}`)
        updateTaskStatus(task.id, 'completed', undefined, 100)
        pushProgress({
          id: task.id,
          progress: 100,
          speed: 'Completado',
          status: 'completed',
          downloadedBytes: torrent.length,
          totalBytes: torrent.length,
          peers: 0,
          etaSeconds: 0
        })
      })

      torrent.on('error', (err: any) => {
        clearInterval(interval)
        if (stallTimer) clearTimeout(stallTimer)
        activeTorrentDownloads.delete(task.id)
        debugError(`[DownloadManager] Torrent error for ${task.title}: ${err}`)
        updateTaskStatus(task.id, 'error', `Error torrent: ${err.message || err}`)
      })
    } catch (err: any) {
      updateTaskStatus(task.id, 'error', `Error añadiendo torrent: ${err.message}`)
    }
  } else {
    updateTaskStatus(task.id, 'error', 'No se pudo inicializar el motor WebTorrent interno')
  }
}

async function handleHttpDownload(task: DownloadTask): Promise<void> {
  updateTaskStatus(task.id, 'downloading', undefined, 0)

  const controller = new AbortController()
  const startTime = Date.now()
  activeHttpDownloads.set(task.id, { controller, bytesReceived: 0, totalBytes: 0, startTime })

  const urisToTry = task.uris && task.uris.length > 0 ? task.uris : [task.uri]
  let lastError: any = null

  for (const currentUri of urisToTry) {
    try {
      debugLog(`[DownloadManager] Attempting HTTP download: ${currentUri}`)
      
      // Si es MEGA o GDrive, abrir directamente en navegador porque requieren JS del lado cliente o cookies
      if (currentUri.includes('mega.nz') || currentUri.includes('drive.google.com')) {
        debugLog(`[DownloadManager] Enlace web o cyberlocker (${currentUri}). Abriendo en navegador externo...`)
        shell.openExternal(currentUri)
        activeHttpDownloads.delete(task.id)
        updateTaskStatus(task.id, 'opened', undefined, 100)
        return
      }

      const { url: resolvedUri, headers: dynamicHeaders } = await resolveDirectUrlAsync(currentUri, BROWSER_HEADERS)
      const response = await fetch(resolvedUri, {
        signal: controller.signal,
        headers: dynamicHeaders
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (contentType.toLowerCase().includes('text/html')) {
        const htmlText = await response.text()
        const metaRefresh =
          htmlText.match(/<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["']?\d+;\s*url=([^"'>\s]+)/i) ||
          htmlText.match(/window\.location\.href\s*=\s*["']([^"']+)["']/i) ||
          htmlText.match(/href=["'](https?:\/\/[^"']+\.(?:rar|zip|7z|bin|iso|exe|part1|001))["']/i)

        if (metaRefresh && metaRefresh[1] && metaRefresh[1].startsWith('http')) {
          debugLog(`[DownloadManager] Redirección HTML intermedia encontrada (${metaRefresh[1]}). Descargando...`)
          const subRes = await fetch(metaRefresh[1], { signal: controller.signal, headers: dynamicHeaders })
          if (subRes.ok && !subRes.headers.get('content-type')?.toLowerCase().includes('text/html')) {
            const subLength = subRes.headers.get('content-length')
            const totalBytes = subLength ? parseInt(subLength, 10) : parseFileSize(task.fileSize)
            const downloadsDir = resolveDownloadDir()
            const safeName = task.title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100)
            const ext = path.extname(new URL(metaRefresh[1]).pathname) || '.bin'
            const filePath = path.join(downloadsDir, `${safeName}${ext}`)
            const reader = subRes.body!.getReader()
            const writer = fs.createWriteStream(filePath)
            let bytesReceived = 0
            let lastProgressTime = 0
            let lastBytesReceived = 0
            let lastActiveTime = Date.now()

            const heartbeat = setInterval(() => {
              if (bytesReceived > lastBytesReceived) {
                lastBytesReceived = bytesReceived
                lastActiveTime = Date.now()
              } else if (bytesReceived > 0 && bytesReceived < totalBytes) {
                const speedStr = '0 B/s (Esperando datos...)'
                const progress = totalBytes > 0 ? Math.round((bytesReceived / totalBytes) * 100) : 0
                task.progress = progress
                task.speed = speedStr
                task.speedBytes = 0
                task.downloadedBytes = bytesReceived
                task.totalBytes = totalBytes
                pushProgress({ id: task.id, progress, speed: speedStr, speedBytes: 0, status: 'downloading', downloadedBytes: bytesReceived, totalBytes, etaSeconds: 0 })
                if (Date.now() - lastActiveTime > 30000) {
                  clearInterval(heartbeat)
                  controller.abort(new Error('estancado: 30s sin datos'))
                }
              }
            }, 1000)

            const pump = async (): Promise<void> => {
              try {
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  const canWrite = writer.write(Buffer.from(value))
                  bytesReceived += value.length
                  if (!canWrite) await new Promise<void>((r) => writer.once('drain', r))
                  const active = activeHttpDownloads.get(task.id)
                  if (active) active.bytesReceived = bytesReceived
                  const now = Date.now()
                  if (now - lastProgressTime >= 200 || bytesReceived === totalBytes) {
                    lastProgressTime = now
                    lastActiveTime = now
                    lastBytesReceived = bytesReceived
                    const elapsed = (now - startTime) / 1000
                    const speed = elapsed > 0 ? bytesReceived / elapsed : 0
                    const speedStr = speed > 1024 * 1024 ? `${(speed / (1024 * 1024)).toFixed(1)} MB/s` : speed > 1024 ? `${(speed / 1024).toFixed(1)} KB/s` : `${speed.toFixed(0)} B/s`
                    const progress = totalBytes > 0 ? Math.round((bytesReceived / totalBytes) * 100) : 0
                    const remainingBytes = totalBytes > bytesReceived ? totalBytes - bytesReceived : 0
                    const etaSeconds = speed > 0 ? Math.round(remainingBytes / speed) : 0
                    task.progress = progress; task.speed = speedStr; task.speedBytes = speed; task.downloadedBytes = bytesReceived; task.totalBytes = totalBytes; task.etaSeconds = etaSeconds
                    pushProgress({ id: task.id, progress, speed: speedStr, speedBytes: speed, status: 'downloading', downloadedBytes: bytesReceived, totalBytes, etaSeconds })
                  }
                }
              } finally { clearInterval(heartbeat) }
            }

            await pump()
            writer.end()
            await new Promise<void>((res, rej) => { writer.on('finish', res); writer.on('error', rej) })
            if (totalBytes > 1024 && bytesReceived < totalBytes * 0.99) throw new Error('Conexión cerrada prematuramente en subenlace')
            updateTaskStatus(task.id, 'completed', undefined, 100)
            return
          }
        }

        debugLog(`[DownloadManager] URL (${resolvedUri}) devolvió página HTML no automatizable. Reintentando otro enlace...`)
        throw new Error('Enlace protegido por verificación web interactiva / HTML')
      }

      const contentLength = response.headers.get('content-length')
      const totalBytes = contentLength ? parseInt(contentLength, 10) : parseFileSize(task.fileSize)

      const downloadsDir = resolveDownloadDir()
      const safeName = task.title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100)
      const ext = path.extname(new URL(currentUri).pathname) || '.bin'
      const filePath = path.join(downloadsDir, `${safeName}${ext}`)

      const reader = response.body.getReader()
      const writer = fs.createWriteStream(filePath)
      let bytesReceived = 0
      let lastProgressTime = 0
      let lastBytesReceived = 0
      let lastActiveTime = Date.now()

      const heartbeat = setInterval(() => {
        if (bytesReceived > lastBytesReceived) {
          lastBytesReceived = bytesReceived
          lastActiveTime = Date.now()
        } else if (bytesReceived > 0 && bytesReceived < totalBytes) {
          // No bytes received right now -> speed is 0
          const speedStr = '0 B/s (Esperando datos...)'
          const progress = totalBytes > 0 ? Math.round((bytesReceived / totalBytes) * 100) : 0

          task.progress = progress
          task.speed = speedStr
          task.speedBytes = 0
          task.downloadedBytes = bytesReceived
          task.totalBytes = totalBytes

          pushProgress({
            id: task.id,
            progress,
            speed: speedStr,
            speedBytes: 0,
            status: 'downloading',
            downloadedBytes: bytesReceived,
            totalBytes,
            etaSeconds: 0
          })

          if (Date.now() - lastActiveTime > 30000) {
            clearInterval(heartbeat)
            debugError(`[DownloadManager] Connection stalled for 30s (${currentUri}). Aborting...`)
            controller.abort(new Error('estancado: 30s sin datos'))
          }
        }
      }, 1000)

      const pump = async (): Promise<void> => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const canWrite = writer.write(Buffer.from(value))
            bytesReceived += value.length

            if (!canWrite) {
              await new Promise<void>((resolve) => writer.once('drain', resolve))
            }

            const active = activeHttpDownloads.get(task.id)
            if (active) {
              active.bytesReceived = bytesReceived
            }

            const now = Date.now()
            if (now - lastProgressTime >= 200 || bytesReceived === totalBytes) {
              lastProgressTime = now
              lastActiveTime = now
              lastBytesReceived = bytesReceived
              const elapsed = (now - startTime) / 1000
              const speed = elapsed > 0 ? bytesReceived / elapsed : 0
              const speedStr =
                speed > 1024 * 1024
                  ? `${(speed / (1024 * 1024)).toFixed(1)} MB/s`
                  : speed > 1024
                    ? `${(speed / 1024).toFixed(1)} KB/s`
                    : `${speed.toFixed(0)} B/s`
              const progress = totalBytes > 0 ? Math.round((bytesReceived / totalBytes) * 100) : 0
              const remainingBytes = totalBytes > bytesReceived ? totalBytes - bytesReceived : 0
              const etaSeconds = speed > 0 ? Math.round(remainingBytes / speed) : 0

              task.progress = progress
              task.speed = speedStr
              task.speedBytes = speed
              task.downloadedBytes = bytesReceived
              task.totalBytes = totalBytes
              task.etaSeconds = etaSeconds

              pushProgress({
                id: task.id,
                progress,
                speed: speedStr,
                speedBytes: speed,
                status: 'downloading',
                downloadedBytes: bytesReceived,
                totalBytes,
                etaSeconds
              })
            }
          }
        } finally {
          clearInterval(heartbeat)
        }
      }

      await pump()
      writer.end()

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
      })

      if (totalBytes > 1024 && bytesReceived < totalBytes * 0.99) {
        throw new Error(`Servidor cerró la conexión prematuramente: solo se recibieron ${(bytesReceived / 1024).toFixed(2)} KB de ${(totalBytes / (1024 * 1024)).toFixed(2)} MB esperados`)
      }

      updateTaskStatus(task.id, 'completed', undefined, 100)
      return // Success, exit loop
    } catch (err: any) {
      if (err.name === 'AbortError' && !String(controller.signal.reason).includes('estancado') && !String(err.message).includes('estancado')) {
        throw err
      }
      lastError = controller.signal.reason || err
      debugError(`[DownloadManager] HTTP Download failed for ${currentUri}: ${lastError?.message || err.message}`)
    }
  }

  // If all failed
  activeHttpDownloads.delete(task.id)
  updateTaskStatus(task.id, 'error', `Error: ${lastError?.message || 'Todos los enlaces fallaron'}`)
}

function updateTaskStatus(
  id: string,
  status: DownloadTask['status'],
  error?: string,
  progress?: number
): void {
  const task = tasks.find((t) => t.id === id)
  if (!task) return

  task.status = status
  if (error) task.error = error
  if (progress !== undefined) task.progress = progress
  if (status === 'completed' || status === 'error' || status === 'opened') {
    task.completedAt = new Date().toISOString()
  }

  persistTasks()
  pushProgress({ id, progress: task.progress, speed: task.speed, speedBytes: task.speedBytes, status, error, statusMessage: task.statusMessage || '', downloadedBytes: task.downloadedBytes, totalBytes: task.totalBytes })
  
  if (status === 'completed' || status === 'error' || status === 'opened' || status === 'queued') {
    processQueue()
  }
}

export function cancelDownload(id: string): void {
  const activeHttp = activeHttpDownloads.get(id)
  if (activeHttp) {
    activeHttp.controller.abort()
    activeHttpDownloads.delete(id)
  }

  const activeTorrent = activeTorrentDownloads.get(id)
  if (activeTorrent) {
    clearInterval(activeTorrent.interval)
    if (activeTorrent.torrent && !activeTorrent.torrent.destroyed) {
      activeTorrent.torrent.destroy()
    }
    activeTorrentDownloads.delete(id)
  }

  const activeQB = activeQBDownloads.get(id)
  if (activeQB) {
    clearInterval(activeQB.interval)
    qbRemoveTorrent(activeQB.hash).catch(() => {})
    activeQBDownloads.delete(id)
  }

  const task = tasks.find((t) => t.id === id)
  if (task && task.uri.startsWith('magnet:') && !activeTorrent && !activeQB && webTorrentClient) {
    destroyExistingTorrent(webTorrentClient, task.uri)
  }

  if (task && (task.status === 'downloading' || task.status === 'queued')) {
    task.status = 'paused'
    task.speed = 'Pausado'
    task.speedBytes = 0
    task.statusMessage = undefined
    task.error = undefined
    task.etaSeconds = 0
    task.peers = 0
    persistTasks()
    pushProgress({ 
      id, 
      progress: task.progress, 
      speed: 'Pausado', 
      speedBytes: 0, 
      status: 'paused',
      statusMessage: '',
      etaSeconds: 0,
      peers: 0
    })
    processQueue()
  }
}

export function removeDownload(id: string): void {
  cancelDownload(id)
  const idx = tasks.findIndex((t) => t.id === id)
  if (idx >= 0) {
    tasks.splice(idx, 1)
    persistTasks()
  }
}

export function retryDownload(id: string): void {
  const task = tasks.find((t) => t.id === id)
  if (!task) return

  task.status = 'queued'
  task.speed = 'Iniciando...'
  task.speedBytes = 0
  task.error = undefined
  task.statusMessage = undefined
  persistTasks()

  if (task.uri.startsWith('magnet:')) {
    const hash = parseInfoHash(task.uri)
    if (hash) qbStartTorrent(hash).catch(() => {})
  }

  pushProgress({ 
    id, 
    progress: task.progress, 
    speed: 'Iniciando...', 
    speedBytes: 0, 
    status: 'queued',
    statusMessage: '',
    etaSeconds: task.etaSeconds || 0,
    peers: task.peers || 0,
    downloadedBytes: task.downloadedBytes || 0,
    totalBytes: task.totalBytes || 0
  })

  processQueue()
}

export function clearCompleted(): void {
  tasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'opened')
  persistTasks()
}
