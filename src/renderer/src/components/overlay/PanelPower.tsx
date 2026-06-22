import { Icon } from '@iconify/react'

interface PanelPowerProps {
  inPanel: boolean
  panelIdx: number
}

function PanelPower({ inPanel, panelIdx }: PanelPowerProps) {
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

export default PanelPower
