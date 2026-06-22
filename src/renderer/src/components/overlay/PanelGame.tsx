import { Icon } from '@iconify/react'

interface PanelGameProps {
  inPanel: boolean
  panelIdx: number
  activeGame: any
  sessionTimeStr: string
}

function PanelGame({ inPanel, panelIdx, activeGame, sessionTimeStr }: PanelGameProps) {
  const actions = [
    { icon: 'mynaui:camera',      label: 'Captura',  sub: 'Screenshot'     },
    { icon: 'mynaui:video',       label: 'Grabar',   sub: 'Iniciar grabación' },
    { icon: 'mynaui:save',        label: 'Guardar',  sub: 'Guardado rápido' },
    { icon: 'mynaui:users-group', label: 'Sala',     sub: 'Crear partido'  },
  ]

  if (!activeGame) {
    return (
      <>
        <div className="ov-panel__header">
          <Icon icon="mynaui:gamepad" className="ov-panel__icon" />
          <div className="ov-panel__title">Juego</div>
        </div>
        <div className="ov-panel__body" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Icon icon="mynaui:ghost" style={{ fontSize: 48, color: 'var(--text-muted)', marginBottom: 12, opacity: 0.5 }} />
          <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>No hay actividad reciente</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Inicia un juego desde el menú principal</div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="ov-panel__header">
        <Icon icon="mynaui:gamepad" className="ov-panel__icon" />
        <div className="ov-panel__title">Sesión Actual</div>
      </div>
      <div className="ov-panel__body">
        <div className="ov-game-card">
          <div className="ov-game-card__art">
            {activeGame.imageUrl ? <img src={activeGame.imageUrl} alt="" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit'}} /> : <Icon icon="mynaui:gamepad" />}
          </div>
          <div className="ov-game-card__info">
            <div className="ov-game-card__title">{activeGame.label}</div>
            <div className="ov-game-card__meta">
              {activeGame.platform?.name && <span>{activeGame.platform.name} · </span>}
              ⏱ Sesión: {sessionTimeStr}
            </div>
          </div>
          <div className="ov-game-card__actions">
            <button
              className="ov-btn ov-btn--accent"
              onClick={() => (window as any).api?.overlayControl?.showMain()}
            >
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

export default PanelGame
