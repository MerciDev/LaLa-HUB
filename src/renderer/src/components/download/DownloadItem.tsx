import React, { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { DownloadTask } from '../../../../shared/types'
import { searchGameByTitle, imageUrl } from './gameDetailCache'

interface DownloadItemProps {
  task: DownloadTask
  onCancel: (id: string) => void
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  focused?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'En cola',
  downloading: 'Descargando',
  completed: 'Completado',
  error: 'Error',
  opened: 'Instalado'
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'var(--text-muted)',
  downloading: '#00d4ff',
  completed: '#22c55e',
  error: '#ff6b6b',
  opened: '#38bdf8'
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function DownloadItem({
  task,
  onCancel,
  onRemove,
  onRetry,
  focused
}: DownloadItemProps): React.JSX.Element {
  const [metadata, setMetadata] = useState<{ coverImage?: string; backgroundImage?: string } | null>(null)

  useEffect(() => {
    let active = true
    searchGameByTitle(task.title).then((meta) => {
      if (active && meta) {
        setMetadata({
          coverImage: imageUrl(meta.coverImage),
          backgroundImage: imageUrl(meta.backgroundImage)
        })
      }
    })
    return () => {
      active = false
    }
  }, [task.title])

  const imgUrl = metadata?.coverImage || metadata?.backgroundImage

  return (
    <div
      className={`dl-item ${focused ? 'dl-item--focused' : ''}`}
      data-focused={focused ? 'true' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '16px 20px',
        background: 'rgba(18, 22, 32, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 14,
        marginBottom: 8,
        transition: 'all 0.2s ease',
        width: '100%'
      }}
    >
      {/* Mini Póster del Juego en Cola */}
      <div
        style={{
          width: 52,
          height: 70,
          borderRadius: 8,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={task.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Icon icon="mynaui:package" fontSize={26} style={{ color: STATUS_COLORS[task.status] || 'var(--text-muted)' }} />
        )}
      </div>

      {/* Información principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.title}
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>
          <span style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)', padding: '3px 10px', borderRadius: 6, fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>
            {task.source}
          </span>
          
          <span style={{ fontWeight: 600, color: '#fff' }}>
            {task.totalBytes ? formatBytes(task.totalBytes) : task.fileSize}
          </span>

          <span
            style={{
              color: STATUS_COLORS[task.status] || 'var(--text-muted)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[task.status] || 'var(--text-muted)' }} />
            {STATUS_LABELS[task.status] || task.status}
          </span>

          {task.statusMessage && task.status !== 'error' && (
            <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{task.statusMessage}</span>
          )}
          {task.error && (
            <span style={{ color: '#ff6b6b', fontWeight: 600 }}>{task.error}</span>
          )}
        </div>
      </div>

      {/* Botones de acción derecha */}
      <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
        {task.status === 'downloading' && (
          <>
            <button
              onClick={() => onCancel(task.id)}
              style={{ padding: '6px 14px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
              title="Pausar descarga"
            >
              <Icon icon="mynaui:pause" fontSize={15} /> Pausar
            </button>
            <button
              onClick={() => onRemove(task.id)}
              style={{ width: 32, height: 32, background: 'rgba(255, 75, 75, 0.12)', border: '1px solid rgba(255, 75, 75, 0.3)', color: '#ff6b6b', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Cancelar y eliminar"
            >
              <Icon icon="mynaui:trash" fontSize={16} />
            </button>
          </>
        )}

        {task.status === 'queued' && (
          <>
            <button
              onClick={() => onRetry(task.id)}
              style={{ padding: '6px 14px', background: 'rgba(0, 212, 255, 0.15)', border: '1px solid rgba(0, 212, 255, 0.35)', color: '#00d4ff', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}
              title="Priorizar / Reanudar"
            >
              <Icon icon="mynaui:play" fontSize={15} /> Reanudar
            </button>
            <button
              onClick={() => onRemove(task.id)}
              style={{ width: 32, height: 32, background: 'rgba(255, 75, 75, 0.12)', border: '1px solid rgba(255, 75, 75, 0.3)', color: '#ff6b6b', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Eliminar de la cola"
            >
              <Icon icon="mynaui:trash" fontSize={16} />
            </button>
          </>
        )}

        {task.status === 'error' && (
          <>
            <button
              onClick={() => onRetry(task.id)}
              style={{ padding: '6px 14px', background: 'rgba(0, 212, 255, 0.15)', border: '1px solid rgba(0, 212, 255, 0.35)', color: '#00d4ff', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}
              title="Reintentar descarga"
            >
              <Icon icon="mynaui:refresh" fontSize={15} /> Reintentar
            </button>
            <button
              onClick={() => onRemove(task.id)}
              style={{ width: 32, height: 32, background: 'rgba(255, 75, 75, 0.12)', border: '1px solid rgba(255, 75, 75, 0.3)', color: '#ff6b6b', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Eliminar de la lista"
            >
              <Icon icon="mynaui:trash" fontSize={16} />
            </button>
          </>
        )}

        {(task.status === 'completed' || task.status === 'opened') && (
          <button
            onClick={() => onRemove(task.id)}
            style={{ width: 32, height: 32, background: 'rgba(255, 75, 75, 0.12)', border: '1px solid rgba(255, 75, 75, 0.3)', color: '#ff6b6b', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Eliminar del historial"
          >
            <Icon icon="mynaui:trash" fontSize={16} />
          </button>
        )}
      </div>
    </div>
  )
}
