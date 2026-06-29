import { Icon } from '@iconify/react'

function TrophiesTab() {
    return (
        <div className="cp-coming-soon">
            <div className="cp-coming-soon__glow" />
            <Icon icon="mynaui:trophy" className="cp-coming-soon__icon" />
            <h3>Próximamente</h3>
            <p>El sistema de trofeos y logros estará disponible en futuras versiones.</p>
        </div>
    )
}

export default TrophiesTab
