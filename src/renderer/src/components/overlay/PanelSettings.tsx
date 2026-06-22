import { Icon } from '@iconify/react'
import { Theme, THEMES } from './types'

interface PanelSettingsProps {
  inPanel: boolean
  panelIdx: number
  theme: Theme
  volume: number
  notifyOn: boolean
}

function PanelSettings({ inPanel, panelIdx, theme, volume, notifyOn }: PanelSettingsProps) {
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

export default PanelSettings
