import { Icon } from '@iconify/react'
import { FRIENDS } from './types'
import FriendRow from './FriendRow'

interface PanelSocialProps {
  inPanel: boolean
  panelIdx: number
}

function PanelSocial({ inPanel, panelIdx }: PanelSocialProps) {
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

export default PanelSocial
