import { app, shell, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { DownloadEntry, DownloadSource, DownloadTask, DownloadProgress } from '../../shared/types'
import { saveJson, readJson, ensureDirectory } from './storage'
import { debugLog, debugError } from './debug'

const DOWNLOADS_FILE = 'downloads'
const DOWNLOADS_FOLDER = 'data'
const SOURCES_CACHE_FOLDER = 'cache'
const SOURCES_CACHE_FILE = 'sources-cache'

export const DOWNLOAD_DIR = app.getPath('downloads')

export interface SourceCache {
  url: string
  data: DownloadSource
  fetchedAt: string
}

let activeHttpDownloads = new Map<
  string,
  { controller: AbortController; bytesReceived: number; totalBytes: number; startTime: number }
>()
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

async function handleMagnet(task: DownloadTask): Promise<void> {
  updateTaskStatus(task.id, 'downloading', undefined, 50)
  try {
    await shell.openExternal(task.uri)
    updateTaskStatus(task.id, 'opened', undefined, 100)
  } catch (err) {
    updateTaskStatus(task.id, 'error', `Failed to open magnet: ${err}`)
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
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0

    const downloadsDir = path.join(DOWNLOAD_DIR, 'LaLa-HUB')
    ensureDirectory(downloadsDir)

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

        const active = activeHttpDownloads.get(task.id)
        if (active) {
          active.bytesReceived = bytesReceived
        }

        pushProgress({ id: task.id, progress, speed: speedStr, status: 'downloading' })
        task.progress = progress
        task.speed = speedStr
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
  pushProgress({ id, progress: task.progress, speed: task.speed, status, error })
}

export function cancelDownload(id: string): void {
  const active = activeHttpDownloads.get(id)
  if (active) {
    active.controller.abort()
    activeHttpDownloads.delete(id)
  }

  const task = tasks.find((t) => t.id === id)
  if (task && (task.status === 'downloading' || task.status === 'queued')) {
    task.status = 'queued'
    task.progress = 0
    task.speed = ''
    persistTasks()
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
