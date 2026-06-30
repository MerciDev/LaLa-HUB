import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { Icon } from '@iconify/react'
import { UserPublicProfile } from '../../../../../shared/types'
import GameDetailsModal from './GameDetailsModal'

interface UserProfileModalProps {
    user: {
        id: string
        username: string
        avatarUrl?: string
        status?: string
        statusText?: string
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

function UserProfileModal({ user, onClose }: UserProfileModalProps) {
    const [profile, setProfile] = useState<UserPublicProfile>({
        id: user.id,
        username: user.username || 'Usuario',
        avatarUrl: user.avatarUrl || '',
        status: (user.status as any) || 'offline',
        statusText: user.statusText || 'Desconectado',
        playtimes: []
    })
    const [loading, setLoading] = useState(true)
    const [dominantColor, setDominantColor] = useState<string>('var(--accent-color, #e60012)')
    const [selectedGame, setSelectedGame] = useState<any | null>(null)

    useEffect(() => {
        if (!profile.avatarUrl) return
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        
        // Use a CORS proxy to ensure we can read the image data without tainting the canvas
        const isExternal = profile.avatarUrl.startsWith('http') && !profile.avatarUrl.includes('supabase') && !profile.avatarUrl.includes('localhost')
        img.src = isExternal 
            ? `https://api.allorigins.win/raw?url=${encodeURIComponent(profile.avatarUrl)}`
            : profile.avatarUrl

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                if (!ctx) return
                // Downscale for performance
                canvas.width = 64
                canvas.height = 64
                ctx.drawImage(img, 0, 0, 64, 64)
                const data = ctx.getImageData(0, 0, 64, 64).data
                let r = 0, g = 0, b = 0, count = 0
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] > 0) { // ignore transparent
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
                console.error('[UserProfileModal] Canvas taint error extracting color:', err)
            }
        }
        
        img.onerror = () => {
            console.error('[UserProfileModal] Failed to load image via proxy for color extraction')
        }
    }, [profile.avatarUrl])

    useEffect(() => {
        setLoading(true)
        window.api?.social?.getUserProfile(user.id)
            .then(res => {
                if (res?.success && res.data) {
                    setProfile(prev => ({
                        ...prev,
                        ...res.data,
                        username: res.data.username || prev.username,
                        avatarUrl: res.data.avatarUrl || prev.avatarUrl,
                        playtimes: res.data.playtimes || []
                    }))
                }
            })
            .catch(err => console.error('[UserProfileModal] Error fetching profile:', err))
            .finally(() => setLoading(false))
    }, [user.id])

    const totalMinutes = profile.playtimes.reduce((acc, curr) => acc + (curr.minutes || 0), 0)

    const modalContent = (
        <div className="ag-dialog-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999999, padding: '24px', animation: 'fadeIn 0.2s ease-out'
        }}>
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}>
                    <Icon icon="mynaui:loader" className="spin" style={{ fontSize: '64px', color: 'var(--accent-color, #e60012)', marginBottom: '24px' }} />
                    <div style={{ color: '#fff', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>Conectando...</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '4px' }}>Obteniendo datos del jugador</div>
                </div>
            ) : (
                <div className="ag-dialog" onClick={e => e.stopPropagation()} style={{
                    width: '800px', maxWidth: '95vw', maxHeight: '90vh',
                    background: 'linear-gradient(145deg, #18181b 0%, #0f0f11 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    {/* Banner & Header */}
                    <div style={{
                        position: 'relative', height: '180px',
                        ...(profile.bannerUrl
                            ? (profile.bannerUrl.startsWith('linear-gradient')
                                ? { background: profile.bannerUrl }
                                : { background: `url("${profile.bannerUrl}") center / cover` })
                            : { background: `linear-gradient(135deg, ${dominantColor} 0%, #0f0f11 100%)` }),
                        overflow: 'hidden', transition: 'background 0.5s ease'
                    }}>
                        <div style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)'
                        }} />
                        <button onClick={onClose} style={{
                            position: 'absolute', top: '20px', right: '20px',
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'background 0.2s', zIndex: 10
                        }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}>
                            <Icon icon="mynaui:x" style={{ fontSize: '24px' }} />
                        </button>
                    </div>

                    {/* Profile Info Bar */}
                    <div style={{ padding: '0 32px 24px 32px', display: 'flex', alignItems: 'flex-end', gap: '24px', marginTop: '-60px', position: 'relative', zIndex: 5 }}>
                        <div style={{ position: 'relative' }}>
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="" style={{
                                    width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover',
                                    border: '4px solid #18181b', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                    background: '#27272a'
                                }} />
                            ) : (
                                <div style={{
                                    width: '120px', height: '120px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
                                    border: '4px solid #18181b', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon icon="mynaui:user" style={{ fontSize: '56px', color: 'rgba(255,255,255,0.7)' }} />
                                </div>
                            )}
                            <span style={{
                                position: 'absolute', bottom: '8px', right: '8px', width: '20px', height: '20px',
                                borderRadius: '50%', background: profile.status === 'online' || profile.status === 'in-game' ? '#2ec4b6' : profile.status === 'away' ? '#ffb703' : profile.status === 'dnd' ? '#e63946' : '#6c757d',
                                border: '4px solid #18181b', boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                            }} />
                        </div>

                        <div style={{ flex: 1, paddingBottom: '8px' }}>
                            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                                {profile.username}
                            </h2>
                            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: profile.status === 'online' || profile.status === 'in-game' ? '#2ec4b6' : profile.status === 'away' ? '#ffb703' : profile.status === 'dnd' ? '#e63946' : '#6c757d' }} />
                                {(() => {
                                    if (profile.statusText && profile.statusText !== 'Desconectado' && profile.statusText !== 'En línea' && profile.statusText !== 'Explorando el Hub') return profile.statusText
                                    if (profile.status === 'online' || profile.status === 'in-game') return 'En línea'
                                    if (profile.status === 'away') return 'Ausente'
                                    if (profile.status === 'dnd') return 'No molestar'
                                    return 'Desconectado'
                                })()}
                            </div>
                        </div>

                        {/* Stats Badges */}
                        <div style={{ display: 'flex', gap: '12px', paddingBottom: '8px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px', borderRadius: '14px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>{profile.playtimes.length}</div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Juegos</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px', borderRadius: '14px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-color, #e60012)' }}>{formatPlaytime(totalMinutes)}</div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>Tiempo Total</div>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div style={{ padding: '0 32px 32px 32px', flex: 1, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon icon="mynaui:gamepad" style={{ color: 'var(--accent-color, #e60012)' }} />
                                Actividad Reciente
                            </h3>
                        </div>

                        {profile.playtimes.length === 0 ? (
                            <div style={{
                                padding: '48px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)',
                                border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px'
                            }}>
                                <Icon icon="mynaui:ghost" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.2)', marginBottom: '12px' }} />
                                <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Sin actividad pública</div>
                                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', maxWidth: '400px', margin: '0 auto' }}>
                                    Aún no se han registrado tiempos de juego o el usuario tiene su actividad sincronizada en privado.
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
                                {profile.playtimes.map((p, idx) => (
                                    <div key={idx} onClick={() => setSelectedGame(p)} style={{
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                                        transition: 'transform 0.2s, box-shadow 0.2s', position: 'relative', cursor: 'pointer'
                                    }} onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-4px)'
                                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.4)'
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                                    }} onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'none'
                                        e.currentTarget.style.boxShadow = 'none'
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                                    }}>
                                        {/* Cover Image */}
                                        <div style={{ aspectRatio: '3/4', background: '#202024', position: 'relative', overflow: 'hidden' }}>
                                            {p.imageUrl ? (
                                                <img src={p.imageUrl} alt={p.gameName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)' }}>
                                                    <Icon icon="mynaui:gamepad" style={{ fontSize: '36px', color: 'rgba(255,255,255,0.2)', marginBottom: '8px' }} />
                                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.gameName}</span>
                                                </div>
                                            )}
                                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%)' }} />
                                            
                                            {/* Platform Pill */}
                                            <div style={{
                                                position: 'absolute', top: '10px', right: '10px',
                                                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                padding: '4px 8px', borderRadius: '6px',
                                                fontSize: '10px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px'
                                            }}>
                                                {p.platform || 'PC'}
                                            </div>

                                            {/* Time Badge Over Image */}
                                            <div style={{
                                                position: 'absolute', bottom: '10px', left: '10px', right: '10px',
                                                display: 'flex', alignItems: 'center', gap: '6px', color: '#fff'
                                            }}>
                                                <Icon icon="mynaui:clock" style={{ fontSize: '14px', color: 'var(--accent-color, #e60012)' }} />
                                                <span style={{ fontSize: '12px', fontWeight: 700 }}>{formatPlaytime(p.minutes)}</span>
                                            </div>
                                        </div>

                                        {/* Game Title */}
                                        <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', flex: 1, display: 'flex', alignItems: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={p.gameName}>
                                                {p.gameName || 'Desconocido'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {selectedGame && (
                <GameDetailsModal game={selectedGame} onClose={() => setSelectedGame(null)} />
            )}
        </div>
    )

    return ReactDOM.createPortal(modalContent, document.body)
}

export default UserProfileModal

