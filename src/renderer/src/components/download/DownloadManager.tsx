import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import {
  DownloadSource,
  DownloadEntry,
  DownloadTask,
  DownloadProgress
} from '../../../../shared/types'
import { DownloadItem } from './DownloadItem'
import { SourceBrowser } from './SourceBrowser'
import { GameDetail } from './GameDetail'
import { sfx } from '../../utils/audioManager'

type View = 'sources' | 'browser' | 'tasks' | 'detail'

interface SourceConfig {
  name: string
  url: string
}

interface DownloadManagerProps {
  visible?: boolean
  onClose: () => void
}

export function DownloadManager({ visible, onClose }: DownloadManagerProps): React.JSX.Element {
  const [view, setView] = useState<View>('sources')
  const [sources, setSources] = useState<SourceConfig[]>([])
  const [currentSource, setCurrentSource] = useState<DownloadSource | null>(null)
  const [currentEntry, setCurrentEntry] = useState<DownloadEntry | null>(null)
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [tasks, setTasks] = useState<DownloadTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceFocus, setSourceFocus] = useState(0)
  const [browserFocus, setBrowserFocus] = useState(0)
  const [taskFocus, setTaskFocus] = useState(0)

  const activeTitlesRef = useRef(new Set<string>())
  const [activeTitles, setActiveTitles] = useState(new Set<string>())

  const loadTasks = useCallback(async () => {
    const loaded = await window.api.downloads.getTasks()
    setTasks(loaded)
    activeTitlesRef.current = new Set(
      loaded.filter((t) => t.status === 'queued' || t.status === 'downloading').map((t) => t.title)
    )
    setActiveTitles(new Set(activeTitlesRef.current))
  }, [])

    useEffect(() => {
        if (!visible) return
        window.api.downloads.getSourcesConfig().then(setSources)
        loadTasks()
    }, [visible, loadTasks])

  useEffect(() => {
    if (!visible) return
    const cleanup = window.api.downloads.onProgress((progress: DownloadProgress) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === progress.id
            ? {
                ...t,
                progress: progress.progress,
                speed: progress.speed,
                status: progress.status,
                error: progress.error
              }
            : t
        )
      )
      if (
        progress.status === 'completed' ||
        progress.status === 'opened' ||
        progress.status === 'error'
      ) {
        activeTitlesRef.current.delete(tasks.find((t) => t.id === progress.id)?.title || '')
        setActiveTitles(new Set(activeTitlesRef.current))
      }
    })
    return cleanup
  }, [visible, tasks])

  const openSource = async (url: string, _name: string) => {
    setLoading(true)
    setError(null)
    setCurrentUrl(url)
    try {
      const result = await window.api.downloads.fetchSource(url)
      if (result.success && result.data) {
        setCurrentSource(result.data)
        setView('browser')
        setBrowserFocus(0)
      } else {
        setError(result.error || 'Error al cargar la fuente')
        sfx.error()
      }
    } catch (err) {
      setError(String(err))
      sfx.error()
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (entry: DownloadEntry) => {
    setCurrentEntry(entry)
    setView('detail')
  }

  const handleDownload = async (entry: DownloadEntry) => {
    if (activeTitlesRef.current.has(entry.title)) return

    const result = await window.api.downloads.start(entry, currentSource?.name || currentUrl)
    if (result.success && result.task) {
      activeTitlesRef.current.add(entry.title)
      setActiveTitles(new Set(activeTitlesRef.current))
      setTasks((prev) => [...prev, result.task!])
      sfx.confirm()
    } else {
      sfx.error()
    }
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (view !== 'sources') return

      if (e.key === 'Escape' || e.key === 'Backspace') {
        sfx.cancel()
        onClose()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        sfx.navigate()
        setSourceFocus((prev) => Math.min(prev + 1, sources.length + 1)) // +1 for "Downloads" tab
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        sfx.navigate()
        setSourceFocus((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (sourceFocus === 0) {
          setView('tasks')
          setTaskFocus(0)
        } else {
          const src = sources[sourceFocus - 1]
          if (src) openSource(src.url, src.name)
        }
      }
    },
    [view, sources, sourceFocus, onClose]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (view === 'sources') {
      const el = document.querySelector(`[data-src-idx="${sourceFocus}"]`)
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [sourceFocus, view])

  const handleTaskKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (view !== 'tasks') return

      if (e.key === 'Escape' || e.key === 'Backspace') {
        sfx.cancel()
        setView('sources')
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        sfx.navigate()
        setTaskFocus((prev) => Math.min(prev + 1, tasks.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        sfx.navigate()
        setTaskFocus((prev) => Math.max(prev - 1, 0))
      }
    },
    [view, tasks.length]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleTaskKeyDown)
    return () => window.removeEventListener('keydown', handleTaskKeyDown)
  }, [handleTaskKeyDown])

  // ─── Sources view ──────────────────────────────────────

  if (view === 'sources') {
    return (
      <div className="dl-manager">
        <div className="dl-manager__header">
          <h2 className="dl-manager__title">
            <Icon icon="mynaui:download" />
            Descargas
          </h2>
          <button
            className="dl-manager__close"
            onClick={() => {
              sfx.cancel()
              onClose()
            }}
          >
            <Icon icon="mynaui:x" />
          </button>
        </div>

        <div className="dl-sources">
          <div
            className={`dl-sources__item ${sourceFocus === 0 ? 'dl-sources__item--focused' : ''}`}
            data-focused={sourceFocus === 0 ? 'true' : undefined}
            data-src-idx={0}
            onClick={() => {
              setSourceFocus(0)
              setView('tasks')
              setTaskFocus(0)
            }}
            onMouseEnter={() => setSourceFocus(0)}
          >
            <div className="dl-sources__item-icon" style={{ color: 'var(--accent)' }}>
              <Icon icon="mynaui:list" />
            </div>
            <div className="dl-sources__item-info">
              <div className="dl-sources__item-name">Descargas activas</div>
              <div className="dl-sources__item-desc">
                {tasks.filter((t) => t.status === 'downloading' || t.status === 'queued').length} en
                progreso
              </div>
            </div>
            <Icon icon="mynaui:chevron-right" className="dl-sources__item-arrow" />
          </div>

          <div className="dl-sources__divider">
            <span>Fuentes</span>
          </div>

          {loading && (
            <div className="dl-sources__loading">
              <Icon icon="mynaui:spinner" className="ag-spin" />
              Cargando fuentes...
            </div>
          )}

          {error && (
            <div className="dl-sources__error">
              <Icon icon="mynaui:alert-circle" />
              {error}
            </div>
          )}

          {sources.map((src, idx) => {
            const itemIdx = idx + 1
            return (
              <div
                key={src.url}
                className={`dl-sources__item ${sourceFocus === itemIdx ? 'dl-sources__item--focused' : ''}`}
                data-focused={sourceFocus === itemIdx ? 'true' : undefined}
                data-src-idx={itemIdx}
                onClick={() => openSource(src.url, src.name)}
                onMouseEnter={() => setSourceFocus(itemIdx)}
              >
                <div className="dl-sources__item-icon">
                  <Icon icon="mynaui:package" />
                </div>
                <div className="dl-sources__item-info">
                  <div className="dl-sources__item-name">{src.name}</div>
                  <div className="dl-sources__item-desc">Hydra Links</div>
                </div>
                <Icon icon="mynaui:chevron-right" className="dl-sources__item-arrow" />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Tasks view ────────────────────────────────────────

  if (view === 'tasks') {
    const activeTasks = tasks.filter((t) => t.status === 'downloading' || t.status === 'queued')
    const completedTasks = tasks.filter(
      (t) => t.status === 'completed' || t.status === 'opened' || t.status === 'error'
    )

    return (
      <div className="dl-manager">
        <div className="dl-manager__header">
          <button
            className="dl-manager__back"
            onClick={() => {
              sfx.cancel()
              setView('sources')
            }}
          >
            <Icon icon="mynaui:arrow-left" />
          </button>
          <h2 className="dl-manager__title">Descargas activas</h2>
          {completedTasks.length > 0 && (
            <button
              className="dl-manager__clear-btn"
              onClick={async () => {
                await window.api.downloads.clearCompleted()
                loadTasks()
                sfx.confirm()
              }}
            >
              <Icon icon="mynaui:trash" />
              Limpiar
            </button>
          )}
        </div>

        <div className="dl-list">
          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="dl-empty">
              <Icon icon="mynaui:inbox" className="dl-empty__icon" />
              <p>No hay descargas aún</p>
              <span>Explora las fuentes para añadir descargas</span>
            </div>
          ) : (
            <>
              {activeTasks.map((task, idx) => (
                <DownloadItem
                  key={task.id}
                  task={task}
                  focused={taskFocus === idx}
                  onCancel={async (id) => {
                    await window.api.downloads.cancel(id)
                    loadTasks()
                  }}
                  onRemove={async (id) => {
                    await window.api.downloads.remove(id)
                    loadTasks()
                  }}
                  onRetry={async (id) => {
                    await window.api.downloads.retry(id)
                    loadTasks()
                  }}
                />
              ))}
              {activeTasks.length > 0 && completedTasks.length > 0 && (
                <div className="dl-list__divider">Completadas</div>
              )}
              {completedTasks.map((task, idx) => (
                <DownloadItem
                  key={task.id}
                  task={task}
                  focused={taskFocus === activeTasks.length + idx}
                  onCancel={async (id) => {
                    await window.api.downloads.cancel(id)
                    loadTasks()
                  }}
                  onRemove={async (id) => {
                    await window.api.downloads.remove(id)
                    loadTasks()
                  }}
                  onRetry={async (id) => {
                    await window.api.downloads.retry(id)
                    loadTasks()
                  }}
                />
              ))}
            </>
          )}
        </div>
      </div>
    )
  }

  // ─── Detail view ────────────────────────────────────────

  if (view === 'detail' && currentEntry && currentSource) {
    return (
      <GameDetail
        entry={currentEntry}
        sourceName={currentSource?.name || currentUrl}
        onDownload={handleDownload}
        onBack={() => {
          setView('browser')
          setCurrentEntry(null)
        }}
        isDownloading={activeTitles.has(currentEntry.title)}
      />
    )
  }

  // ─── Browser view ──────────────────────────────────────

  if (view === 'browser' && currentSource) {
    return (
      <div className="dl-manager">
        <SourceBrowser
          source={currentSource}
          onDownload={handleDownload}
          onSelect={handleSelect}
          onBack={() => {
            setView('sources')
            setCurrentSource(null)
          }}
          activeDownloads={activeTitles}
          focusIndex={browserFocus}
          onFocusChange={setBrowserFocus}
        />
      </div>
    )
  }

  return (
    <div className="dl-manager">
      <div className="dl-empty">
        <Icon icon="mynaui:download" className="dl-empty__icon" />
        <p>Cargando...</p>
      </div>
    </div>
  )
}
