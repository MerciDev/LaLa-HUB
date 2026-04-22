import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import './style.css'

// ── Types ────────────────────────────────────────────────────────────────────

type SectionId = 'home' | 'social' | 'trophies' | 'settings' | 'power'
type Theme = 'dark' | 'platinum' | 'midnight'

interface Friend {
  id: string; name: string; initials: string
  status: 'online' | 'away' | 'offline'; statusText: string
}
interface Achievement {
  id: string; name: string; desc: string; icon: string
  tier: 'gold' | 'silver' | 'bronze' | 'locked'; progress: number
}

// ── Static data ───────────────────────────────────────────────────────────────

const FRIENDS: Friend[] = [
  { id: '1', name: 'ArikamX',  initials: 'A', status: 'online',  statusText: 'Jugando Halo CE' },
  { id: '2', name: 'JuanPA',   initials: 'J', status: 'online',  statusText: 'En el menú' },
  { id: '3', name: 'MeloDark', initials: 'M', status: 'away',    statusText: 'Ausente' },
  { id: '4', name: 'Xenon95',  initials: 'X', status: 'offline', statusText: 'Hace 2h' },
]

const ACHIEVEMENTS: Achievement[] = [
  { id: '1', name: 'Primer Paso',   desc: 'Completa el tutorial',       icon: '⭐', tier: 'bronze', progress: 100 },
  { id: '2', name: 'Sin Detenerse', desc: 'Juega 10h sin pausas',       icon: '🔥', tier: 'silver', progress: 100 },
  { id: '3', name: 'Leyenda',       desc: 'Completa el juego al 100%',  icon: '👑', tier: 'locked', progress: 62  },
  { id: '4', name: 'Velocista',     desc: 'Carrera en menos de 3 min',  icon: '⚡', tier: 'locked', progress: 0   },
]

const THEMES: { id: Theme; label: string }[] = [
  { id: 'dark',     label: 'Oscuro'     },
  { id: 'platinum', label: 'Platino'    },
  { id: 'midnight', label: 'Medianoche' },
]

const SECTIONS: { id: SectionId; icon: string; label: string; badge?: true }[] = [
  { id: 'home',     icon: 'mynaui:home-solid', label: 'Inicio'  },
  { id: 'social',   icon: 'mynaui:users',      label: 'Social', badge: true },
  { id: 'trophies', icon: 'mynaui:trophy',     label: 'Logros'  },
  { id: 'settings', icon: 'mynaui:cog-six',    label: 'Ajustes' },
  { id: 'power',    icon: 'mynaui:power',      label: 'Sistema' },
]

function panelCount(s: SectionId): number {
  switch (s) {
    case 'home':     return 4
    case 'social':   return FRIENDS.length
    case 'trophies': return ACHIEVEMENTS.length
    case 'settings': return 3
    case 'power':    return 3
    default:         return 0
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OverlayApp(): React.JSX.Element {
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
  const closingRef = useRef(false)

  // ── Clock ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setTime(d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }))
      setDate(d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  // ── Theme on <html> ──────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // ── IPC ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const api = (window as any).api
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

    if (api?.onMainMessage) {
      api.onMainMessage((e: any) => {
        if (e.type === 'OVERLAY_SHOWN')   show(e.payload)
        if (e.type === 'OVERLAY_CLOSING') hide()
      })
      return () => api.offMainMessage?.()
    } else {
      // Dev: auto-open after delay
      const t = setTimeout(show, 300)
      return () => clearTimeout(t)
    }
  }, [])

  // ── Dismiss ───────────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false); setSection(null); setInPanel(false)
    ;(window as any).api?.send?.('dispatch-action', { type: 'OVERLAY_CLOSING' })
    setTimeout(() => { closingRef.current = false }, 400)
  }, [])

  // ── Open/close panel ──────────────────────────────────────────────────────
  const openSection = useCallback((id: SectionId) => {
    setSection(id); setInPanel(false); setPanelIdx(0)
  }, [])

  const closePanel = useCallback(() => {
    setSection(null); setInPanel(false)
  }, [])

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return

    const count = section ? panelCount(section) : 0

    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()

      // ── Inside panel ─────────────────────────────────────────────────────
      if (inPanel && section) {
        switch (e.key) {
          case 'ArrowUp':
            setPanelIdx(i => (i - 1 + count) % count)
            break
          case 'ArrowDown':
            setPanelIdx(i => (i + 1) % count)
            break
          case 'ArrowLeft':
          case 'Escape':
            // Exit panel back to bar focus
            setInPanel(false)
            break
          case 'Enter':
            execPanelAction(section, panelIdx, theme, setTheme, volume, setVolume, notifyOn, setNotifyOn, dismiss)
            break
        }
        return
      }

      // ── On bar ───────────────────────────────────────────────────────────
      switch (e.key) {
        case 'ArrowLeft':
          setBarIdx(i => Math.max(0, i - 1))
          // Don't auto-close panel — user navigates bar while panel is open
          break
        case 'ArrowRight':
          setBarIdx(i => Math.min(SECTIONS.length - 1, i + 1))
          break
        case 'Enter':
        case 'ArrowUp': {
          const targetId = SECTIONS[barIdx].id
          if (section === targetId && count > 0) {
            // Panel already open for this item → enter it
            setInPanel(true); setPanelIdx(0)
          } else {
            // Open (or switch) the panel
            openSection(targetId)
          }
          break
        }
        case 'ArrowDown':
          closePanel()
          break
        case 'Escape':
        case 'Backspace':
          if (section) closePanel()
          else dismiss()
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, inPanel, section, barIdx, panelIdx, theme, volume, notifyOn, openSection, closePanel, dismiss])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div id="overlay-root">
      {/* Top Left: Game Info Dashboard */}
      <div className={`ov-top-left${visible ? ' visible' : ''}`}>
        <div className="ov-game-hud__art">
          {activeGame?.imageUrl ? <img src={activeGame.imageUrl} alt="" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit'}} /> : <Icon icon="mynaui:gamepad" />}
        </div>
        <div className="ov-game-hud__info">
          <div className="ov-game-hud__title">{activeGame?.label || 'Ningún juego activo'}</div>
          <div className="ov-game-hud__meta">
            <span className="ov-game-hud__pill"><Icon icon="mynaui:desktop" /> {activeGame?.console || '---'}</span>
            <span className="ov-game-hud__pill"><Icon icon="mynaui:clock" /> {activeGame?.playtimeStr || '0m'}</span>
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
      <div className={`ov-top-right${visible ? ' visible' : ''}`}>
        <div className="ov-bar__clock">{time}</div>
        <div className="ov-bar__date">{date}</div>
      </div>

      {/*
        .ov-island-col stacks the panel directly above the bar.
        Both are flex children in a column, so the panel always
        appears immediately above the island — no stray positioning.
      */}
      <div className="ov-island-col">

        {/* Active panel — only one rendered at a time */}
        <div className={`ov-panel${section ? ' visible' : ''}`}>
          {section === 'home'     && <PanelHome     inPanel={inPanel} panelIdx={panelIdx} activeGame={activeGame} />}
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
              onClick={() => section === s.id ? closePanel() : openSection(s.id)}
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

// ── Panel components ──────────────────────────────────────────────────────────

function PanelHome({ inPanel, panelIdx, activeGame }: { inPanel: boolean; panelIdx: number; activeGame: any }) {
  const actions = [
    { icon: 'mynaui:camera',      label: 'Captura',  sub: 'Screenshot'     },
    { icon: 'mynaui:video',       label: 'Grabar',   sub: 'Iniciar grabación' },
    { icon: 'mynaui:save',        label: 'Guardar',  sub: 'Guardado rápido' },
    { icon: 'mynaui:users-group', label: 'Sala',     sub: 'Crear partido'  },
  ]
  return (
    <>
      <div className="ov-panel__header">
        <Icon icon="mynaui:home-solid" className="ov-panel__icon" />
        <div className="ov-panel__title">Inicio</div>
      </div>
      <div className="ov-panel__body">
        <div className="ov-game-card">
          <div className="ov-game-card__art">
            {activeGame?.imageUrl ? <img src={activeGame.imageUrl} alt="" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit'}} /> : <Icon icon="mynaui:gamepad" />}
          </div>
          <div className="ov-game-card__info">
            <div className="ov-game-card__title">{activeGame?.label || 'LaLa Hub'}</div>
            <div className="ov-game-card__meta">⏱ {activeGame?.playtimeStr || 'Navegando'}</div>
          </div>
          <div className="ov-game-card__actions">
            <button className="ov-btn ov-btn--accent">
              <Icon icon="mynaui:play-solid" /> Continuar
            </button>
          </div>
        </div>

        <div className="ov-section-label">Acciones rápidas</div>
        <div className="ov-action-list">
          {actions.map((a, i) => (
            <div key={a.label} className={`ov-action-item${inPanel && panelIdx === i ? ' focused' : ''}`}>
              <div className="ov-action-item__icon"><Icon icon={a.icon} /></div>
              <div>
                <div className="ov-action-item__label">{a.label}</div>
                <div className="ov-action-item__sub">{a.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="ov-hints">
          <span className="ov-hint"><span className="ov-hint__key">↑↓</span> Navegar</span>
          <span className="ov-hint"><span className="ov-hint__key">↵</span> Acción</span>
          <span className="ov-hint"><span className="ov-hint__key">Esc</span> Cerrar</span>
        </div>
      </div>
    </>
  )
}

function PanelSocial({ inPanel, panelIdx }: { inPanel: boolean; panelIdx: number }) {
  const online  = FRIENDS.filter(f => f.status !== 'offline')
  const offline = FRIENDS.filter(f => f.status === 'offline')
  return (
    <>
      <div className="ov-panel__header">
        <Icon icon="mynaui:users" className="ov-panel__icon" />
        <div className="ov-panel__title">Amigos</div>
        <span className="ov-panel__badge">{online.length} en línea</span>
      </div>
      <div className="ov-panel__body">
        {online.length > 0 && (
          <>
            <div className="ov-section-label">En línea</div>
            {online.map((f, i) => (
              <FriendRow key={f.id} friend={f} focused={inPanel && panelIdx === i} />
            ))}
          </>
        )}
        {offline.length > 0 && (
          <>
            <div className="ov-section-label">Sin conexión</div>
            {offline.map((f, i) => (
              <FriendRow key={f.id} friend={f} focused={inPanel && panelIdx === online.length + i} />
            ))}
          </>
        )}
        <div className="ov-hints">
          <span className="ov-hint"><span className="ov-hint__key">↑↓</span> Navegar</span>
          <span className="ov-hint"><span className="ov-hint__key">↵</span> Invitar</span>
        </div>
      </div>
    </>
  )
}

function FriendRow({ friend, focused }: { friend: Friend; focused: boolean }) {
  return (
    <div className={`ov-friend-row${focused ? ' focused' : ''}`}>
      <div className={`ov-friend-row__avatar ov-friend-row__avatar--${friend.status}`}>
        {friend.initials}
      </div>
      <div className="ov-friend-row__info">
        <div className="ov-friend-row__name">{friend.name}</div>
        <div className="ov-friend-row__status">{friend.statusText}</div>
      </div>
      <div className={`ov-dot ov-dot--${friend.status}`} />
      {friend.status === 'online' && (
        <button className="ov-btn ov-btn--ghost" style={{ fontSize: 11, padding: '4px 10px' }}>
          Unirse
        </button>
      )}
    </div>
  )
}

function PanelTrophies({ inPanel, panelIdx }: { inPanel: boolean; panelIdx: number }) {
  const unlocked = ACHIEVEMENTS.filter(a => a.tier !== 'locked').length
  return (
    <>
      <div className="ov-panel__header">
        <Icon icon="mynaui:trophy" className="ov-panel__icon" />
        <div className="ov-panel__title">Logros</div>
        <span className="ov-panel__badge">{unlocked}/{ACHIEVEMENTS.length}</span>
      </div>
      <div className="ov-panel__body">
        {ACHIEVEMENTS.map((a, i) => (
          <div key={a.id} className={`ov-trophy-row${inPanel && panelIdx === i ? ' focused' : ''}`}>
            <div className={`ov-trophy-row__icon ov-trophy-row__icon--${a.tier}`}>{a.icon}</div>
            <div className="ov-trophy-row__info">
              <div className="ov-trophy-row__name">{a.name}</div>
              <div className="ov-trophy-row__desc">{a.desc}</div>
              {a.tier === 'locked' && a.progress > 0 && (
                <div className="ov-progress">
                  <div className="ov-progress__fill" style={{ width: `${a.progress}%` }} />
                </div>
              )}
            </div>
            {a.tier !== 'locked'
              ? <span className="ov-chip ov-chip--green">✓</span>
              : a.progress > 0 && <span className="ov-chip">{a.progress}%</span>
            }
          </div>
        ))}
        <div className="ov-hints">
          <span className="ov-hint"><span className="ov-hint__key">↑↓</span> Navegar</span>
        </div>
      </div>
    </>
  )
}

function PanelSettings({ inPanel, panelIdx, theme, volume, notifyOn }: {
  inPanel: boolean; panelIdx: number
  theme: Theme; volume: number; notifyOn: boolean
}) {
  const rows = [
    {
      icon: 'mynaui:volume', label: 'Volumen',
      right: (
        <div className="ov-slider">
          <span className="ov-slider-val">{volume}%</span>
          <div className="ov-slider-track">
            <div className="ov-slider-fill" style={{ width: `${volume}%` }} />
          </div>
        </div>
      )
    },
    {
      icon: 'mynaui:bell', label: 'Notificaciones',
      right: <div className={`ov-toggle${notifyOn ? ' on' : ''}`} />
    },
    {
      icon: 'mynaui:palette', label: 'Tema',
      right: <span className="ov-chip ov-chip--accent">{THEMES.find(t => t.id === theme)?.label}</span>
    },
  ]
  return (
    <>
      <div className="ov-panel__header">
        <Icon icon="mynaui:cog-six" className="ov-panel__icon" />
        <div className="ov-panel__title">Ajustes rápidos</div>
      </div>
      <div className="ov-panel__body">
        {rows.map((row, i) => (
          <div key={row.label} className={`ov-setting-row${inPanel && panelIdx === i ? ' focused' : ''}`}>
            <div className="ov-setting-row__icon"><Icon icon={row.icon} /></div>
            <div className="ov-setting-row__label">{row.label}</div>
            {row.right}
          </div>
        ))}
        <div className="ov-hints">
          <span className="ov-hint"><span className="ov-hint__key">↑↓</span> Navegar</span>
          <span className="ov-hint"><span className="ov-hint__key">↵</span> Cambiar</span>
        </div>
      </div>
    </>
  )
}

function PanelPower({ inPanel, panelIdx }: { inPanel: boolean; panelIdx: number }) {
  const opts = [
    { icon: 'mynaui:moon',    label: 'Suspender', desc: 'Pausa y guarda el estado',  danger: false },
    { icon: 'mynaui:refresh', label: 'Reiniciar', desc: 'Reinicia la aplicación',    danger: false },
    { icon: 'mynaui:power',   label: 'Cerrar',    desc: 'Cierra LaLa Hub',           danger: true  },
  ]
  return (
    <>
      <div className="ov-panel__header">
        <Icon icon="mynaui:power" className="ov-panel__icon" />
        <div className="ov-panel__title">Sistema</div>
      </div>
      <div className="ov-panel__body">
        <div className="ov-power-opts">
          {opts.map((o, i) => (
            <div
              key={o.label}
              className={[
                'ov-power-opt',
                o.danger ? 'ov-power-opt--danger' : '',
                inPanel && panelIdx === i ? 'focused' : '',
              ].filter(Boolean).join(' ')}
            >
              <Icon icon={o.icon} className="ov-power-opt__icon" />
              <div className="ov-power-opt__info">
                <div className="ov-power-opt__label">{o.label}</div>
                <div className="ov-power-opt__desc">{o.desc}</div>
              </div>
              <Icon icon="mynaui:chevron-right" style={{ fontSize: 13, color: 'var(--text-muted)' }} />
            </div>
          ))}
        </div>
        <div className="ov-hints">
          <span className="ov-hint"><span className="ov-hint__key">↑↓</span> Navegar</span>
          <span className="ov-hint"><span className="ov-hint__key">↵</span> Confirmar</span>
        </div>
      </div>
    </>
  )
}

// ── Action executor ───────────────────────────────────────────────────────────

function execPanelAction(
  section: SectionId, idx: number,
  theme: Theme, setTheme: (t: Theme) => void,
  volume: number, setVolume: (v: number) => void,
  notifyOn: boolean, setNotifyOn: (fn: (p: boolean) => boolean) => void,
  dismiss: () => void
) {
  if (section === 'settings') {
    if (idx === 0) setVolume(volume >= 100 ? 0 : Math.min(100, volume + 10))
    if (idx === 1) setNotifyOn(n => !n)
    if (idx === 2) {
      const i = THEMES.findIndex(t => t.id === theme)
      setTheme(THEMES[(i + 1) % THEMES.length].id)
    }
  }
  if (section === 'power' && idx === 2) {
    dismiss()
  }
}