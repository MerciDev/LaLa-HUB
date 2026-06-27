import { motion, AnimatePresence } from 'framer-motion'

interface BackgroundLayerProps {
    backgroundImage: string | null
    isWallpaper?: boolean
}

function normalizeUrl(path: string | null): string | null {
    if (!path) return null
    if (path.startsWith('media://') || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
        return path
    }
    return `media://${path}`
}

function BackgroundLayer({ backgroundImage, isWallpaper }: BackgroundLayerProps) {
    const src = normalizeUrl(backgroundImage)
    return (
        <>
            <div className="background-overlay" />
            <AnimatePresence mode="wait">
                {src && (
                    <motion.div
                        key={src}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7 }}
                        className={`background-image-layer ${isWallpaper ? 'wallpaper-mode' : ''}`}
                        style={{ backgroundImage: `url(${src})` }}
                    />
                )}
            </AnimatePresence>
        </>
    )
}

export default BackgroundLayer
