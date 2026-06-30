import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { Icon } from '@iconify/react'
import { sfx } from '../../utils/audioManager'

interface GameDetailsModalProps {
    game: {
        slotId?: string
        gameName: string
        platform: string
        minutes: number
        imageUrl: string | null
    }
    onClose: () => void
}

function formatPlaytime(minutes: number): string {
    if (!minutes || minutes <= 0) return '0 min'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours} h`
    return `${hours} h ${mins} min`
}

function GameDetailsModal({ game, onClose }: GameDetailsModalProps) {
    const [dominantColor, setDominantColor] = useState<string>('var(--accent-color, #e60012)')
    const [loadingDetails, setLoadingDetails] = useState<boolean>(true)
    const [gameInfo, setGameInfo] = useState<any>(null)
    const [friendsPlayed, setFriendsPlayed] = useState<any[]>([])
    const [myPlaytimeMinutes, setMyPlaytimeMinutes] = useState<number>(0)

    useEffect(() => {
        let isMounted = true
        async function fetchDetails() {
            setLoadingDetails(true)
            try {
                if (window.api?.social?.getGameModalDetails) {
                    const res = await window.api.social.getGameModalDetails(game.gameName, game.slotId)
                    if (isMounted && res.success && res.data) {
                        setGameInfo(res.data.gameInfo)
                        setFriendsPlayed(res.data.friendsWhoPlayed || [])
                        setMyPlaytimeMinutes(res.data.myPlaytimeMinutes || 0)
                    }
                }
            } catch (err) {
                console.error('[GameDetailsModal] Error loading game info:', err)
            } finally {
                if (isMounted) setLoadingDetails(false)
            }
        }
        fetchDetails()
        return () => { isMounted = false }
    }, [game.gameName, game.slotId])

    useEffect(() => {
        if (!game.imageUrl) return
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        
        const isExternal = game.imageUrl.startsWith('http') && !game.imageUrl.includes('supabase') && !game.imageUrl.includes('localhost')
        img.src = isExternal 
            ? `https://api.allorigins.win/raw?url=${encodeURIComponent(game.imageUrl)}`
            : game.imageUrl

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                if (!ctx) return
                canvas.width = 64
                canvas.height = 64
                ctx.drawImage(img, 0, 0, 64, 64)
                const data = ctx.getImageData(0, 0, 64, 64).data
                let r = 0, g = 0, b = 0, count = 0
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] > 0) {
                        r += data[i]
                        g += data[i + 1]
                        b += data[i + 2]
                        count++
                    }
                }
                if (count > 0) {
                    setDominantColor(`rgb(${Math.floor(r / count)}, ${Math.floor(g / count)}, ${Math.floor(b / count)})`)
                }
            } catch (err) {
                console.error('[GameDetailsModal] Canvas taint error extracting color:', err)
            }
        }
    }, [game.imageUrl])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                sfx.cancel()
                onClose()
            }
        }
        const handlePanelMove = (e: any) => {
            if (e.detail === 'back' || e.detail === 'escape') {
                sfx.cancel()
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('panel-move', handlePanelMove)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('panel-move', handlePanelMove)
        }
    }, [onClose])

    const handleClose = () => {
        sfx.cancel()
        onClose()
    }

    const releaseYear = gameInfo?.release_date ? new Date(gameInfo.release_date).getFullYear() : (gameInfo?.releaseDate ? new Date(gameInfo.releaseDate).getFullYear() : (gameInfo?.year || null))
    const description = gameInfo?.summary || gameInfo?.description || 'No hay descripción detallada registrada para este título en la base de datos de LaLa.'
    const bannerImage = gameInfo?.images?.h_grid || gameInfo?.images?.background || (gameInfo?.images?.screenshots && gameInfo?.images?.screenshots[0]) || game.imageUrl

    const modalContent = (
        <div className="ag-dialog-overlay" onClick={handleClose} style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999999, padding: '24px', animation: 'fadeIn 0.2s ease-out'
        }}>
            {loadingDetails ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <Icon icon="mynaui:spinner" className="animate-spin" style={{ fontSize: '48px', color: 'var(--accent-color, #e60012)' }} />
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600 }}>Cargando datos del juego...</div>
                </div>
            ) : (
                <div className="ag-dialog" onClick={e => e.stopPropagation()} style={{
                width: '880px', maxWidth: '95vw', maxHeight: '90vh',
                background: 'linear-gradient(145deg, #18181b 0%, #0f0f11 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
                animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                {/* Banner / Header */}
                <div style={{
                    position: 'relative', height: '260px', flexShrink: 0,
                    background: bannerImage ? `url("${bannerImage}") center 20% / cover` : `linear-gradient(135deg, ${dominantColor} 0%, #0f0f11 100%)`,
                    overflow: 'hidden', transition: 'background 0.5s ease'
                }}>
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, #18181b 0%, rgba(24,24,27,0.5) 60%, transparent 100%)'
                    }} />
                    
                    <button onClick={handleClose} style={{
                        position: 'absolute', top: '20px', right: '20px',
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.2s', zIndex: 10
                    }} onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                        e.currentTarget.style.transform = 'scale(1.1)'
                    }} onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.5)'
                        e.currentTarget.style.transform = 'none'
                    }}>
                        <Icon icon="mynaui:x" style={{ fontSize: '24px' }} />
                    </button>
                    
                    <div style={{ position: 'absolute', bottom: '24px', left: '32px', right: '32px', display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
                        {/* Game Cover/Icon */}
                        <div style={{
                            width: '130px', height: '180px', borderRadius: '14px',
                            background: '#27272a', border: '3px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.7)', overflow: 'hidden',
                            flexShrink: 0, transform: 'translateY(15px)'
                        }}>
                            {game.imageUrl ? (
                                <img src={game.imageUrl} alt={game.gameName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)' }}>
                                    <Icon icon="mynaui:gamepad" style={{ fontSize: '56px', color: 'rgba(255,255,255,0.2)' }} />
                                </div>
                            )}
                        </div>
                        
                        {/* Title and Badge */}
                        <div style={{ flex: 1, paddingBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <div style={{
                                    padding: '4px 10px', borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
                                    fontSize: '11px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    {game.platform || 'PC'}
                                </div>
                                {releaseYear && (
                                    <div style={{
                                        padding: '4px 10px', borderRadius: '8px',
                                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                                        fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.8)',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        Lanzamiento: {releaseYear}
                                    </div>
                                )}
                            </div>
                            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                                {game.gameName || 'Desconocido'}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div style={{ padding: '36px 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: '28px', overflowY: 'auto', flex: 1 }}>
                    {/* Top Stats Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                            padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px'
                        }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon icon="gg:sand-clock" style={{ fontSize: '28px', color: dominantColor }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Tu tiempo jugado</div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                                    {formatPlaytime(myPlaytimeMinutes)}
                                </div>
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                            padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px'
                        }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon icon="mynaui:users" style={{ fontSize: '28px', color: '#2ec4b6' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Amigos que lo juegan</div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                                    {friendsPlayed.length}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description Section */}
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon icon="mynaui:book-open" style={{ color: dominantColor }} />
                            Descripción del Juego
                        </h3>
                        <div style={{
                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                            padding: '18px', borderRadius: '16px', fontSize: '14px', color: 'rgba(255,255,255,0.7)',
                            lineHeight: '1.6'
                        }}>
                            {description}
                        </div>
                    </div>

                    {/* Friends Who Played Section */}
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon icon="mynaui:users-group" style={{ color: '#2ec4b6' }} />
                            Actividad entre tus amigos
                        </h3>
                        {friendsPlayed.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Ningún otro amigo ha registrado tiempo de juego en este título.</div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                                {friendsPlayed.map((f) => (
                                    <div key={f.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px', background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px'
                                    }}>
                                        {f.avatarUrl ? (
                                            <img src={f.avatarUrl} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Icon icon="mynaui:user" style={{ fontSize: '20px', color: 'rgba(255,255,255,0.6)' }} />
                                            </div>
                                        )}
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.username}</div>
                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                <Icon icon="mynaui:clock" style={{ color: 'var(--accent-color, #e60012)' }} />
                                                {formatPlaytime(f.minutes)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            ` }} />
        </div>
    )

    return ReactDOM.createPortal(modalContent, document.body)
}

export default GameDetailsModal
