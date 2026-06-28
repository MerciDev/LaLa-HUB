import React, { useEffect, useCallback, useState, useRef } from 'react'
import { Icon } from '@iconify/react'
import { DownloadSource, DownloadEntry } from '../../../../shared/types'
import { sfx } from '../../utils/audioManager'
import { searchGameByTitle, imageUrl } from './gameDetailCache'

const PAGE_SIZE = 30

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

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\[v?[\d.]+\]\s*$/, '')
    .replace(/\s*\[L\]\s*/, '')
    .replace(/\s*\[ENG(?:\s*\+\s*\w+)?\]\s*/, '')
    .replace(/\s*\[\w+\]\s*/g, '')
    .trim()
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
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filtered = searchQuery
    ? source.downloads.filter(e => cleanTitle(e.title).toLowerCase().includes(searchQuery.toLowerCase()))
    : source.downloads
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
    onFocusChange(0)
  }, [source.name, source.downloads.length, searchQuery, onFocusChange])

  const pageStart = page * PAGE_SIZE
  const pageEntries = filtered.slice(pageStart, pageStart + PAGE_SIZE)
  const COLS = 5
  const ROWS = Math.ceil(pageEntries.length / COLS)
  const totalCells = ROWS * COLS

  const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({})
  const thumbnailsRef = useRef(thumbnails)
  thumbnailsRef.current = thumbnails

  useEffect(() => {
    const indices = new Set<number>()
    for (let d = -6; d <= 6; d++) {
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
        const next = Math.min(focusIndex + COLS, pageEntries.length - 1)
        onFocusChange(next)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        sfx.navigate()
        const prev = Math.max(focusIndex - COLS, 0)
        onFocusChange(prev)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (focusIndex < pageEntries.length - 1) {
          sfx.navigate()
          onFocusChange(focusIndex + 1)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (focusIndex > 0) {
          sfx.navigate()
          onFocusChange(focusIndex - 1)
        }
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
        <button className="dl-browser__back" onClick={() => { sfx.cancel(); onBack() }}>
          <Icon icon="mynaui:arrow-left" />
          <span>{source.name}</span>
        </button>
        <div className="dl-browser__search">
          <Icon icon="mynaui:search" className="dl-browser__search-icon" />
          <input
            ref={searchInputRef}
            className="dl-browser__search-input"
            type="text"
            placeholder="Buscar juegos..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(0); onFocusChange(0) }}
            onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); searchInputRef.current?.blur() } }}
          />
          {searchQuery && (
            <button className="dl-browser__search-clear" onClick={() => { setSearchQuery(''); setPage(0); onFocusChange(0); searchInputRef.current?.focus() }}>
              <Icon icon="mynaui:x" />
            </button>
          )}
        </div>
        <div className="dl-browser__header-right">
          <span className="dl-browser__count">{filtered.length} juegos</span>
          {totalPages > 1 && (
            <div className="dl-browser__header-pages">
              <button className="dl-browser__page-btn" disabled={page === 0} onClick={() => { sfx.navigate(); goPrev() }}>
                <Icon icon="mynaui:chevron-left" />
              </button>
              <span className="dl-browser__page-label">{page + 1} / {totalPages}</span>
              <button className="dl-browser__page-btn" disabled={page >= totalPages - 1} onClick={() => { sfx.navigate(); goNext() }}>
                <Icon icon="mynaui:chevron-right" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="dl-browser__grid-wrap">
        {pageEntries.length === 0 ? (
          <div className="dl-empty">
            <Icon icon="mynaui:search" className="dl-empty__icon" style={{ fontSize: 40, marginBottom: 8 }} />
            <p>{searchQuery ? 'No se encontraron juegos con ese nombre' : 'No hay juegos disponibles en esta fuente'}</p>
          </div>
        ) : (
          <div
            className="dl-browser__grid"
            style={{
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gridTemplateRows: `repeat(${ROWS}, auto)`
            }}
          >
            {Array.from({ length: totalCells }, (_, cellIdx) => {
              const entry = pageEntries[cellIdx]
              if (!entry) {
                return <div key={`empty-${cellIdx}`} className="dl-browser__grid-cell dl-browser__grid-cell--empty" />
              }

              const isDownloading = activeDownloads.has(entry.title)
              const isFocused = focusIndex === cellIdx
              const thumb = thumbnails[entry.title]

              return (
                <div
                  key={pageStart + cellIdx}
                  className={`dl-browser__grid-cell ${isFocused ? 'dl-browser__grid-cell--focused' : ''} ${isDownloading ? 'dl-browser__grid-cell--active' : ''}`}
                  data-focused={isFocused ? 'true' : undefined}
                  data-dl-idx={cellIdx}
                  onClick={() => {
                    onFocusChange(cellIdx)
                    sfx.confirm()
                    onSelect(entry)
                  }}
                  onMouseEnter={() => onFocusChange(cellIdx)}
                >
                  <div className="dl-browser__grid-cover">
                    {thumb ? (
                      <img
                        className="dl-browser__grid-img"
                        src={thumb}
                        alt={cleanTitle(entry.title)}
                        loading="lazy"
                      />
                    ) : (
                      <div className="dl-browser__grid-placeholder">
                        <Icon icon="mynaui:package" />
                      </div>
                    )}
                    {isDownloading && (
                      <div className="dl-browser__grid-badge">
                        <Icon icon="mynaui:clock" />
                      </div>
                    )}
                  </div>
                  <div className="dl-browser__grid-info">
                    <div className="dl-browser__grid-title" title={cleanTitle(entry.title)}>
                      {cleanTitle(entry.title)}
                    </div>
                    <div className="dl-browser__grid-meta">
                      <span>{entry.fileSize}</span>
                    </div>
                  </div>
                  <button
                    className={`dl-browser__grid-dl ${isFocused ? 'dl-browser__grid-dl--visible' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      sfx.confirm()
                      onDownload(entry)
                    }}
                    disabled={isDownloading}
                  >
                    <Icon icon={isDownloading ? 'mynaui:clock' : 'mynaui:download'} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="dl-browser__footer">
        <span className="dl-browser__footer-info">
          {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} de {filtered.length}
        </span>
        <div className="dl-browser__footer-dots">
          {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 9) {
              pageNum = i
            } else if (page < 4) {
              pageNum = i
            } else if (page > totalPages - 6) {
              pageNum = totalPages - 9 + i
            } else {
              pageNum = page - 4 + i
            }
            return (
              <button
                key={pageNum}
                className={`dl-browser__dot ${page === pageNum ? 'dl-browser__dot--active' : ''}`}
                onClick={() => { sfx.navigate(); setPage(pageNum); onFocusChange(0) }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
