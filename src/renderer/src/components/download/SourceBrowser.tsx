import React, { useEffect, useCallback, useState, useRef } from 'react'
import { Icon } from '@iconify/react'
import { DownloadSource, DownloadEntry } from '../../../../shared/types'
import { sfx } from '../../utils/audioManager'
import { searchGameByTitle, imageUrl } from './gameDetailCache'

const PAGE_SIZE = 25

interface SourceBrowserProps {
  source: DownloadSource
  onDownload: (entry: DownloadEntry) => void
  onSelect: (entry: DownloadEntry) => void
  onBack: () => void
  activeDownloads: Set<string>
  focusIndex: number
  onFocusChange: (index: number) => void
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

export function SourceBrowser({
  source,
  onDownload,
  onSelect,
  onBack,
  activeDownloads,
  focusIndex,
  onFocusChange
}: SourceBrowserProps): React.JSX.Element {
  const entries = source.downloads
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const [page, setPage] = useState(0)

  // Reset page when source changes
  useEffect(() => {
    setPage(0)
    onFocusChange(0)
  }, [source.name, source.downloads.length, onFocusChange])

  const pageStart = page * PAGE_SIZE
  const pageEntries = entries.slice(pageStart, pageStart + PAGE_SIZE)
  const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({})
  const thumbnailsRef = useRef(thumbnails)
  thumbnailsRef.current = thumbnails

  // Fetch thumbnails for focused + nearby entries
  useEffect(() => {
    const indices = new Set<number>()
    for (let d = -2; d <= 2; d++) {
      const i = focusIndex + d
      if (i >= 0 && i < pageEntries.length) indices.add(i)
    }
    for (const i of indices) {
      const entry = pageEntries[i]
      if (!entry || thumbnailsRef.current[entry.title] !== undefined) continue
      searchGameByTitle(entry.title).then((meta) => {
        const url = imageUrl(meta?.coverImage || meta?.backgroundImage)
        if (url !== thumbnailsRef.current[entry.title]) {
          setThumbnails((prev) => ({ ...prev, [entry.title]: url ?? null }))
        }
      })
    }
  }, [focusIndex, pageEntries])

  const goNext = useCallback(() => {
    if (page < totalPages - 1) {
      sfx.navigate()
      setPage((p) => p + 1)
      onFocusChange(0)
    }
  }, [page, totalPages, onFocusChange])

  const goPrev = useCallback(() => {
    if (page > 0) {
      sfx.navigate()
      setPage((p) => p - 1)
      onFocusChange(0)
    }
  }, [page, onFocusChange])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        sfx.cancel()
        onBack()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        sfx.navigate()
        onFocusChange(Math.min(focusIndex + 1, pageEntries.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        sfx.navigate()
        onFocusChange(Math.max(focusIndex - 1, 0))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const entry = pageEntries[focusIndex]
        if (entry) {
          sfx.confirm()
          onSelect(entry)
        }
      }
    },
    [focusIndex, pageEntries, goNext, goPrev, onBack, onSelect, onFocusChange]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    const el = document.querySelector(`[data-dl-idx="${focusIndex}"]`)
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [focusIndex])

  return (
    <div className="dl-browser">
      <div className="dl-browser__header">
        <button
          className="dl-browser__back"
          onClick={() => {
            sfx.cancel()
            onBack()
          }}
        >
          <Icon icon="mynaui:arrow-left" />
          <span>{source.name}</span>
        </button>
        <span className="dl-browser__count">{entries.length} juegos</span>
      </div>

      <div className="dl-browser__list">
        {pageEntries.length === 0 ? (
          <div className="dl-empty">
            <Icon icon="mynaui:package" className="dl-empty__icon" />
            <p>No hay juegos disponibles en esta fuente</p>
          </div>
        ) : (
          pageEntries.map((entry, idx) => {
            const isDownloading = activeDownloads.has(entry.title)
            return (
              <div
                key={pageStart + idx}
                className={`dl-browser__entry ${focusIndex === idx ? 'dl-browser__entry--focused' : ''} ${isDownloading ? 'dl-browser__entry--active' : ''}`}
                data-focused={focusIndex === idx ? 'true' : undefined}
                data-dl-idx={idx}
                onClick={() => {
                  onFocusChange(idx)
                  sfx.confirm()
                  onSelect(entry)
                }}
                onMouseEnter={() => onFocusChange(idx)}
              >
                <div className="dl-browser__entry-icon">
                  {thumbnails[entry.title] ? (
                    <img
                      className="dl-browser__entry-thumb"
                      src={thumbnails[entry.title]!}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <Icon icon={isDownloading ? 'mynaui:download' : 'mynaui:package'} />
                  )}
                </div>
                <div className="dl-browser__entry-info">
                  <div className="dl-browser__entry-title">{entry.title}</div>
                  <div className="dl-browser__entry-meta">
                    <span>{entry.fileSize}</span>
                    <span>{formatDate(entry.uploadDate)}</span>
                  </div>
                </div>
                <button
                  className={`dl-browser__dl-btn ${focusIndex === idx ? 'dl-browser__dl-btn--focused' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    sfx.confirm()
                    onDownload(entry)
                  }}
                  disabled={isDownloading}
                >
                  <Icon icon={isDownloading ? 'mynaui:clock' : 'mynaui:download'} />
                  {isDownloading ? 'En cola' : 'Descargar'}
                </button>
              </div>
            )
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="dl-browser__pagination">
          <button
            className="dl-browser__page-btn"
            disabled={page === 0}
            onClick={() => { sfx.navigate(); goPrev() }}
          >
            <Icon icon="mynaui:chevron-left" />
          </button>

          <div className="dl-browser__page-info">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i
              } else if (page < 4) {
                pageNum = i
              } else if (page > totalPages - 5) {
                pageNum = totalPages - 7 + i
              } else {
                pageNum = page - 3 + i
              }
              return (
                <button
                  key={pageNum}
                  className={`dl-browser__page-dot ${page === pageNum ? 'dl-browser__page-dot--active' : ''}`}
                  onClick={() => { sfx.navigate(); setPage(pageNum); onFocusChange(0) }}
                >
                  {pageNum + 1}
                </button>
              )
            })}
          </div>

          <button
            className="dl-browser__page-btn"
            disabled={page >= totalPages - 1}
            onClick={() => { sfx.navigate(); goNext() }}
          >
            <Icon icon="mynaui:chevron-right" />
          </button>

          <span className="dl-browser__page-label">
            {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, entries.length)} / {entries.length}
          </span>
        </div>
      )}
    </div>
  )
}
