import React, { useCallback, useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { DownloadEntry } from '../../../../shared/types'
import { sfx } from '../../utils/audioManager'
import { searchGameByTitle, imageUrl, isConfigured } from './gameDetailCache'
import { GameMetadata } from './types'

interface GameDetailProps {
  entry: DownloadEntry
  sourceName: string
  onDownload: (entry: DownloadEntry) => void
  onBack: () => void
  isDownloading: boolean
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\[v?[\d.]+\]\s*$/, '')
    .replace(/\s*\[L\]\s*/, '')
    .replace(/\s*\[ENG(?:\s*\+\s*\w+)?\]\s*/, '')
    .replace(/\s*\[\w+\]\s*/g, '')
    .trim()
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

function getUriType(uri: string): { label: string; icon: string; color: string } {
  if (uri.startsWith('magnet:')) {
    return { label: 'Magnet', icon: 'mynaui:link', color: '#3a86ff' }
  }
  if (uri.endsWith('.torrent')) {
    return { label: 'Torrent', icon: 'mynaui:file', color: '#f5a623' }
  }
  if (uri.includes('drive.google.com')) {
    return { label: 'Google Drive', icon: 'logos:google-drive', color: '#34a853' }
  }
  if (uri.includes('mega.nz')) {
    return { label: 'MEGA', icon: 'mynaui:cloud', color: '#d9272e' }
  }
  if (uri.startsWith('http:') || uri.startsWith('https:')) {
    return { label: 'HTTP', icon: 'mynaui:globe', color: '#6fb1ff' }
  }
  return { label: 'Enlace', icon: 'mynaui:link', color: 'var(--text-muted)' }
}

export function GameDetail({
  entry,
  sourceName,
  onDownload,
  onBack,
  isDownloading
}: GameDetailProps): React.JSX.Element {
  const gameTitle = cleanTitle(entry.title)
  const version = entry.title.replace(gameTitle, '').trim()

  const [meta, setMeta] = useState<GameMetadata | null | 'loading' | 'nokey'>('loading')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setMeta('loading')
      const configured = await isConfigured()
      if (!configured) {
        if (!cancelled) setMeta('nokey')
        return
      }
      const result = await searchGameByTitle(entry.title)
      if (!cancelled) setMeta(result)
    })()
    return () => { cancelled = true }
  }, [entry.title])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        sfx.cancel()
        onBack()
      }
    },
    [onBack]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const bgUrl = meta && typeof meta === 'object' ? imageUrl(meta.backgroundImage) : undefined
  const coverUrl = meta && typeof meta === 'object' ? imageUrl(meta.coverImage) : undefined
  const screenshots = meta && typeof meta === 'object' ? meta.screenshots : []

  const { platforms, genres } = meta && typeof meta === 'object' ? meta : { platforms: [], genres: [] }
  const { developers, publishers } = meta && typeof meta === 'object' ? meta : { developers: [], publishers: [] }

  let releaseYear: number | null = null
  if (meta && typeof meta === 'object' && meta.releaseDate) {
    const y = new Date(meta.releaseDate).getFullYear()
    if (!isNaN(y)) releaseYear = y
  }

  return (
    <div className="dl-manager">
      <div className="dl-manager__header">
        <button className="dl-manager__back" onClick={() => { sfx.cancel(); onBack() }}>
          <Icon icon="mynaui:arrow-left" />
        </button>
        <h2 className="dl-manager__title" style={{ fontSize: '0.95rem' }}>
          {gameTitle}
        </h2>
      </div>

      <div className="dl-detail">
        {/* ── Hero ──────────────────────────────────────── */}
        <div
          className="dl-detail__hero"
          style={
            bgUrl
              ? {
                  backgroundImage: `linear-gradient(to right, rgba(13,16,24,0.92) 0%, rgba(13,16,24,0.6) 100%), url(${bgUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }
              : undefined
          }
        >
          {coverUrl ? (
            <img className="dl-detail__cover" src={coverUrl} alt={gameTitle} />
          ) : (
            <div className="dl-detail__hero-icon">
              <Icon icon="mynaui:package" />
            </div>
          )}
          <div className="dl-detail__hero-info">
            <h1 className="dl-detail__title">{gameTitle}</h1>
            {version && <span className="dl-detail__version">{version}</span>}
            <div className="dl-detail__meta">
              <span className="dl-detail__source">{sourceName}</span>
              <span className="dl-detail__separator">|</span>
              <span className="dl-detail__size">{entry.fileSize}</span>
              <span className="dl-detail__separator">|</span>
              <span className="dl-detail__date">{formatDate(entry.uploadDate)}</span>
            </div>

            {/* Tags */}
            {meta && typeof meta === 'object' && (
              <div className="dl-detail__tags">
                {meta.metacritic && (
                  <span className="dl-detail__tag dl-detail__tag--score">
                    <Icon icon="mynaui:star" /> {meta.metacritic}
                  </span>
                )}
                {meta.rating && meta.rating > 0 && (
                  <span className="dl-detail__tag dl-detail__tag--rating">
                    <Icon icon="mynaui:star" /> {meta.rating.toFixed(1)}
                  </span>
                )}
                {releaseYear && <span className="dl-detail__tag">{releaseYear}</span>}
                {platforms.slice(0, 4).map((p) => (
                  <span key={p} className="dl-detail__tag dl-detail__tag--plat">{p}</span>
                ))}
                {platforms.length > 4 && (
                  <span className="dl-detail__tag dl-detail__tag--plat">+{platforms.length - 4}</span>
                )}
              </div>
            )}

            {/* Genres */}
            {genres.length > 0 && (
              <div className="dl-detail__genres">
                {genres.map((g) => (
                  <span key={g} className="dl-detail__genre">{g}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Description ───────────────────────────────── */}
        {meta && typeof meta === 'object' && meta.description && (
          <div className="dl-detail__section">
            <h3 className="dl-detail__section-title">
              <Icon icon="mynaui:text" />
              Descripción
            </h3>
            <p className="dl-detail__description">{meta.description}</p>
          </div>
        )}

        {/* ── Download Links ────────────────────────────── */}
        <div className="dl-detail__section">
          <h3 className="dl-detail__section-title">
            <Icon icon="mynaui:link" />
            Enlaces de descarga
          </h3>
          <div className="dl-detail__links">
            {entry.uris.length === 0 ? (
              <div className="dl-detail__no-links">No hay enlaces disponibles</div>
            ) : (
              entry.uris.map((uri, idx) => {
                const uriType = getUriType(uri)
                const truncated =
                  uri.length > 80
                    ? uri.substring(0, 50) + '...' + uri.slice(-30)
                    : uri

                return (
                  <div key={idx} className="dl-detail__link-row">
                    <div className="dl-detail__link-badge" style={{ backgroundColor: uriType.color + '20', color: uriType.color }}>
                      <Icon icon={uriType.icon} />
                      <span>{uriType.label}</span>
                    </div>
                    <div className="dl-detail__link-uri" title={uri}>
                      {truncated}
                    </div>
                    <button
                      className="dl-detail__dl-btn"
                      disabled={isDownloading}
                      onClick={() => onDownload(entry)}
                    >
                      <Icon icon={isDownloading ? 'mynaui:clock' : 'mynaui:download'} />
                      {isDownloading ? 'En cola' : 'Descargar'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Info Card ─────────────────────────────────── */}
        <div className="dl-detail__section">
          <h3 className="dl-detail__section-title">
            <Icon icon="mynaui:info-circle" />
            Información
          </h3>
          <div className="dl-detail__info-card">
            <div className="dl-detail__info-row">
              <span className="dl-detail__info-label">Enlaces disponibles</span>
              <span className="dl-detail__info-value">{entry.uris.length}</span>
            </div>
            <div className="dl-detail__info-row">
              <span className="dl-detail__info-label">Tamaño</span>
              <span className="dl-detail__info-value">{entry.fileSize}</span>
            </div>
            <div className="dl-detail__info-row">
              <span className="dl-detail__info-label">Fecha de publicación</span>
              <span className="dl-detail__info-value">{formatDate(entry.uploadDate)}</span>
            </div>
            <div className="dl-detail__info-row">
              <span className="dl-detail__info-label">Fuente</span>
              <span className="dl-detail__info-value">{sourceName}</span>
            </div>
            {meta && typeof meta === 'object' && meta.releaseDate && (
              <div className="dl-detail__info-row">
                <span className="dl-detail__info-label">Lanzamiento original</span>
                <span className="dl-detail__info-value">{meta.releaseDate}</span>
              </div>
            )}
            {platforms.length > 0 && (
              <div className="dl-detail__info-row">
                <span className="dl-detail__info-label">Plataformas</span>
                <span className="dl-detail__info-value">{platforms.join(', ')}</span>
              </div>
            )}
            {developers.length > 0 && (
              <div className="dl-detail__info-row">
                <span className="dl-detail__info-label">Desarrollador</span>
                <span className="dl-detail__info-value">{developers.join(', ')}</span>
              </div>
            )}
            {publishers.length > 0 && (
              <div className="dl-detail__info-row">
                <span className="dl-detail__info-label">Publicador</span>
                <span className="dl-detail__info-value">{publishers.join(', ')}</span>
              </div>
            )}
            {meta && typeof meta === 'object' && meta.esrb && (
              <div className="dl-detail__info-row">
                <span className="dl-detail__info-label">Clasificación</span>
                <span className="dl-detail__info-value">{meta.esrb}</span>
              </div>
            )}
            {meta && typeof meta === 'object' && meta.website && (
              <div className="dl-detail__info-row">
                <span className="dl-detail__info-label">Sitio web</span>
                <span className="dl-detail__info-value dl-detail__info-value--link">{meta.website}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Image Gallery ─────────────────────────────── */}
        {screenshots.length > 0 && (
          <div className="dl-detail__section">
            <h3 className="dl-detail__section-title">
              <Icon icon="mynaui:image" />
              Capturas
            </h3>
            <div className="dl-detail__gallery-grid">
              {screenshots.map((url, i) => (
                <div key={i} className="dl-detail__gallery-item dl-detail__gallery-item--screenshot">
                  <img src={url} alt={`${gameTitle} screenshot ${i + 1}`} loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── States ────────────────────────────────────── */}
        {meta === 'loading' && (
          <div className="dl-detail__section">
            <div className="dl-detail__loading">
              <Icon icon="mynaui:spinner" className="ag-spin" />
              Cargando información del juego...
            </div>
          </div>
        )}

        {meta === 'nokey' && (
          <div className="dl-detail__section">
            <div className="dl-detail__no-links">
              <Icon icon="mynaui:alert-circle" style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }} />
              <p style={{ fontWeight: 600, marginBottom: 4 }}>API de RAWG no configurada</p>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Cambia a Steam (sin API key) en Ajustes → Interfaz, o configura tu key de RAWG
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
