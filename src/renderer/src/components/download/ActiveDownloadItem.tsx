import React, { useEffect, useState, useRef } from 'react'
import { Icon } from '@iconify/react'
import { DownloadTask } from '../../../../shared/types'
import { searchGameByTitle, imageUrl } from './gameDetailCache'

interface ActiveDownloadItemProps {
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
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatMbps(bytesPerSecond?: number): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '0 Mbps'
  const mbps = (bytesPerSecond * 8) / 1000000;
  return mbps.toFixed(1) + ' Mbps'
}

function formatEta(seconds?: number): string {
  if (!seconds || seconds <= 0) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    return `en alrededor de ${h} hora${h !== 1 ? 's' : ''}`
  }
  return m > 0 ? `en alrededor de ${m} minuto${m !== 1 ? 's' : ''}` : `${s} s`
}

export function ActiveDownloadItem({
  task,
  onCancel,
  onRemove,
  onRetry,
  focused
}: ActiveDownloadItemProps): React.JSX.Element {
  const [speedHistory, setSpeedHistory] = useState<number[]>(Array(60).fill(0))
  const maxSpeedRef = useRef<number>(1024 * 1024) // 1MB/s min scale
  const [metadata, setMetadata] = useState<{ coverImage?: string; backgroundImage?: string; logoImage?: string } | null>(null)

  useEffect(() => {
    let active = true
    searchGameByTitle(task.title).then((meta) => {
      if (active && meta) {
        setMetadata({
          coverImage: imageUrl(meta.coverImage),
          backgroundImage: imageUrl(meta.backgroundImage),
          logoImage: imageUrl(meta.logoImage)
        })
      }
    })
    return () => {
      active = false
    }
  }, [task.title])

  useEffect(() => {
    setSpeedHistory((prev) => {
      const next = [...prev.slice(1), task.speedBytes || 0]
      const currentMax = Math.max(...next, 1024 * 1024)
      maxSpeedRef.current = currentMax
      return next
    })
  }, [task.speedBytes])

  const drawBarGraph = () => {
    const width = 600
    const height = 60
    const max = Math.max(maxSpeedRef.current, 1)
    const slotWidth = width / speedHistory.length
    const barWidth = slotWidth * 0.5

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        {speedHistory.map((val, idx) => {
          const x = idx * slotWidth
          const h = Math.max((val / max) * height, val > 0 ? 4 : 0)
          const y = height - h
          return (
            <rect 
              key={idx} 
              x={x + (slotWidth - barWidth) / 2} 
              y={y} 
              width={barWidth} 
              height={h} 
              fill={val > 0 ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.05)"} 
              rx={2}
            />
          )
        })}
      </svg>
    )
  }

  const isDownloading = task.status === 'downloading'
  const isPaused = task.status === 'queued'

  const bgImg = metadata?.backgroundImage || metadata?.coverImage

  return (
    <div
      className={`dl-item ${focused ? 'dl-item--focused' : ''}`}
      data-focused={focused ? 'true' : undefined}
      style={{
        position: 'relative',
        width: '100%',
        height: 380,
        borderRadius: 16,
        overflow: 'hidden',
        background: '#12141a',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.25s ease'
      }}
    >
      {/* Background Image */}
      {bgImg && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${bgImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 20%',
            opacity: 0.65,
            zIndex: 0
          }}
        />
      )}
      
      {/* Dark Gradient Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(14, 18, 25, 0.95) 0%, rgba(14, 18, 25, 0.6) 40%, rgba(14, 18, 25, 0.1) 100%)',
          zIndex: 1
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', padding: '32px' }}>
        
        {/* Logo or Title */}
        <div style={{ flex: 1 }}>
          {metadata?.logoImage ? (
            <img 
              src={metadata.logoImage} 
              alt={task.title} 
              style={{ maxWidth: 320, maxHeight: 140, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }} 
            />
          ) : (
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.5)', margin: 0 }}>
              {task.title}
            </h2>
          )}
        </div>

        {/* Progress & Info Section */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32, marginBottom: 20 }}>
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  <Icon icon="mynaui:download" fontSize={20} /> 
                  {task.totalBytes ? `${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}` : task.fileSize || 'Calculando...'}
                </div>
                {isDownloading && task.etaSeconds !== undefined && task.etaSeconds > 0 && (
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    <Icon icon="mynaui:clock" fontSize={18} /> 
                    {formatEta(task.etaSeconds)}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {task.progress?.toFixed(2) || 0}%
              </div>
            </div>
            
            {/* Track */}
            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
              <div style={{ width: `${task.progress || 0}%`, height: '100%', background: '#fff', borderRadius: 3, transition: 'width 0.3s ease', boxShadow: '0 0 10px rgba(255,255,255,0.5)' }} />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, paddingBottom: 2 }}>
            {isDownloading ? (
              <button
                onClick={() => onCancel(task.id)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'background 0.2s'
                }}
              >
                <Icon icon="mynaui:pause" fontSize={18} />
                Pausar
              </button>
            ) : isPaused ? (
              <button
                onClick={() => onRetry(task.id)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'background 0.2s'
                }}
              >
                <Icon icon="mynaui:play" fontSize={18} />
                Reanudar
              </button>
            ) : null}
            <button
              onClick={() => onRemove(task.id)}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'background 0.2s'
              }}
            >
              <Icon icon="mynaui:x-circle" fontSize={18} />
              Cancelar
            </button>
          </div>
        </div>

        {/* Bottom Panel */}
        <div style={{
          background: 'rgba(10, 10, 10, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 12,
          padding: '16px 24px',
          display: 'flex',
          gap: 32,
          alignItems: 'center',
          backdropFilter: 'blur(12px)'
        }}>
          {/* Stats Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icon icon="mynaui:download" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>RED:</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginLeft: 'auto' }}>
                {isDownloading ? formatMbps(task.speedBytes) : '0 Mbps'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Icon icon="mynaui:chart-line" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>PICO:</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginLeft: 'auto' }}>
                {formatMbps(maxSpeedRef.current)}
              </span>
            </div>
            <div style={{ marginTop: 4 }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#fff', display: 'inline-block' }}>
                {task.source}
              </span>
            </div>
          </div>

          {/* Separator Line */}
          <div style={{ width: 1, height: 60, background: 'rgba(255,255,255,0.08)' }} />

          {/* Graph Right */}
          <div style={{ flex: 1, height: 60 }}>
            {drawBarGraph()}
          </div>
        </div>

      </div>
    </div>
  )
}
