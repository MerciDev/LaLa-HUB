import React, { useEffect, useState } from 'react'
import { HomeSlot } from '../../../../shared/types'

function LoadingApp(): React.JSX.Element {
    const [gameData, setGameData] = useState<HomeSlot | null>(null)
    const [bgImage, setBgImage] = useState<string | null>(null)

    useEffect(() => {
        const removeBgListener = window.api?.onLoadingBg?.((url) => {
            setBgImage(url)
        })
        
        const removeLoadingDataListener = window.api?.onLoadingData?.((item) => {
            setGameData(item)
        })

        // Allow user to dismiss loading screen manually with Escape
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                ;(window as any).api?.loadingControl?.dismiss()
            }
        }
        window.addEventListener('keydown', onKeyDown)

        return () => {
            if (removeBgListener) removeBgListener()
            if (removeLoadingDataListener) removeLoadingDataListener()
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [])

    const playtimeHours = gameData?.game?.playtimeMinutes ? Math.floor(gameData.game.playtimeMinutes / 60) : 0
    const playtimeMins = gameData?.game?.playtimeMinutes ? gameData.game.playtimeMinutes % 60 : 0
    const getMediaUrl = (path: string | undefined | null) => {
        if (!path) return null
        if (path.startsWith('media://') || path.startsWith('http') || path.startsWith('data:')) {
            return path
        }
        return `media://${path}`
    }

    const imageUrl = getMediaUrl(gameData?.squareImage) || getMediaUrl(gameData?.thumbImage)
    const gameBgImage = getMediaUrl(gameData?.backgroundImage)

    return (
        <div id="loading-container">
            {/* Si tenemos imagen de fondo específica del juego, la usamos sin tanto blur para que se aprecie; si no, el screenshot ultra difuminado */}
            {gameBgImage ? (
                <div 
                    className="game-background-clear" 
                    style={{ backgroundImage: `url(${gameBgImage})` }} 
                />
            ) : bgImage ? (
                <div 
                    className="desktop-background" 
                    style={{ backgroundImage: `url(${bgImage})` }} 
                />
            ) : null}
            
            <div className="blur-overlay" />
            
            {imageUrl && (
                 <div 
                    className="game-background-blur" 
                    style={{ backgroundImage: `url(${imageUrl})` }} 
                />
            )}

            <div className="content-wrapper">
                <div className="glass-card">
                    <div className="image-container">
                         {imageUrl ? (
                             <img src={imageUrl} alt={gameData?.label} />
                         ) : (
                             <div className="placeholder-icon">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
                             </div>
                         )}
                    </div>
                    
                    <div className="game-info">
                        <div className="status-badge">
                            <span className="spinner"></span>
                            Iniciando...
                        </div>
                        
                        <h1 className="game-title">{gameData?.label || 'Cargando Juego...'}</h1>
                        
                        <div className="meta-info">
                            {gameData?.game?.platform && (
                                <span className="platform-tag">{gameData.game.platform.name}</span>
                            )}
                            
                            {gameData?.game?.playtimeMinutes !== undefined && gameData.game.playtimeMinutes > 0 && (
                                <span className="playtime-tag">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                                    {playtimeHours > 0 ? `${playtimeHours}h ` : ''}{playtimeMins}m
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="loader-bar-container">
                    <div className="loader-bar"></div>
                </div>

                <div className="escape-hint">
                    Pulsa <kbd>ESC</kbd> para cancelar
                </div>
            </div>
        </div>
    )
}

export default LoadingApp