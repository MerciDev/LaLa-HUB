import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'

import { sfx } from '../utils/audioManager'

interface VideoSettingsModalProps {
    visible: boolean
    onClose: () => void
    onSave: (url: string, volume: number) => void
    initialUrl?: string
    initialVolume?: number
}

const VideoSettingsModal: React.FC<VideoSettingsModalProps> = ({ visible, onClose, onSave, initialUrl = '', initialVolume = 0 }) => {
    const [url, setUrl] = useState(initialUrl)
    const [volume, setVolume] = useState(initialVolume)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (visible) {
            setUrl(initialUrl || '')
            setVolume(initialVolume ?? 0)
            setTimeout(() => {
                inputRef.current?.focus()
                inputRef.current?.select()
            }, 100)
        }
    }, [visible, initialUrl, initialVolume])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!visible) return
            if (e.key === 'Escape') {
                sfx.cancel()
                onClose()
            } else if (e.key === 'Enter') {
                e.preventDefault()
                sfx.confirm()
                onSave(url, volume)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [visible, url, volume, onClose, onSave])

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => { sfx.cancel(); onClose(); }}
                >
                    <motion.div
                        className="modal island"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        style={{ padding: '24px', width: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon icon="mynaui:video" /> Ajustes de Vídeo Nativo
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>URL del vídeo (.mp4, .webm)</label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                placeholder="https://ejemplo.com/video.mp4"
                                style={{
                                    background: 'var(--bg-input)',
                                    color: 'var(--text)',
                                    border: '1px solid var(--border)',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    outline: 'none',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Volumen</span>
                                <span>{Math.round(volume * 100)}%</span>
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={volume}
                                onChange={e => setVolume(parseFloat(e.target.value))}
                                style={{
                                    width: '100%',
                                    accentColor: 'var(--accent)'
                                }}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                            <button
                                className="button-secondary"
                                onClick={() => { sfx.cancel(); onClose(); }}
                                style={{ padding: '10px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                className="button-primary"
                                onClick={() => { sfx.confirm(); onSave(url, volume); }}
                                style={{ padding: '10px 16px', borderRadius: '8px', background: 'var(--accent)', border: 'none', color: '#fff', cursor: 'pointer' }}
                            >
                                Guardar
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default VideoSettingsModal
