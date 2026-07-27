import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import {
  DownloadSource,
  DownloadEntry,
  DownloadTask,
  DownloadProgress
} from '../../../../shared/types'
import { SteamNetworkBanner } from './SteamNetworkBanner'
import { SteamDownloadRow } from './SteamDownloadRow'
import { ActiveDownloadItem } from './ActiveDownloadItem'
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
  const [view, setView] = useState<View>('tasks')
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
      setTasks((prev) => {
        const index = prev.findIndex((t) => t.id === progress.id)
        if (index === -1) {
          return prev
        }
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          progress: progress.progress,
          speed: progress.speed,
          speedBytes: progress.speedBytes ?? updated[index].speedBytes,
          status: progress.status,
          error: progress.error,
          statusMessage: progress.statusMessage ?? updated[index].statusMessage,
          downloadedBytes: progress.downloadedBytes ?? updated[index].downloadedBytes,
          totalBytes: progress.totalBytes ?? updated[index].totalBytes,
          peers: progress.peers ?? updated[index].peers,
          etaSeconds: progress.etaSeconds ?? updated[index].etaSeconds
        }
        if (
          progress.status === 'completed' ||
          progress.status === 'opened' ||
          progress.status === 'error'
        ) {
          const doneTask = updated[index]
          if (doneTask) {
            activeTitlesRef.current.delete(doneTask.title)
            setActiveTitles(new Set(activeTitlesRef.current))
          }
        }
        return updated
      })
    })
    return cleanup
  }, [visible])

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
      await loadTasks()
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
        setView('tasks')
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        sfx.navigate()
        setSourceFocus((prev) => Math.min(prev + 1, sources.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        sfx.navigate()
        setSourceFocus((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const src = sources[sourceFocus]
        if (src) openSource(src.url, src.name)
      }
    },
    [view, sources, sourceFocus]
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
        onClose()
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
    [view, tasks.length, onClose]
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
          <button
            className="dl-manager__back"
            onClick={() => {
              sfx.cancel()
              setView('tasks')
            }}
          >
            <Icon icon="mynaui:arrow-left" />
          </button>
          <h2 className="dl-manager__title">
            <Icon icon="mynaui:package" />
            Catálogo de Juegos
          </h2>
        </div>

        <div className="dl-sources">
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
            return (
              <div
                key={src.url}
                className={`dl-sources__item ${sourceFocus === idx ? 'dl-sources__item--focused' : ''}`}
                data-focused={sourceFocus === idx ? 'true' : undefined}
                data-src-idx={idx}
                onClick={() => openSource(src.url, src.name)}
                onMouseEnter={() => setSourceFocus(idx)}
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
    const downloadingTasks = tasks.filter((t) => t.status === 'downloading')
    const queuedOrPausedTasks = tasks.filter((t) => t.status === 'queued' || t.status === 'paused')
    const completedTasks = tasks.filter(
      (t) => t.status === 'completed' || t.status === 'opened' || t.status === 'error'
    )
    const hasAnyTasks = downloadingTasks.length > 0 || queuedOrPausedTasks.length > 0 || completedTasks.length > 0

    return (
      <div className="dl-manager" style={{ background: '#131822', color: '#abb6c4' }}>
        {/* Cabecera Superior estilo Steam */}
        <div className="dl-manager__header" style={{ background: '#16202d', borderBottom: '1px solid #233142', padding: '16px 32px' }}>
          <h2 className="dl-manager__title" style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, letterSpacing: '0.3px' }}>
            <Icon icon="mynaui:download" style={{ color: '#1a9fff', fontSize: 24 }} />
            DESCARGAS
          </h2>
          <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto', alignItems: 'center' }}>
            <button
              className="cp-btn cp-btn--primary"
              style={{ width: 'auto', padding: '0 18px', height: '34px', background: '#1a9fff', color: '#fff', borderRadius: 4, fontWeight: 700 }}
              onClick={() => {
                sfx.confirm()
                setView('sources')
                setSourceFocus(0)
              }}
            >
              <Icon icon="mynaui:search" fontSize={18} />
              AÑADIR DESCARGA
            </button>
            <button
              className="dl-manager__close"
              style={{ width: 34, height: 34, borderRadius: 4, background: '#2a3648', color: '#abb6c4' }}
              onClick={() => {
                sfx.cancel()
                onClose()
              }}
            >
              <Icon icon="mynaui:x" fontSize={20} />
            </button>
          </div>
        </div>

        {/* Panel Superior Global del Osciloscopio y Velocidad (Exactamente como Steam) */}
        {/* We no longer render SteamNetworkBanner, we render the first active download as ActiveDownloadItem */}

        {/* Lista de Tarjetas de Descarga (Estilo Steam) */}
        <div className="dl-list" style={{ padding: '24px 36px', background: '#131822', maxWidth: '1500px', margin: '0 auto', width: '100%' }}>
          {!hasAnyTasks ? (
            <div className="dl-empty" style={{ background: '#1a2331', borderRadius: 6, padding: '60px 20px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <Icon icon="mynaui:download" className="dl-empty__icon" style={{ opacity: 0.2, fontSize: 64, color: '#1a9fff' }} />
              <p style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, marginTop: 16 }}>No hay descargas activas ni en cola</p>
              <span style={{ color: '#67707b', fontSize: 13 }}>Explora el catálogo para comenzar a descargar juegos</span>
              <button
                className="cp-btn cp-btn--primary"
                style={{ width: 'auto', marginTop: '24px', background: '#1a9fff', borderRadius: 4, padding: '10px 24px', fontWeight: 700 }}
                onClick={() => {
                  sfx.confirm()
                  setView('sources')
                  setSourceFocus(0)
                }}
              >
                <Icon icon="mynaui:search" fontSize={18} />
                Explorar Catálogo
              </button>
            </div>
          ) : (
            <>
              {/* SECCIÓN 1: DESCARGANDO PRINCIPAL */}
              {downloadingTasks.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <ActiveDownloadItem
                    task={downloadingTasks[0]}
                    focused={taskFocus === 0}
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
                </div>
              )}

              {/* SECCIÓN 2: OTRAS DESCARGAS ACTIVAS */}
              {downloadingTasks.length > 1 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#1a9fff', borderBottom: '1px solid #233142', paddingBottom: 8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, background: '#1a9fff', borderRadius: '50%' }} />
                    OTRAS DESCARGAS ACTIVAS ({downloadingTasks.length - 1})
                  </div>
                  {downloadingTasks.slice(1).map((task, idx) => (
                    <SteamDownloadRow
                      key={task.id}
                      task={task}
                      focused={taskFocus === idx + 1}
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
                </div>
              )}

              {/* SECCIÓN 3: EN COLA Y PAUSADAS */}
              {queuedOrPausedTasks.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8b929a', borderBottom: '1px solid #233142', paddingBottom: 8, marginBottom: 12 }}>
                    EN COLA Y PAUSADAS ({queuedOrPausedTasks.length})
                  </div>
                  {queuedOrPausedTasks.map((task, idx) => (
                    <SteamDownloadRow
                      key={task.id}
                      task={task}
                      focused={taskFocus === downloadingTasks.length + idx}
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
                </div>
              )}

              {/* SECCIÓN 3: COMPLETADAS */}
              {completedTasks.length > 0 && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: '#5ccb5f',
                      borderBottom: '1px solid #233142',
                      paddingBottom: 8,
                      marginBottom: 12,
                      marginTop: downloadingTasks.length > 0 || queuedOrPausedTasks.length > 0 ? 32 : 0
                    }}
                  >
                    <span>COMPLETADAS / HISTORIAL ({completedTasks.length})</span>
                    <button
                      style={{
                        background: '#2a3648',
                        color: '#abb6c4',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 4,
                        padding: '4px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s'
                      }}
                      onClick={async () => {
                        await window.api.downloads.clearCompleted()
                        loadTasks()
                        sfx.confirm()
                      }}
                    >
                      <Icon icon="mynaui:trash" fontSize={14} />
                      LIMPIAR TODO
                    </button>
                  </div>
                  {completedTasks.map((task, idx) => (
                    <SteamDownloadRow
                      key={task.id}
                      task={task}
                      focused={taskFocus === downloadingTasks.length + queuedOrPausedTasks.length + idx}
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
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ─── Detail view ────────────────────────────────────────

  if (view === 'detail' && currentEntry && currentSource) {
    const activeTask = tasks.find((t) => t.title === currentEntry.title)
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
        activeTask={activeTask}
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
