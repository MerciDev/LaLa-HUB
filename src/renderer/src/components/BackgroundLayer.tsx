import { motion, AnimatePresence } from 'framer-motion'

interface BackgroundLayerProps {
    backgroundImage: string | null
}

function BackgroundLayer({ backgroundImage }: BackgroundLayerProps) {
    return (
        <>
            <div className="background-overlay" />
            <AnimatePresence mode="wait">
                {backgroundImage && (
                    <motion.div
                        key={backgroundImage}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7 }}
                        className="background-image-layer"
                        style={{ backgroundImage: `url(${backgroundImage})` }}
                    />
                )}
            </AnimatePresence>
        </>
    )
}

export default BackgroundLayer
