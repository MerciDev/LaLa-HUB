import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { sfx } from '../utils/audioManager'

interface AddIframeModalProps {
    visible: boolean
    onClose: () => void
    onSave: (url: string) => void
    initialUrl?: string
}

const AddIframeModal: React.FC<AddIframeModalProps> = ({ visible, onClose, onSave, initialUrl = '' }) => {
    const [url, setUrl] = useState(initialUrl)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (visible) {
            setUrl(initialUrl || '')
            setTimeout(() => {
                inputRef.current?.focus()
                inputRef.current?.select()
            }, 100)
        }
    }, [visible, initialUrl])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!visible) return
            if (e.key === 'Escape') {
                sfx.cancel()
                onClose()
            } else if (e.key === 'Enter') {
                e.preventDefault()
                sfx.confirm()
                const match = url.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                let finalUrl = match ? match[1] : url;
                
                try {
                    if (finalUrl.includes('youtube.com/embed/')) {
                        const urlObj = new URL(finalUrl.startsWith('http') ? finalUrl : `https://${finalUrl.replace(/^\/\//, '')}`);
                        urlObj.searchParams.set('autoplay', '1');
                        urlObj.searchParams.set('mute', '1');
                        urlObj.searchParams.set('loop', '1');
                        urlObj.searchParams.set('controls', '0');
                        
                        const pathParts = urlObj.pathname.split('/');
                        const videoId = pathParts[pathParts.length - 1];
                        if (!urlObj.searchParams.has('playlist') && videoId) {
                            urlObj.searchParams.set('playlist', videoId);
                        }
                        
                        finalUrl = urlObj.toString();
                    }
                } catch (err) {
                    console.error('Error procesando URL de YouTube:', err);
                }

                onSave(finalUrl)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [visible, url, onClose, onSave])

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
                        style={{ padding: '24px', width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon icon="mynaui:globe" /> Editar Iframe Web
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>URL o código &lt;iframe&gt; (Youtube, Twitch, etc.)</label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                placeholder='<iframe src="https://www.youtube.com/embed/..." ...'
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
                                onClick={() => {
                                    sfx.confirm();
                                    const match = url.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                                    let finalUrl = match ? match[1] : url;
                                    
                                    try {
                                        if (finalUrl.includes('youtube.com/embed/')) {
                                            // Ensure URL has protocol to parse correctly
                                            const urlObj = new URL(finalUrl.startsWith('http') ? finalUrl : `https://${finalUrl.replace(/^\/\//, '')}`);
                                            urlObj.searchParams.set('autoplay', '1');
                                            urlObj.searchParams.set('mute', '1');
                                            urlObj.searchParams.set('loop', '1');
                                            urlObj.searchParams.set('controls', '0'); // Opcional, quita los controles
                                            
                                            // YouTube loop requires the playlist parameter set to the video ID
                                            const pathParts = urlObj.pathname.split('/');
                                            const videoId = pathParts[pathParts.length - 1];
                                            if (!urlObj.searchParams.has('playlist') && videoId) {
                                                urlObj.searchParams.set('playlist', videoId);
                                            }
                                            
                                            finalUrl = urlObj.toString();
                                        }
                                    } catch (e) {
                                        console.error('Error procesando URL de YouTube:', e);
                                    }

                                    onSave(finalUrl);
                                }}
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

export default AddIframeModal
