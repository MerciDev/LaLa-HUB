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
  queued: 'mynaui:clock',
  downloading: 'mynaui:download',
  completed: 'mynaui:check',
  error: 'mynaui:alert-circle',
  opened: 'mynaui:external-link'
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'var(--text-muted)',
  downloading: 'var(--accent)',
  completed: '#23a559',
  error: '#ff6b6b',
  opened: 'var(--text-secondary)'
}

export function DownloadItem({
  task,
  onCancel,
  onRemove,
  onRetry,
  focused
}: DownloadItemProps): React.JSX.Element {
  const isActive = task.status === 'downloading' || task.status === 'queued'

  return (
    <div
      className={`dl-item ${focused ? 'dl-item--focused' : ''}`}
      data-focused={focused ? 'true' : undefined}
    >
      <div
        className="dl-item__icon"
        style={{ color: STATUS_COLORS[task.status] || 'var(--text-muted)' }}
      >
        <Icon icon={STATUS_ICONS[task.status] || 'mynaui:file'} />
      </div>

      <div className="dl-item__info">
        <div className="dl-item__title">{task.title}</div>
        <div className="dl-item__meta">
          <span className="dl-item__source">{task.source}</span>
          <span className="dl-item__size">{task.fileSize}</span>
          {task.status === 'downloading' && task.speed && (
            <span className="dl-item__speed">{task.speed}</span>
          )}
        </div>
        {task.status === 'downloading' && (
          <div className="dl-item__progress-bar">
            <div className="dl-item__progress-fill" style={{ width: `${task.progress}%` }} />
          </div>
        )}
        {task.status === 'downloading' && (
          <div className="dl-item__progress-text">{task.progress}%</div>
        )}
        {task.error && <div className="dl-item__error">{task.error}</div>}
      </div>

      <div className="dl-item__actions">
        {isActive && (
          <button className="dl-item__btn" onClick={() => onCancel(task.id)} title="Cancelar">
            <Icon icon="mynaui:ban" />
          </button>
        )}
        {task.status === 'error' && (
          <button className="dl-item__btn" onClick={() => onRetry(task.id)} title="Reintentar">
            <Icon icon="mynaui:refresh" />
          </button>
        )}
        {(task.status === 'completed' || task.status === 'opened' || task.status === 'error') && (
          <button
            className="dl-item__btn dl-item__btn--danger"
            onClick={() => onRemove(task.id)}
            title="Eliminar"
          >
            <Icon icon="mynaui:trash" />
          </button>
        )}
      </div>
    </div>
  )
}
