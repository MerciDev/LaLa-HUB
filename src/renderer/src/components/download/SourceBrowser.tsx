import React, { useEffect, useCallback, useState, useRef } from 'react'
import { Icon } from '@iconify/react'
import { DownloadSource, DownloadEntry } from '../../../../shared/types'
import { sfx } from '../../utils/audioManager'
import { searchGameByTitle, imageUrl } from './gameDetailCache'

const PAGE_SIZE = 10

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

  const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({})
  const thumbnailsRef = useRef(thumbnails)
  thumbnailsRef.current = thumbnails

  useEffect(() => {
    const indices = new Set<number>()
    for (let d = -4; d <= 4; d++) {
      const i = focusIndex + d
      if (i >= 0 && i < pageEntries.length) indices.add(i)
    }
    for (const i of indices) {
      const entry = pageEntries[i]
      if (!entry || thumbnailsRef.current[entry.title] !== undefined) continue
      searchGameByTitle(entry.title).then((meta) => {
        const url = imageUrl(meta?.horizontalImage || meta?.coverImage || meta?.backgroundImage)
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
        if (focusIndex < pageEntries.length - 1) {
          sfx.navigate()
          onFocusChange(focusIndex + 1)
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (focusIndex > 0) {
          sfx.navigate()
          onFocusChange(focusIndex - 1)
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (page < totalPages - 1) {
          goNext()
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (page > 0) {
          goPrev()
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
    [focusIndex, pageEntries, page, totalPages, goNext, goPrev, onBack, onSelect, onFocusChange]
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

      <div className="dl-browser__grid-wrap" style={{ padding: '0' }}>
        {pageEntries.length === 0 ? (
          <div className="dl-empty">
            <Icon icon="mynaui:search" className="dl-empty__icon" style={{ fontSize: 40, marginBottom: 8 }} />
            <p>{searchQuery ? 'No se encontraron juegos con ese nombre' : 'No hay juegos disponibles en esta fuente'}</p>
          </div>
        ) : (
          <div
            className="dl-browser__list"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            {pageEntries.map((entry, cellIdx) => {
              const isDownloading = activeDownloads.has(entry.title)
              const isFocused = focusIndex === cellIdx
              const thumb = thumbnails[entry.title]

              return (
                <div
                  key={pageStart + cellIdx}
                  className={`dl-browser__list-item ${isFocused ? 'dl-browser__list-item--focused' : ''} ${isDownloading ? 'dl-browser__list-item--active' : ''}`}
                  data-focused={isFocused ? 'true' : undefined}
                  data-dl-idx={cellIdx}
                  onClick={() => {
                    onFocusChange(cellIdx)
                    sfx.confirm()
                    onSelect(entry)
                  }}
                  onMouseEnter={() => onFocusChange(cellIdx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 16px',
                    background: isFocused ? 'rgba(58, 134, 255, 0.1)' : cellIdx % 2 === 0 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                    borderLeft: `4px solid ${isFocused ? '#1a9fff' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div className="dl-browser__list-cover" style={{ width: 120, height: 56, position: 'relative', overflow: 'hidden', borderRadius: 4, background: '#16202d', flexShrink: 0 }}>
                    {thumb ? (
                      <img
                        className="dl-browser__list-img"
                        src={thumb}
                        alt={cleanTitle(entry.title)}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="dl-browser__list-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.1)' }}>
                        <Icon icon="mynaui:package" fontSize={24} />
                      </div>
                    )}
                    {isDownloading && (
                      <div className="dl-browser__list-badge" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a9fff' }}>
                        <Icon icon="mynaui:clock" fontSize={24} />
                      </div>
                    )}
                  </div>
                  
                  <div className="dl-browser__list-info" style={{ flex: 1, minWidth: 0, marginLeft: 20 }}>
                    <div className="dl-browser__list-title" style={{ fontSize: '15px', fontWeight: 600, color: isFocused ? '#ffffff' : '#abb6c4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cleanTitle(entry.title)}>
                      {cleanTitle(entry.title)}
                    </div>
                    <div className="dl-browser__list-meta" style={{ fontSize: '12px', color: '#67707b', marginTop: 4, fontWeight: 500 }}>
                      <span>TAMAÑO DE LA DESCARGA: <strong style={{ color: '#8b929a' }}>{entry.fileSize}</strong></span>
                    </div>
                  </div>

                  <button
                    className={`dl-browser__list-dl`}
                    onClick={(e) => {
                      e.stopPropagation()
                      sfx.confirm()
                      if (entry.uris && entry.uris.length > 1) {
                        onSelect(entry)
                      } else {
                        onDownload(entry)
                      }
                    }}
                    disabled={isDownloading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      height: 36,
                      padding: '0 16px',
                      background: isDownloading ? '#2a3648' : '#1a9fff',
                      color: isDownloading ? '#abb6c4' : '#ffffff',
                      border: isDownloading ? '1px solid rgba(255,255,255,0.1)' : 'none',
                      borderRadius: 4,
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: isDownloading ? 'default' : 'pointer',
                      opacity: isFocused || isDownloading ? 1 : 0.8,
                      transition: 'all 0.15s ease',
                      marginLeft: 16
                    }}
                  >
                    <Icon icon={isDownloading ? 'mynaui:clock' : entry.uris && entry.uris.length > 1 ? 'mynaui:list' : 'mynaui:download'} fontSize={18} />
                    {isDownloading ? 'AÑADIDO' : entry.uris && entry.uris.length > 1 ? 'ELEGIR ENLACE' : 'AÑADIR'}
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
