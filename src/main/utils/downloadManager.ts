import { app, BrowserWindow } from 'electron'
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

function parseInfoHash(magnetUri: string): string | null {
  const match = magnetUri.match(/urn:btih:([a-fA-F0-9]{40})/)
  return match ? match[1].toLowerCase() : null
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
    if (res.ok) return parseInfoHash(magnet)
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
    tasks = saved
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
    { name: 'FitGirl', url: 'https://hydralinks.pages.dev/sources/fitgirl.json' }
  ]
}

export function getTasks(): DownloadTask[] {
  return tasks
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
    fileSize: entry.fileSize,
    status: 'queued',
    progress: 0,
    speed: '',
    addedAt: new Date().toISOString()
  }

  tasks.push(task)
  persistTasks()

  // Execute download async
  executeDownload(task).catch((err) => debugError(`[DownloadManager] Download failed: ${err}`))

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

        const progress = Math.round((info.progress || 0) * 100)
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

        const DownloadedBytes = info.downloaded || 0
        const totalBytes = info.total_size || 0
        const peers = info.num_leech || 0
        const state = info.state || ''

        const isCompleted = state === 'uploading' || state === 'stalledUP' ||
          (progress >= 100 && (state === 'pausedUP' || state === 'queuedUP' || state === 'checkingUP'))

        pushProgress({
          id: task.id,
          progress,
          speed: speedStr,
          status: isCompleted ? 'completed' : 'downloading',
          downloadedBytes: DownloadedBytes,
          totalBytes,
          peers: peers + (info.num_complete || 0),
          etaSeconds: info.eta || 0,
          statusMessage: task.statusMessage
        })
        task.progress = progress
        task.speed = speedStr
        task.downloadedBytes = DownloadedBytes
        task.totalBytes = totalBytes
        task.peers = peers
        task.etaSeconds = info.eta

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
      }, 2000)

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

        const progress = Math.round((torrent.progress || 0) * 100)
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
          status: 'downloading',
          downloadedBytes,
          totalBytes,
          peers,
          etaSeconds
        })
        task.progress = progress
        task.speed = speedStr
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

  try {
    const response = await fetch(task.uri, { signal: controller.signal })

    if (!response.ok || !response.body) {
      throw new Error(`HTTP ${response.status}`)
    }

    const contentLength = response.headers.get('content-length')
    const totalBytes = contentLength ? parseInt(contentLength, 10) : parseFileSize(task.fileSize)

    const downloadsDir = resolveDownloadDir()

    const safeName = task.title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100)
    const ext = path.extname(new URL(task.uri).pathname) || '.bin'
    const filePath = path.join(downloadsDir, `${safeName}${ext}`)

    const reader = response.body.getReader()
    const writer = fs.createWriteStream(filePath)
    let bytesReceived = 0

    const pump = async (): Promise<void> => {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        writer.write(Buffer.from(value))
        bytesReceived += value.length

        const elapsed = (Date.now() - startTime) / 1000
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

        const active = activeHttpDownloads.get(task.id)
        if (active) {
          active.bytesReceived = bytesReceived
        }

        pushProgress({
          id: task.id,
          progress,
          speed: speedStr,
          status: 'downloading',
          downloadedBytes: bytesReceived,
          totalBytes,
          etaSeconds
        })
        task.progress = progress
        task.speed = speedStr
        task.downloadedBytes = bytesReceived
        task.totalBytes = totalBytes
        task.etaSeconds = etaSeconds
      }
    }

    await pump()
    writer.end()

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })

    updateTaskStatus(task.id, 'completed', undefined, 100)
  } catch (err: any) {
    if (err.name === 'AbortError') {
      updateTaskStatus(task.id, 'queued', undefined, 0)
    } else {
      updateTaskStatus(task.id, 'error', String(err))
    }
  } finally {
    activeHttpDownloads.delete(task.id)
  }
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
  pushProgress({ id, progress: task.progress, speed: task.speed, status, error, statusMessage: task.statusMessage, downloadedBytes: task.downloadedBytes, totalBytes: task.totalBytes })
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
    task.status = 'queued'
    task.speed = 'Pausado'
    persistTasks()
    pushProgress({ id, progress: task.progress, speed: 'Pausado', status: 'queued' })
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
  task.progress = 0
  task.speed = ''
  task.error = undefined
  persistTasks()

  executeDownload(task).catch((err) => debugError(`[DownloadManager] Retry failed: ${err}`))
}

export function clearCompleted(): void {
  tasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'opened')
  persistTasks()
}
