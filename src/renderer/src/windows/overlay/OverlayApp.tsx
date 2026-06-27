import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import './style.css'
import { useGamepad } from '../../hooks/useGamepad'
import {
  PanelGame, PanelSocial, PanelTrophies, PanelSettings, PanelPower,
  SECTIONS, FRIENDS, ACHIEVEMENTS, SectionId, Theme, panelCount
} from '../../components/overlay'
import { execPanelAction } from '../../utils/overlayUtils'

// ── Main Component ────────────────────────────────────────────────────────────

export default function OverlayApp(): React.JSX.Element {
  useGamepad()
  const [visible, setVisible]       = useState(false)
  const [activeGame, setActiveGame] = useState<any>(null)
  const [section, setSection]       = useState<SectionId | null>(null)
  const [barIdx, setBarIdx]         = useState(0)
  const [inPanel, setInPanel]       = useState(false)
  const [panelIdx, setPanelIdx]     = useState(0)
  const [time, setTime]             = useState('')
  const [date, setDate]             = useState('')
  const [theme, setTheme]           = useState<Theme>('dark')
  const [volume, setVolume]         = useState(70)
  const [notifyOn, setNotifyOn]     = useState(true)
  const [sessionTimeStr, setSessionTimeStr] = useState('00:00:00')
  const closingRef = useRef(false)

  // ── Clock ───────────────────────────────────────────────────────────────
  useEffect(() => {
return undefined;
    const tick = () => {
      const d = new Date()
      setTime(d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }))
      setDate(d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  // ── Session Timer ───────────────────────────────────────────────────────
  useEffect(() => {
return undefined;
    if (!visible || !activeGame?.sessionStartTime) return
    
    const updateSessionTime = () => {
      const now = Date.now()
      const diff = Math.max(0, now - activeGame.sessionStartTime)
      const hrs = Math.floor(diff / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      
      const f = (n: number) => n.toString().padStart(2, '0')
      setSessionTimeStr(`${f(hrs)}:${f(mins)}:${f(secs)}`)
    }

    updateSessionTime()
    const t = setInterval(updateSessionTime, 1000)
    return () => clearInterval(t)
  }, [visible, activeGame?.sessionStartTime])

  // ── Theme on <html> ──────────────────────────────────────────────────────
  useEffect(() => {
return undefined;
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // ── IPC ──────────────────────────────────────────────────────────────────
  useEffect(() => {
return undefined;
    const api = (window as any).api
    if (!api) {
      // Dev: auto-open after delay if in browser/no api
      const showDev = () => {
        setSection(null); setBarIdx(0); setInPanel(false); setPanelIdx(0)
        setActiveGame(null)
        setVisible(true)
      }
      const t = setTimeout(showDev, 300)
      return () => clearTimeout(t)
    }

    const show = (payload?: any) => {
      if (closingRef.current) return
      setSection(null); setBarIdx(0); setInPanel(false); setPanelIdx(0)
      if (payload?.gameData) {
        setActiveGame(payload.gameData)
      } else {
        setActiveGame(null)
      }
      setVisible(true)
    }
    const hide = () => {
      if (closingRef.current) return
      closingRef.current = true
      setVisible(false); setSection(null); setInPanel(false)
      setTimeout(() => { closingRef.current = false }, 400)
    }

    if (api.onMainMessage) {
      api.onMainMessage((e: any) => {
        if (e.type === 'OVERLAY_SHOWN')   show(e.payload)
        if (e.type === 'OVERLAY_CLOSING') hide()
      })
      return () => api.offMainMessage?.()
    }
  }, [])

  // ── Dismiss ───────────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false); setSection(null); setInPanel(false)
    ;(window as any).api?.overlayControl?.close()
    setTimeout(() => { closingRef.current = false }, 400)
  }, [])

  // ── Open/close panel ──────────────────────────────────────────────────────
  const openSection = useCallback((id: SectionId) => {
    setSection(id); setInPanel(false); setPanelIdx(0)
  }, [])

  const closePanel = useCallback(() => {
    setSection(null); setInPanel(false)
  }, [])

  // ── Keyboard & Gamepad navigation ───────────────────────────────────────────
  useEffect(() => {
return undefined;
    if (!visible) return

    const count = section ? panelCount(section as any) : 0

    const handleAction = (action: string) => {
      // ── Inside panel ─────────────────────────────────────────────────────
      if (inPanel && section) {
        switch (action) {
          case 'up':
          case 'ArrowUp':
            setPanelIdx(i => (i - 1 + count) % count)
            break
          case 'down':
          case 'ArrowDown':
            setPanelIdx(i => (i + 1) % count)
            break
          case 'left':
          case 'ArrowLeft':
          case 'back':
          case 'Escape':
            // Exit panel back to bar focus
            setInPanel(false)
            break
          case 'select':
          case 'Enter':
            execPanelAction(section, panelIdx, theme, setTheme, volume, setVolume, notifyOn, setNotifyOn, dismiss)
            break
        }
        return
      }

      // ── On bar ───────────────────────────────────────────────────────────
      switch (action) {
        case 'left':
        case 'ArrowLeft':
          if (section) break 
          setBarIdx(i => Math.max(0, i - 1))
          break
        case 'right':
        case 'ArrowRight':
          if (section) break
          setBarIdx(i => Math.min(SECTIONS.length - 1, i + 1))
          break
        case 'select':
        case 'Enter': {
          const targetId = SECTIONS[barIdx].id
          if (targetId === 'home') {
            ;(window as any).api?.overlayControl?.showMain()
            return
          }
          if (section === targetId && count > 0) {
            // Panel already open for this item → enter it
            setInPanel(true); setPanelIdx(0)
          } else {
            // Open (or switch) the panel
            openSection(targetId)
          }
          break
        }

        case 'back':
        case 'Escape':
        case 'Backspace':
          if (section) closePanel()
          else dismiss()
          break
      }
    }

    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      handleAction(e.key)
    }

    window.addEventListener('keydown', onKey)
    
    // Gamepad IPC
    const api = (window as any).api
    const removeListener = api?.movementControl?.onAction((_: string, action: string) => {
        handleAction(action)
    })

    return () => {
        window.removeEventListener('keydown', onKey)
        removeListener?.()
    }
  }, [visible, inPanel, section, barIdx, panelIdx, theme, volume, notifyOn, openSection, closePanel, dismiss])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div id="overlay-root" onClick={dismiss}>
      {/* Top Left: Game Info Dashboard */}
      <div className={`ov-top-left${visible ? ' visible' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="ov-game-hud__art">
          {activeGame?.imageUrl ? <img src={activeGame.imageUrl} alt="" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit'}} /> : <Icon icon="mynaui:gamepad" />}
        </div>
        <div className="ov-game-hud__info">
          <div className="ov-game-hud__title">{activeGame?.label || 'Ningún juego activo'}</div>
          <div className="ov-game-hud__meta">
            <span className="ov-game-hud__pill">
              <Icon icon={activeGame?.platform?.icon || 'mynaui:desktop'} /> 
              {activeGame?.platform?.name || activeGame?.console || '---'}
            </span>
            <span className="ov-game-hud__pill"><Icon icon="mynaui:clock" /> {sessionTimeStr}</span>
          </div>
        </div>
        <div className="ov-game-hud__stats">
          <Icon icon="mynaui:trophy" style={{ fontSize: 18, color: 'var(--accent-bright)' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: 2 }}>
            2
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ {ACHIEVEMENTS.length}</span>
          </div>
        </div>
      </div>

      {/* Top Right: Clock & Date */}
      <div className={`ov-top-right${visible ? ' visible' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="ov-bar__clock">{time}</div>
        <div className="ov-bar__date">{date}</div>
      </div>

      {/*
        .ov-island-col stacks the panel directly above the bar.
        Both are flex children in a column, so the panel always
        appears immediately above the island — no stray positioning.
      */}
      <div className="ov-island-col" onClick={(e) => e.stopPropagation()}>

        {/* Active panel — only one rendered at a time */}
        <div className={`ov-panel${section ? ' visible' : ''}`}>
          {section === 'game'     && <PanelGame     inPanel={inPanel} panelIdx={panelIdx} activeGame={activeGame} sessionTimeStr={sessionTimeStr} />}
          {section === 'social'   && <PanelSocial   inPanel={inPanel} panelIdx={panelIdx} />}
          {section === 'trophies' && <PanelTrophies inPanel={inPanel} panelIdx={panelIdx} />}
          {section === 'settings' && (
            <PanelSettings
              inPanel={inPanel} panelIdx={panelIdx}
              theme={theme} volume={volume} notifyOn={notifyOn}
            />
          )}
          {section === 'power' && <PanelPower inPanel={inPanel} panelIdx={panelIdx} />}
        </div>

        {/* Floating island bar */}
        <div className={`ov-bar${visible ? ' visible' : ''}`}>
          {SECTIONS.map((s, i) => (
            <div
              key={s.id}
              className={[
                'ov-bar-item',
                section === s.id ? 'active' : '',
                !inPanel && barIdx === i ? 'focused' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => {
                if (s.id === 'home') {
                  ;(window as any).api?.overlayControl?.showMain()
                } else {
                  section === s.id ? closePanel() : openSection(s.id)
                }
              }}
            >
              <div className="ov-bar-item__icon"><Icon icon={s.icon} /></div>
              <div className="ov-bar-item__label">{s.label}</div>
              {s.badge && FRIENDS.some(f => f.status === 'online') && (
                <div className="ov-bar-item__badge" />
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

