import React, { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { DownloadTask } from '../../../../shared/types'
import { searchGameByTitle, imageUrl } from './gameDetailCache'

interface SteamDownloadRowProps {
  task: DownloadTask
  onCancel: (id: string) => void
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  focused?: boolean
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatEta(seconds?: number): string {
  if (!seconds || seconds <= 0 || seconds >= 8640000 || seconds > 86400 * 7) return 'Calculando...'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 60) {
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
  }
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function SteamDownloadRow({
  task,
  onCancel,
  onRemove,
  onRetry,
  focused
}: SteamDownloadRowProps): React.JSX.Element {
  const [metadata, setMetadata] = useState<{ banner?: string } | null>(null)

  useEffect(() => {
    let active = true
    searchGameByTitle(task.title).then((meta) => {
      if (active && meta) {
        // En Steam se prefiere la imagen horizontal (banner/background) para las filas de 16:9
        setMetadata({
          banner: imageUrl(meta.backgroundImage) || imageUrl(meta.coverImage)
        })
      }
    })
    return () => {
      active = false
    }
  }, [task.title])

  const isDownloading = task.status === 'downloading'
  const isQueued = task.status === 'queued'
  const isPaused = task.status === 'paused'
  const isCompleted = task.status === 'completed' || task.status === 'opened'
  const isError = task.status === 'error'

  const statusText = isDownloading
    ? 'DESCARGANDO'
    : isPaused
    ? 'PAUSADO'
    : isQueued
    ? 'EN COLA'
    : isCompleted
    ? 'COMPLETADA'
    : isError
    ? 'ERROR DE DESCARGA'
    : task.status.toUpperCase()

  const statusColor = isDownloading
    ? '#1a9fff'
    : isCompleted
    ? '#5ccb5f'
    : isError
    ? '#ff5c5c'
    : '#8b929a'

  return (
    <div
      className={`steam-row ${focused ? 'steam-row--focused' : ''}`}
      data-focused={focused ? 'true' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        background: focused ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
        padding: '12px 16px',
        borderRadius: 4,
        marginBottom: 8,
        transition: 'background 0.2s',
        opacity: isCompleted ? 0.7 : 1,
        width: '100%'
      }}
    >
      {/* Banner del Juego (Cápsula horizontal 16:9, estilo Steam) */}
      <div
        style={{
          width: 170,
          height: 80,
          borderRadius: 4,
          overflow: 'hidden',
          background: '#10141d',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {metadata?.banner ? (
          <img
            src={metadata.banner}
            alt={task.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 8, color: '#525e6e' }}>
            <Icon icon="mynaui:gamepad" fontSize={28} />
            <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: '#67707b', textTransform: 'uppercase' }}>
              {task.source}
            </div>
          </div>
        )}

        {/* Etiqueta flotante del porcentaje sobre la carátula si está descargando */}
        {isDownloading && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(16, 20, 29, 0.85)',
              color: '#1a9fff',
              fontSize: 11,
              fontWeight: 800,
              textAlign: 'center',
              padding: '2px 0',
              backdropFilter: 'blur(4px)'
            }}
          >
            {Number(task.progress || 0).toFixed(1)}%
          </div>
        )}
      </div>

      {/* Área Central: Título, Estado y Barra de Progreso */}
      <div style={{ flex: 1, minWidth: 0, margin: '0 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: '#ffffff',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '0.2px'
            }}
            title={task.title}
          >
            {task.title}
          </h3>

          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: statusColor,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              flexShrink: 0,
              marginLeft: 12
            }}
          >
            {statusText}
          </span>
        </div>

        {/* Barra de Progreso estilo Steam */}
        {(isDownloading || isQueued || isPaused) && (
          <div
            style={{
              width: '100%',
              height: 6,
              background: '#10141d',
              borderRadius: 3,
              overflow: 'hidden',
              marginTop: 4,
              border: '1px solid rgba(255, 255, 255, 0.04)'
            }}
          >
            <div
              style={{
                width: `${task.progress || 0}%`,
                height: '100%',
                background: isDownloading
                  ? 'linear-gradient(90deg, #1a9fff, #54a5ff)'
                  : isPaused
                  ? '#f2c94c'
                  : '#445163',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        )}

        {/* Fila de Datos debajo de la barra */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#8b929a', fontWeight: 500, marginTop: 2 }}>
          <span>
            {task.totalBytes
              ? `${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`
              : task.fileSize || 'Tamaño desconocido'}
            {' · '}
            <strong style={{ color: '#abb6c4' }}>Fuente: {task.source}</strong>
          </span>

          {isDownloading ? (
            <span style={{ color: '#abb6c4' }}>
              TIEMPO RESTANTE:{' '}
              <strong style={{ color: '#ffffff' }}>
                {task.etaSeconds && task.etaSeconds > 0 && task.etaSeconds < 86400 * 7
                  ? formatEta(task.etaSeconds) || 'Calculando...'
                  : 'Calculando...'}
              </strong>
            </span>
          ) : task.error ? (
            <span style={{ color: '#ff5c5c', fontWeight: 600 }}>{task.error}</span>
          ) : null}
        </div>
      </div>

      {/* Área Derecha: Velocidad y Botones de Acción */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
        {/* Velocidad en grande si está activo */}
        <div style={{ width: 110, textAlign: 'right' }}>
          {isDownloading ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1a9fff', letterSpacing: '-0.3px' }}>
                {(task.speedBytes || 0) > 0 ? `${formatBytes(task.speedBytes)}/s` : '0 B/s'}
              </div>
              {task.peers && task.peers > 0 ? (
                <div style={{ fontSize: 11, color: '#5ccb5f', fontWeight: 600, marginTop: 2 }}>
                  {task.peers} pares
                </div>
              ) : null}
            </>
          ) : isPaused ? (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f2c94c' }}>Pausado</div>
          ) : isQueued ? (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#67707b' }}>Esperando turno</div>
          ) : isCompleted ? (
            <div style={{ fontSize: 13, fontWeight: 700, color: '#5ccb5f' }}>Listo para jugar</div>
          ) : null}
        </div>

        {/* Botones de control estilo Steam (Cuadrados con bordes suaves) */}
        <div style={{ display: 'flex', gap: 8 }}>
          {isDownloading && (
            <>
              <button
                onClick={() => onCancel(task.id)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 4,
                  background: '#2a3648',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                title="Pausar descarga"
              >
                <Icon icon="mynaui:pause" fontSize={18} />
              </button>
              <button
                onClick={() => onRemove(task.id)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 4,
                  background: 'rgba(255, 92, 92, 0.15)',
                  border: '1px solid rgba(255, 92, 92, 0.3)',
                  color: '#ff5c5c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title="Cancelar y eliminar"
              >
                <Icon icon="mynaui:x" fontSize={20} />
              </button>
            </>
          )}

          {(isQueued || isPaused || isError) && (
            <>
              <button
                onClick={() => onRetry(task.id)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 4,
                  background: '#1a9fff',
                  border: '1px solid #54a5ff',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 0 10px rgba(26, 159, 255, 0.3)'
                }}
                title="Reanudar / Priorizar"
              >
                <Icon icon="mynaui:play" fontSize={18} />
              </button>
              <button
                onClick={() => onRemove(task.id)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 4,
                  background: '#2a3648',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#a0a8b4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Eliminar de la cola"
              >
                <Icon icon="mynaui:x" fontSize={20} />
              </button>
            </>
          )}

          {isCompleted && (
            <button
              onClick={() => onRemove(task.id)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 4,
                background: '#2a3648',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#8b929a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Quitar de la lista"
            >
              <Icon icon="mynaui:x" fontSize={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
