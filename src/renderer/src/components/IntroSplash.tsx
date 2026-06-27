import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface IntroSplashProps {
  onReady: () => void
  visible: boolean
  ready: boolean
}

function IntroSplash({ onReady, visible, ready }: IntroSplashProps) {
  const [phase, setPhase] = useState<'logo' | 'subtitle' | 'loading'>('logo')
  const [minTimeDone, setMinTimeDone] = useState(false)

  useEffect(() => {
    if (!visible) return
    const t1 = setTimeout(() => setPhase('subtitle'), 800)
    const t2 = setTimeout(() => setPhase('loading'), 1400)
    const t3 = setTimeout(() => setMinTimeDone(true), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [visible])

  useEffect(() => {
    if (minTimeDone && ready) onReady()
  }, [minTimeDone, ready])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="intro-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="intro-splash__bg" />
          <div className="intro-splash__orb" />

          <div className="intro-splash__content">
            <motion.div
              className="intro-splash__logo"
              initial={{ opacity: 0, scale: 0.6, y: 30 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            >
              <span className="intro-splash__logo-text">LaLa</span>
            </motion.div>

            {phase !== 'logo' && (
              <motion.div
                className="intro-splash__subtitle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                LaLa Hub
              </motion.div>
            )}

            {phase === 'loading' && (
              <motion.div
                className="intro-splash__loader-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="intro-splash__loader">
                  <div className="intro-splash__loader-bar" />
                </div>
                <span className="intro-splash__loader-label">Iniciando...</span>
              </motion.div>
            )}
          </div>

          <div className="intro-splash__footer">
            <motion.div
              className="intro-splash__version"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 2, duration: 0.6 }}
            >
              v1.0.0
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default IntroSplash
