import React from 'react'
import { Icon } from '@iconify/react'
import { DownloadTask } from '../../../../shared/types'

interface DownloadItemProps {
  task: DownloadTask
  onCancel: (id: string) => void
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  focused?: boolean
}

const STATUS_ICONS: Record<string, string> = {
  queued: 'mynaui:pause',
  downloading: 'mynaui:download',
  completed: 'mynaui:check',
  error: 'mynaui:alert-circle',
  opened: 'mynaui:external-link'
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'var(--text-muted)',
  downloading: '#00aaff',
  completed: '#23a559',
  error: '#ff6b6b',
  opened: 'var(--text-secondary)'
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatEta(seconds?: number): string {
  if (!seconds || seconds <= 0) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 60) {
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
  }
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function DownloadItem({
  task,
  onCancel,
  onRemove,
  onRetry,
  focused
}: DownloadItemProps): React.JSX.Element {
  return (
    <div
      className={`dl-item ${focused ? 'dl-item--focused' : ''}`}
      data-focused={focused ? 'true' : undefined}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'rgba(18, 20, 28, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, marginBottom: 10 }}
    >
      <div
        className="dl-item__icon"
        style={{ color: STATUS_COLORS[task.status] || 'var(--text-muted)', fontSize: 24, flexShrink: 0 }}
      >
        <Icon icon={STATUS_ICONS[task.status] || 'mynaui:file'} />
      </div>

      <div className="dl-item__info" style={{ flex: 1, minWidth: 0 }}>
        <div className="dl-item__title" style={{ fontWeight: 600, fontSize: 14, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
        
        <div className="dl-item__meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <span className="dl-item__source" style={{ background: 'rgba(0, 170, 255, 0.15)', color: '#00aaff', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>{task.source}</span>
          
          {task.totalBytes ? (
            <span className="dl-item__size" style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
              {formatBytes(task.downloadedBytes)} / {formatBytes(task.totalBytes)}
            </span>
          ) : (
            <span className="dl-item__size" style={{ fontWeight: 500 }}>{task.fileSize}</span>
          )}

          {task.speed && (
            <span className="dl-item__speed" style={{ color: task.status === 'downloading' ? '#22c55e' : 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon icon="mynaui:wifi" />
              {task.speed}
            </span>
          )}

          {(task.peers ?? 0) > 0 && (
            <span className="dl-item__peers" style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon icon="mynaui:users" />
              {task.peers} pares (P2P)
            </span>
          )}

          {task.status === 'downloading' && task.etaSeconds ? (
            <span className="dl-item__eta" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Icon icon="mynaui:clock" />
              Restante: {formatEta(task.etaSeconds)}
            </span>
          ) : null}
        </div>

        {(task.status === 'downloading' || task.status === 'queued') && (
          <div className="dl-item__progress-bar" style={{ marginTop: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div
              className="dl-item__progress-fill"
              style={{
                width: `${task.progress || 0}%`,
                background: task.status === 'queued' ? 'var(--text-muted)' : 'linear-gradient(90deg, #00aaff, #00e5ff)',
                height: '100%',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        )}

        {(task.status === 'downloading' || task.status === 'queued') && (
          <div className="dl-item__progress-text" style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>
            {task.status === 'queued' ? `Pausado (${task.progress || 0}%)` : `${task.progress || 0}% completado`}
          </div>
        )}

        {task.statusMessage && task.status !== 'error' && (
          <div className="dl-item__status-msg" style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>{task.statusMessage}</div>
        )}
        {task.error && <div className="dl-item__error" style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4 }}>{task.error}</div>}
      </div>

      <div className="dl-item__actions" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {task.status === 'downloading' && (
          <>
            <button className="dl-item__btn" onClick={() => onCancel(task.id)} title="Pausar descarga" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
              <Icon icon="mynaui:pause" /> Pausar
            </button>
            <button className="dl-item__btn dl-item__btn--danger" onClick={() => onRemove(task.id)} title="Cancelar y eliminar" style={{ padding: '6px 12px', background: 'rgba(255, 75, 75, 0.15)', border: '1px solid rgba(255, 75, 75, 0.35)', color: '#ff6b6b', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
              <Icon icon="mynaui:trash" /> Eliminar
            </button>
          </>
        )}

        {task.status === 'queued' && (
          <>
            <button className="dl-item__btn" onClick={() => onRetry(task.id)} title="Reanudar descarga" style={{ padding: '6px 12px', background: 'rgba(0, 170, 255, 0.2)', border: '1px solid #00aaff', color: '#00aaff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
              <Icon icon="mynaui:play" /> Reanudar
            </button>
            <button className="dl-item__btn dl-item__btn--danger" onClick={() => onRemove(task.id)} title="Eliminar de la lista" style={{ padding: '6px 12px', background: 'rgba(255, 75, 75, 0.15)', border: '1px solid rgba(255, 75, 75, 0.35)', color: '#ff6b6b', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
              <Icon icon="mynaui:trash" /> Eliminar
            </button>
          </>
        )}

        {task.status === 'error' && (
          <>
            <button className="dl-item__btn" onClick={() => onRetry(task.id)} title="Reintentar descarga" style={{ padding: '6px 12px', background: 'rgba(0, 170, 255, 0.2)', border: '1px solid #00aaff', color: '#00aaff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
              <Icon icon="mynaui:refresh" /> Reintentar
            </button>
            <button className="dl-item__btn dl-item__btn--danger" onClick={() => onRemove(task.id)} title="Eliminar de la lista" style={{ padding: '6px 12px', background: 'rgba(255, 75, 75, 0.15)', border: '1px solid rgba(255, 75, 75, 0.35)', color: '#ff6b6b', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
              <Icon icon="mynaui:trash" /> Eliminar
            </button>
          </>
        )}

        {(task.status === 'completed' || task.status === 'opened') && (
          <button className="dl-item__btn dl-item__btn--danger" onClick={() => onRemove(task.id)} title="Eliminar del historial" style={{ padding: '6px 12px', background: 'rgba(255, 75, 75, 0.15)', border: '1px solid rgba(255, 75, 75, 0.35)', color: '#ff6b6b', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500 }}>
            <Icon icon="mynaui:trash" /> Eliminar
          </button>
        )}
      </div>
    </div>
  )
}
