import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'

interface ModeHUDProps {
    moveMode: { slotId: string; ghostPosition: number } | null
    resizeMode: { slotId: string } | null
}

function ModeHUD({ moveMode, resizeMode }: ModeHUDProps) {
    return (
        <AnimatePresence>
            {moveMode && (
                <motion.div
                    className="grid-mode-hud"
                    initial={{ opacity: 0, y: 10, scale: 0.9, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                    exit={{ opacity: 0, y: 10, scale: 0.9, x: '-50%' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                    <Icon icon="mynaui:arrow-up-down-left-right" className="grid-mode-hud__icon" />
                    <span>Selecciona la nueva posición</span>
                    <kbd>↑↓←→</kbd>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>mover</span>
                    <kbd>Enter</kbd>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>confirmar</span>
                    <kbd>Esc</kbd>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>cancelar</span>
                </motion.div>
            )}
            {resizeMode && (
                <motion.div
                    className="grid-mode-hud grid-mode-hud--resize"
                    initial={{ opacity: 0, y: 10, scale: 0.9, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                    exit={{ opacity: 0, y: 10, scale: 0.9, x: '-50%' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                    <Icon icon="mynaui:expand" className="grid-mode-hud__icon" />
                    <span>Ajusta el tamaño</span>
                    <kbd>→/↓</kbd>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>ampliar</span>
                    <kbd>←/↑</kbd>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>reducir</span>
                    <kbd>Enter</kbd>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>confirmar</span>
                    <kbd>Esc</kbd>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>cancelar</span>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default ModeHUD
