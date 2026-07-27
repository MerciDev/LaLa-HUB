import React, { useEffect, useState, useRef } from 'react'
import { DownloadTask } from '../../../../shared/types'

interface SteamNetworkBannerProps {
  activeTasks: DownloadTask[]
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function SteamNetworkBanner({ activeTasks }: SteamNetworkBannerProps): React.JSX.Element {
  const [speedHistory, setSpeedHistory] = useState<number[]>(Array(60).fill(0))
  const maxSpeedRef = useRef<number>(1024 * 1024)

  const activeTask = activeTasks[0]
  const currentSpeedBytes = activeTask?.status === 'downloading' ? (activeTask.speedBytes || 0) : 0

  const currentSpeedRef = useRef<number>(0)
  currentSpeedRef.current = currentSpeedBytes

  useEffect(() => {
    const interval = setInterval(() => {
      setSpeedHistory((prev) => {
        const next = [...prev.slice(1), currentSpeedRef.current]
        maxSpeedRef.current = Math.max(...next, 1024 * 1024)
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const drawGraph = () => {
    const width = 500
    const height = 110
    const max = maxSpeedRef.current
    
    const points = speedHistory.map((val, idx) => {
      const x = (idx / (speedHistory.length - 1)) * width
      const y = height - (val / max) * height
      return `${x},${y}`
    }).join(' ')

    // Rejilla estilo cliente Steam
    const gridLines = [0.25, 0.5, 0.75].map((ratio, i) => (
      <line
        key={i}
        x1="0"
        y1={height * ratio}
        x2={width}
        y2={height * ratio}
        stroke="#1a2331"
        strokeWidth="1"
      />
    ))

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="steamNetGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a9fff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1a9fff" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {gridLines}
        <polyline points={`0,${height} ${points} ${width},${height}`} fill="url(#steamNetGradient)" />
        <polyline points={points} fill="none" stroke="#1a9fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  const currentSpeedText = activeTask?.status === 'downloading' ? (currentSpeedBytes > 0 ? `${formatBytes(currentSpeedBytes)}/s` : '0 B/s') : '0 B/s'
  const totalPeers = activeTasks.reduce((acc, t) => acc + (t.peers || 0), 0)

  // Calcular total descargado / tamaño de activos
  const totalDownloadedBytes = activeTasks.reduce((acc, t) => acc + (t.downloadedBytes || 0), 0)
  const totalSizeBytes = activeTasks.reduce((acc, t) => acc + (t.totalBytes || 0), 0)

  // Extraer avisos y estados
  const rawSpeedStr = activeTask?.speed || ''
  const isSpeedTextStr = activeTask?.status === 'downloading' && currentSpeedBytes === 0 && !rawSpeedStr.includes('B/s')
  const warningMessage = activeTask?.error || activeTask?.statusMessage || (isSpeedTextStr ? rawSpeedStr : null)

  return (
    <div
      style={{
        background: '#16202d',
        borderBottom: '1px solid #233142',
        padding: '24px 36px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(400px, 1fr)',
        gap: 36,
        alignItems: 'center',
        width: '100%',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* Columna Izquierda: Bloques de Métricas y Avisos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 }}>
          
          {/* BLOQUE 1: ACTUAL */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#67707b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              ACTUAL
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1a9fff', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
              {currentSpeedText}
            </div>
          </div>

          {/* BLOQUE 2: PICO MÁXIMO */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#67707b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              PICO MÁXIMO
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
              {formatBytes(maxSpeedRef.current)}/s
            </div>
          </div>

          {/* BLOQUE 3: TOTAL */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#67707b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              TOTAL
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
              {totalSizeBytes > 0 ? `${formatBytes(totalDownloadedBytes)} / ${formatBytes(totalSizeBytes)}` : activeTask ? activeTask.fileSize : '0 B'}
            </div>
          </div>

          {/* BLOQUE 4: PARES P2P / DISCO */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#67707b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              PARES ACTIVOS
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#5ccb5f', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
              {totalPeers}
            </div>
          </div>

        </div>

        {/* BLOQUE DE AVISOS Y ESTADO DE RED */}
        {warningMessage && (
          <div style={{ background: 'rgba(26, 159, 255, 0.08)', borderLeft: '4px solid #1a9fff', padding: '10px 16px', borderRadius: 4, marginTop: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#1a9fff', letterSpacing: '0.1em', marginBottom: 2 }}>AVISO DE RED / ESTADO</div>
            <div style={{ fontSize: 13, color: '#abb6c4', fontWeight: 600 }}>{warningMessage}</div>
          </div>
        )}
      </div>

      {/* Columna Derecha: Gráfico de Red Estilo Osciloscopio Steam */}
      <div
        style={{
          height: 110,
          background: '#10141d',
          border: '1px solid #1e2938',
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'inset 0 2px 12px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div style={{ position: 'absolute', top: 8, right: 12, display: 'flex', gap: 12, zIndex: 2, fontSize: 11, fontWeight: 700 }}>
          <span style={{ color: '#1a9fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, background: '#1a9fff', borderRadius: 1 }} />
            RED
          </span>
          <span style={{ color: '#5ccb5f', display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7 }}>
            <span style={{ width: 8, height: 8, background: '#5ccb5f', borderRadius: 1 }} />
            DISCO
          </span>
        </div>

        {drawGraph()}
      </div>
    </div>
  )
}
