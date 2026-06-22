import { Icon } from '@iconify/react'
import { ACHIEVEMENTS } from './types'

interface PanelTrophiesProps {
  inPanel: boolean
  panelIdx: number
}

function PanelTrophies({ inPanel, panelIdx }: PanelTrophiesProps) {
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

export default PanelTrophies
