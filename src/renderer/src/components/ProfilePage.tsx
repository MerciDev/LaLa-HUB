import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import { AuthState, AuthResult, HomeSlot } from '../../../shared/types'
import { sfx } from '../utils/audioManager'
import SidePanel, { ConsolePanelTab } from './SidePanel'
import './ProfilePage.css'

interface ProfilePageProps {
    visible: boolean
    authState: AuthState
    onLogin: (result: AuthResult) => void
    onClose: () => void
    onOpenAddGame?: (editSlot?: HomeSlot) => void
}

const LOGGED_IN_TABS: ConsolePanelTab[] = [
    { id: 'overview', label: 'Vista General', icon: 'mynaui:user', description: 'Tu tarjeta de jugador y estado en la nube' },
    { id: 'security', label: 'Cuenta y Seguridad', icon: 'mynaui:shield-check', description: 'Personaliza tu identidad o gestiona tu sesión activa' },
    { id: 'library', label: 'Gestionar Biblioteca', icon: 'mynaui:folder', description: 'Opciones de sincronización y descubrimiento de juegos' }
]

const GUEST_TABS: ConsolePanelTab[] = [
    { id: 'login', label: 'Iniciar Sesión', icon: 'mynaui:log-in', description: 'Accede a tu biblioteca sincronizada en la nube' },
    { id: 'register', label: 'Crear Cuenta', icon: 'mynaui:user-plus', description: 'Regístrate gratis para respaldar tus partidas en línea' }
]

function ProfilePage({ visible, authState, onLogin, onClose, onOpenAddGame }: ProfilePageProps): React.JSX.Element {
    const isLoggedIn = authState.isLoggedIn
    const user = authState.user

    const [tab, setTab] = useState<string>('overview')
    const [focusArea, setFocusArea] = useState<'nav' | 'content' | 'nav_close' | 'nav_save' | 'footer'>('nav')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [isInputEditing, setIsInputEditing] = useState(false)

    // Library states
    const [librarySlots, setLibrarySlots] = useState<HomeSlot[]>([])
    const [libSearch, setLibSearch] = useState('')
    const [libFilterConsole, setLibFilterConsole] = useState('todas')

    // Form states
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [newUsername, setNewUsername] = useState('')
    const [newAvatarUrl, setNewAvatarUrl] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (visible && tab === 'library') {
            window.api.slots?.getAll?.().then(res => setLibrarySlots(res || []))
        }
    }, [visible, tab])



    const consolesList = React.useMemo(() => {
        const set = new Set<string>()
        librarySlots.forEach(s => {
            if (!s.game) return
            const name = s.game.platform?.name || s.game.emulator?.name || 'PC'
            set.add(name)
        })
        return ['todas', ...Array.from(set)]
    }, [librarySlots])

    const filteredLibSlots = React.useMemo(() => {
        return librarySlots.filter(s => {
            if (!s.game) return false
            if (libFilterConsole !== 'todas') {
                const cName = s.game.platform?.name || s.game.emulator?.name || 'PC'
                if (cName !== libFilterConsole) return false
            }
            if (libSearch) {
                const q = libSearch.toLowerCase()
                const title = (s.label || s.game.name || '').toLowerCase()
                if (!title.includes(q)) return false
            }
            return true
        })
    }, [librarySlots, libFilterConsole, libSearch])

    const activeTabs = isLoggedIn ? LOGGED_IN_TABS : GUEST_TABS

    const stateRef = useRef({
        visible, isLoggedIn, tab, focusArea, selectedIndex, isInputEditing, activeTabs, newUsername, newAvatarUrl, email, password, username
    })
    useEffect(() => {
        stateRef.current = { visible, isLoggedIn, tab, focusArea, selectedIndex, isInputEditing, activeTabs, newUsername, newAvatarUrl, email, password, username }
    })

    // Reset when opening panel or auth changes
    useEffect(() => {
        if (visible) {
            setFocusArea('nav')
            setSelectedIndex(0)
            setError(null)
            setTab(isLoggedIn ? 'overview' : 'login')
            if (user?.username) setNewUsername(user.username)
            if (user?.avatarUrl) setNewAvatarUrl(user.avatarUrl)
        }
    }, [visible, isLoggedIn, user])

    // Reset scroll & selection when changing tabs
    useEffect(() => {
        const container = document.querySelector('.console-panel__content-body')
        if (container) container.scrollTop = 0
        setSelectedIndex(0)
        setError(null)
    }, [tab])

    // Input typing focus detection
    useEffect(() => {
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName) && target.classList.contains('profile-input')) {
                setIsInputEditing(true)
            }
        }
        const handleFocusOut = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName) && target.classList.contains('profile-input')) {
                setIsInputEditing(false)
            }
        }
        window.addEventListener('focusin', handleFocusIn)
        window.addEventListener('focusout', handleFocusOut)
        return () => {
            window.removeEventListener('focusin', handleFocusIn)
            window.removeEventListener('focusout', handleFocusOut)
        }
    }, [])

    const handleAuth = useCallback(async (authType: 'login' | 'register') => {
        const curEmail = stateRef.current.email
        const curPass = stateRef.current.password
        const curUser = stateRef.current.username

        if (!curEmail || !curPass || (authType === 'register' && !curUser)) {
            setError('Por favor, completa todos los campos requeridos')
            sfx.error()
            return
        }
        setLoading(true)
        setError(null)
        try {
            const result: AuthResult = authType === 'login'
                ? await window.api.auth.login({ email: curEmail, password: curPass })
                : await window.api.auth.register({ email: curEmail, password: curPass, username: curUser })
            if (result.success) {
                sfx.confirm()
                onLogin(result)
                setTab('overview')
                setEmail('')
                setPassword('')
                setUsername('')
            } else {
                setError(result.error || 'Credenciales de acceso incorrectas')
                sfx.error()
            }
        } catch {
            setError('Error de conexión con el servidor de LaLa Cloud')
            sfx.error()
        } finally {
            setLoading(false)
        }
    }, [onLogin])

    const handleLogout = useCallback(async () => {
        sfx.confirm()
        setLoading(true)
        try {
            await window.api.auth.logout()
            onLogin({ success: true })
            setTab('login')
        } finally {
            setLoading(false)
        }
    }, [onLogin])

    const handleUpdateProfile = useCallback(async () => {
        const targetUsername = stateRef.current.newUsername.trim()
        const targetAvatarUrl = stateRef.current.newAvatarUrl.trim()
        if (!targetUsername) {
            setError('Ingresa un nombre de usuario válido')
            sfx.error()
            return
        }
        setLoading(true)
        setError(null)
        try {
            const updateData: { username: string; avatarUrl?: string } = { username: targetUsername }
            if (targetAvatarUrl) updateData.avatarUrl = targetAvatarUrl
            
            const result = await window.api.auth.updateProfile(updateData)
            if (result.success) {
                sfx.confirm()
                setTab('overview')
            } else {
                setError(result.error || 'No se pudo actualizar el perfil')
                sfx.error()
            }
        } catch {
            setError('Error de conexión al actualizar el perfil')
            sfx.error()
        } finally {
            setLoading(false)
        }
    }, [onLogin])

    const handleSyncPlatforms = async () => {
        setLoading(true)
        setError(null)
        try {
            await window.api.platforms.sync()
            sfx.confirm()
            setError('Catálogo de plataformas sincronizado correctamente')
        } catch {
            sfx.error()
            setError('Error al sincronizar plataformas')
        } finally {
            setLoading(false)
        }
    }

    const handleForceSync = async () => {
        if (user?.accountType === 'standard') return
        setLoading(true)
        setError(null)
        try {
            await window.api.sync.trigger()
            sfx.confirm()
            setError('Sincronización de guardados iniciada en segundo plano')
        } catch {
            sfx.error()
            setError('Error al iniciar la sincronización de guardados')
        } finally {
            setLoading(false)
        }
    }

    // Keyboard & Gamepad navigation
    useEffect(() => {
        if (!visible) return
        const handler = (e: CustomEvent) => {
            const action = e.detail
            const { visible: vis, tab: curTab, focusArea: area, selectedIndex: idx, isInputEditing: editing, activeTabs: tabs } = stateRef.current
            if (!vis || editing) return

            if (area === 'nav') {
                const tabIdx = tabs.findIndex(t => t.id === curTab)
                if (action === 'up') {
                    if (tabIdx > 0) { sfx.navigate(); setTab(tabs[tabIdx - 1].id) }
                } else if (action === 'down') {
                    if (tabIdx < tabs.length - 1) { sfx.navigate(); setTab(tabs[tabIdx + 1].id) }
                    else { sfx.navigate(); setFocusArea('nav_close') }
                } else if (action === 'right' || action === 'select') {
                    sfx.navigate(); setFocusArea('content'); setSelectedIndex(0)
                } else if (action === 'back') {
                    sfx.cancel(); onClose()
                }
                return
            }

            if (area === 'nav_close') {
                if (action === 'up') {
                    sfx.navigate(); setFocusArea('nav'); setTab(tabs[tabs.length - 1].id)
                } else if (action === 'select') {
                    sfx.cancel(); onClose()
                } else if (action === 'back' || action === 'escape') {
                    sfx.navigate(); setFocusArea('nav')
                }
                return
            }

            if (area === 'content') {
                let maxCount = 2
                if (curTab === 'overview') maxCount = 2
                if (curTab === 'security') maxCount = 4
                if (curTab === 'library') maxCount = 2 + filteredLibSlots.length
                if (curTab === 'login') maxCount = 4
                if (curTab === 'register') maxCount = 5

                if (action === 'up') {
                    if (idx > 0) { sfx.navigate(); setSelectedIndex(idx - 1) }
                } else if (action === 'down') {
                    if (idx < maxCount - 1) { sfx.navigate(); setSelectedIndex(idx + 1) }
                } else if (action === 'left' || action === 'back' || action === 'escape') {
                    sfx.navigate(); setFocusArea('nav')
                } else if (action === 'select') {
                    if (curTab === 'overview') {
                        if (idx === 0) { sfx.confirm(); setTab('security'); setSelectedIndex(0) }
                        else if (idx === 1) { handleLogout() }
                    } else if (curTab === 'security') {
                        if (idx === 0) { sfx.confirm(); document.getElementById('profile-input-user')?.focus() }
                        else if (idx === 1) { sfx.confirm(); document.getElementById('profile-input-avatar')?.focus() }
                        else if (idx === 2) { handleUpdateProfile() }
                        else if (idx === 3) { handleLogout() }
                    } else if (curTab === 'library') {
                        if (idx === 0) { sfx.confirm(); (document.querySelector('.profile-input') as HTMLInputElement)?.focus() }
                        else if (idx > 1) {
                            const slot = filteredLibSlots[idx - 2]
                            if (slot) {
                                sfx.confirm(); window.api.gridItemControl('run-game', slot); onClose()
                            }
                        }
                    } else if (curTab === 'login') {
                        if (idx === 0) { sfx.confirm(); document.getElementById('profile-input-login-email')?.focus() }
                        else if (idx === 1) { sfx.confirm(); document.getElementById('profile-input-login-pass')?.focus() }
                        else if (idx === 2) { handleAuth('login') }
                        else if (idx === 3) { sfx.navigate(); setTab('register'); setSelectedIndex(0); setError(null) }
                    } else if (curTab === 'register') {
                        if (idx === 0) { sfx.confirm(); document.getElementById('profile-input-reg-user')?.focus() }
                        else if (idx === 1) { sfx.confirm(); document.getElementById('profile-input-reg-email')?.focus() }
                        else if (idx === 2) { sfx.confirm(); document.getElementById('profile-input-reg-pass')?.focus() }
                        else if (idx === 3) { handleAuth('register') }
                        else if (idx === 4) { sfx.navigate(); setTab('login'); setSelectedIndex(0); setError(null) }
                    }
                }
            }
        }
        window.addEventListener('panel-move', handler as EventListener)
        return () => window.removeEventListener('panel-move', handler as EventListener)
    }, [visible, onClose, handleAuth, handleLogout, handleUpdateProfile, filteredLibSlots])

    // Auto-scroll inside content area
    useEffect(() => {
        if (focusArea !== 'content') return
        const container = document.querySelector('.console-panel__content-body') as HTMLElement
        if (!container) return
        if (selectedIndex === 0) { container.scrollTo({ top: 0, behavior: 'smooth' }); return }
        const timer = setTimeout(() => {
            const el = container.querySelector('.focused') as HTMLElement
            if (el) {
                const crect = container.getBoundingClientRect()
                const erect = el.getBoundingClientRect()
                const targetScroll = container.scrollTop + (erect.top - crect.top) - (container.offsetHeight / 2) + (erect.height / 2)
                container.scrollTo({ top: targetScroll, behavior: 'smooth' })
            }
        }, 30)
        return () => clearTimeout(timer)
    }, [selectedIndex, focusArea, tab])

    if (!visible) return <></>

    const renderOverviewTab = () => (
        <div className="profile-container">
            <div className="profile-hero-card">
                <div className="profile-avatar-wrapper">
                    <div className="profile-avatar">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" />
                        ) : (
                            <Icon icon="mynaui:user" />
                        )}
                    </div>
                    <div className="profile-status-badge">
                        <span className="profile-status-dot" />
                        En línea
                    </div>
                </div>
                <div className="profile-user-details">
                    <h2 className="profile-user-name">{user?.username || 'Gamer'}</h2>
                    <span className="profile-user-email">
                        <Icon icon="mynaui:mail" />
                        {user?.email || 'sin-correo@lalahub.app'}
                    </span>
                    {user?.createdAt && (
                        <span className="profile-user-since">
                            <Icon icon="mynaui:calendar" />
                            Miembro desde {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                    )}
                </div>
            </div>

            <div className="profile-stats-grid">
                <div className={`profile-stat-card ${(!user?.accountType || user.accountType === 'standard') ? 'profile-stat-card--disabled' : ''}`}>
                    <div className="profile-stat-icon profile-stat-icon--cloud">
                        <Icon icon="mynaui:save" />
                    </div>
                    <div className="profile-stat-info">
                        <span className="profile-stat-label">Sincronización de Guardados</span>
                        <span className="profile-stat-value">{(!user?.accountType || user.accountType === 'standard') ? 'Desactivada' : 'Activada'}</span>
                    </div>
                </div>

                <div className={`profile-stat-card ${(!user?.accountType || user.accountType === 'standard') ? 'profile-stat-card--disabled' : ''}`}>
                    <div className="profile-stat-icon profile-stat-icon--games">
                        <Icon icon="mynaui:book-open" />
                    </div>
                    <div className="profile-stat-info">
                        <span className="profile-stat-label">Sincronización de Biblioteca</span>
                        <span className="profile-stat-value">{(!user?.accountType || user.accountType === 'standard') ? 'Desactivada' : 'Activada'}</span>
                    </div>
                </div>

                <div className="profile-stat-card">
                    <div className="profile-stat-icon profile-stat-icon--sync">
                        <Icon icon="mynaui:shield-check" />
                    </div>
                    <div className="profile-stat-info">
                        <span className="profile-stat-label">Tipo de Cuenta</span>
                        <span className="profile-stat-value" style={{ textTransform: 'capitalize' }}>{user?.accountType || 'standard'}</span>
                    </div>
                </div>
            </div>

            <div className="profile-section-card">
                <div className="profile-section-header">
                    <div className="profile-section-title-wrap">
                        <Icon icon="mynaui:zap" />
                        <span className="profile-section-title">Acciones Rápidas</span>
                    </div>
                </div>
                <p className="profile-section-desc">
                    Modifica tus datos de identidad en la red o cierra sesión en esta consola de manera protegida.
                </p>
                <div className="profile-actions-row">
                    <button
                        className={`profile-btn profile-btn--primary ${focusArea === 'content' && selectedIndex === 0 ? 'focused' : ''}`}
                        onClick={() => { sfx.confirm(); setTab('security'); setSelectedIndex(0) }}
                    >
                        <Icon icon="mynaui:edit-pencil" />
                        Editar Nombre de Usuario
                    </button>
                    <button
                        className={`profile-btn profile-btn--secondary ${focusArea === 'content' && selectedIndex === 1 ? 'focused' : ''}`}
                        onClick={handleLogout}
                        disabled={loading}
                    >
                        <Icon icon="mynaui:log-out" />
                        Cerrar Sesión en PC
                    </button>
                </div>
            </div>
        </div>
    )

    const renderSecurityTab = () => (
        <div className="profile-container">
            <div className="profile-section-card">
                <div className="profile-section-header">
                    <div className="profile-section-title-wrap">
                        <Icon icon="mynaui:user" />
                        <span className="profile-section-title">Identidad Pública</span>
                    </div>
                </div>
                <p className="profile-section-desc">
                    Este es el nombre visible en marcadores, partidas guardadas en red y con tus amigos de LaLa Hub.
                </p>
                <div className="profile-field-group">
                    <label className="profile-field-label">Nombre de usuario</label>
                    <div className={`profile-input-wrap ${focusArea === 'content' && selectedIndex === 0 ? 'focused' : ''}`}>
                        <input
                            id="profile-input-user"
                            className="profile-input"
                            type="text"
                            value={newUsername}
                            onChange={e => setNewUsername(e.target.value)}
                            placeholder="Ingresa tu apodo gamer"
                            onFocus={() => { setFocusArea('content'); setSelectedIndex(0) }}
                        />
                        <Icon icon="mynaui:user" className="profile-input-icon" />
                    </div>
                </div>

                {error && (
                    <div className="profile-alert-error">
                        <Icon icon="mynaui:warning-triangle" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="profile-field-group">
                    <label className="profile-field-label">URL de Imagen de Perfil</label>
                    <div className={`profile-input-wrap ${focusArea === 'content' && selectedIndex === 1 ? 'focused' : ''}`}>
                        <input
                            id="profile-input-avatar"
                            className="profile-input"
                            type="text"
                            value={newAvatarUrl}
                            onChange={e => setNewAvatarUrl(e.target.value)}
                            placeholder="Ej: https://.../avatar.png o media://..."
                            onFocus={() => { setFocusArea('content'); setSelectedIndex(1) }}
                        />
                        <Icon icon="mynaui:image" className="profile-input-icon" />
                    </div>
                </div>

                <div className="profile-actions-row">
                    <button
                        className={`profile-btn profile-btn--primary ${focusArea === 'content' && selectedIndex === 2 ? 'focused' : ''}`}
                        onClick={handleUpdateProfile}
                        disabled={loading}
                    >
                        <Icon icon={loading ? 'mynaui:loader' : 'mynaui:check'} className={loading ? 'profile-spin' : ''} />
                        Guardar Cambios
                    </button>
                </div>
            </div>

            <div className="profile-section-card">
                <div className="profile-section-header">
                    <div className="profile-section-title-wrap">
                        <Icon icon="mynaui:lock-key" />
                        <span className="profile-section-title">Zona de Sesión</span>
                    </div>
                </div>
                <p className="profile-section-desc">
                    Al cerrar sesión dejarás de sincronizar instantáneamente este equipo. Tus partidas permanecerán a salvo en la nube.
                </p>
                <div className="profile-actions-row">
                    <button
                        className={`profile-btn profile-btn--danger ${focusArea === 'content' && selectedIndex === 3 ? 'focused' : ''}`}
                        onClick={handleLogout}
                        disabled={loading}
                    >
                        <Icon icon="mynaui:log-out" />
                        Desconectar Cuenta
                    </button>
                </div>
            </div>
        </div>
    )

    const renderLibraryTab = () => (
        <div className="profile-container">
            <div className="profile-section-card" style={{ paddingBottom: 16 }}>
                <div className="profile-section-header">
                    <div className="profile-section-title-wrap">
                        <Icon icon="mynaui:folder" />
                        <span className="profile-section-title">Gestor de Colección</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="profile-user-since" style={{ margin: 0 }}>{filteredLibSlots.length} Juegos</span>
                        {onOpenAddGame && (
                            <button
                                className="profile-btn profile-btn--primary"
                                style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: 8 }}
                                onClick={() => { sfx.confirm(); onOpenAddGame() }}
                                title="Añadir nuevo juego a la biblioteca"
                            >
                                <Icon icon="mynaui:plus" /> Añadir Juego
                            </button>
                        )}
                    </div>
                </div>

                <div className="profile-field-group" style={{ marginBottom: 12 }}>
                    <div className="profile-input-wrap">
                        <input
                            type="text"
                            className="profile-input"
                            placeholder="Buscar juego por título..."
                            value={libSearch}
                            onChange={(e) => setLibSearch(e.target.value)}
                            onFocus={() => { setFocusArea('content'); setSelectedIndex(0) }}
                        />
                        <Icon icon="mynaui:search" className="profile-input-icon" />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {consolesList.map(c => (
                        <button
                            key={c}
                            className={`profile-btn ${libFilterConsole === c ? 'profile-btn--primary' : 'profile-btn--secondary'}`}
                            style={{ padding: '5px 12px', fontSize: '0.75rem', borderRadius: 20, textTransform: 'capitalize' }}
                            onClick={() => { sfx.navigate(); setLibFilterConsole(c) }}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 4, marginBottom: 16 }}>
                    {filteredLibSlots.length === 0 ? (
                        <p className="profile-section-desc" style={{ textAlign: 'center', padding: '24px 0' }}>No se encontraron juegos con estos filtros.</p>
                    ) : (
                        filteredLibSlots.map((s, idx) => (
                            <div key={s.id} className={`profile-library-item ${focusArea === 'content' && selectedIndex === idx + 2 ? 'focused' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(15, 18, 25, 0.8)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden' }}>
                                {(s.image || s.squareImage) && (
                                    <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: `url("${s.image || s.squareImage}")`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(12px)' }} />
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                                    {s.image || s.squareImage ? (
                                        <div style={{ minWidth: 44, width: 44, height: 44, borderRadius: 10, backgroundImage: `url("${s.squareImage || s.image}")`, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }} />
                                    ) : (
                                        <div style={{ minWidth: 44, width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, rgba(58,134,255,0.2), rgba(58,134,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a86ff', fontSize: 22, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)' }}>
                                            <Icon icon={s.icon || "mynaui:gamepad"} />
                                        </div>
                                    )}
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{s.label || s.game?.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4, color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>{s.game?.platform?.name || s.game?.emulator?.name || 'PC'}</span>
                                            {s.game?.playtimeMinutes ? `${s.game.playtimeMinutes} min jugados` : 'Sin empezar'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0, position: 'relative', zIndex: 1 }}>
                                    <button
                                        className="profile-btn profile-btn--secondary"
                                        style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: 8, background: 'rgba(255,255,255,0.1)' }}
                                        onClick={() => { window.api.gridItemControl('run-game', s); onClose() }}
                                        title="Lanzar juego"
                                    >
                                        <Icon icon="mynaui:play" />
                                    </button>
                                    {onOpenAddGame && (
                                        <button
                                            className="profile-btn profile-btn--secondary"
                                            style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: 8, background: 'rgba(255,255,255,0.1)' }}
                                            onClick={() => { sfx.confirm(); onOpenAddGame(s) }}
                                            title="Editar juego"
                                        >
                                            <Icon icon="mynaui:edit" />
                                        </button>
                                    )}
                                    <button
                                        className="profile-btn profile-btn--danger"
                                        style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: 8 }}
                                        onClick={async () => {
                                            if (window.confirm(`¿Seguro que quieres eliminar ${s.label || s.game?.name}?`)) {
                                                sfx.cancel()
                                                await window.api.slots.remove(s.id)
                                                setLibrarySlots(prev => prev.filter(x => x.id !== s.id))
                                            }
                                        }}
                                        title="Eliminar juego"
                                    >
                                        <Icon icon="mynaui:trash" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Sincronización Cloud & Catálogo:</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className="profile-btn profile-btn--secondary"
                            style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: 8 }}
                            onClick={handleForceSync}
                            disabled={loading || user?.accountType === 'standard'}
                        >
                            <Icon icon="mynaui:cloud-up" /> Subir Guardados
                        </button>
                        <button
                            className="profile-btn profile-btn--secondary"
                            style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: 8 }}
                            onClick={handleSyncPlatforms}
                            disabled={loading}
                        >
                            <Icon icon="mynaui:refresh" /> Sync Consolas
                        </button>
                    </div>
                </div>
                {error && (
                    <div className="profile-alert-error" style={{ marginTop: 12, color: error.includes('Error') ? '#ff8080' : '#80ff80', borderColor: error.includes('Error') ? 'rgba(242, 63, 67, 0.35)' : 'rgba(35, 165, 89, 0.35)', background: error.includes('Error') ? 'rgba(242, 63, 67, 0.12)' : 'rgba(35, 165, 89, 0.12)' }}>
                        <Icon icon={error.includes('Error') ? "mynaui:danger-triangle" : "mynaui:check-circle"} />
                        {error}
                    </div>
                )}
            </div>
        </div>
    )

    const renderLoginTab = () => (
        <div className="profile-container">
            <div className="profile-auth-hero">
                <div className="profile-auth-icon">
                    <Icon icon="mynaui:cloud" />
                </div>
                <h3>Sincroniza tu mundo gaming</h3>
                <p>
                    Inicia sesión en LaLa Hub para respaldar tus partidas guardadas, emuladores e historiales de juego en la nube de manera cifrada e instantánea.
                </p>
            </div>

            <div className="profile-section-card">
                <div className="profile-field-group">
                    <label className="profile-field-label">Correo electrónico</label>
                    <div className={`profile-input-wrap ${focusArea === 'content' && selectedIndex === 0 ? 'focused' : ''}`}>
                        <input
                            id="profile-input-login-email"
                            className="profile-input"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="tucorreo@ejemplo.com"
                            onFocus={() => { setFocusArea('content'); setSelectedIndex(0) }}
                        />
                        <Icon icon="mynaui:mail" className="profile-input-icon" />
                    </div>
                </div>

                <div className="profile-field-group">
                    <label className="profile-field-label">Contraseña</label>
                    <div className={`profile-input-wrap ${focusArea === 'content' && selectedIndex === 1 ? 'focused' : ''}`}>
                        <input
                            id="profile-input-login-pass"
                            className="profile-input"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            onFocus={() => { setFocusArea('content'); setSelectedIndex(1) }}
                        />
                        <Icon icon="mynaui:lock-key" className="profile-input-icon" />
                    </div>
                </div>

                {error && (
                    <div className="profile-alert-error">
                        <Icon icon="mynaui:warning-triangle" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="profile-actions-row">
                    <button
                        className={`profile-btn profile-btn--primary ${focusArea === 'content' && selectedIndex === 2 ? 'focused' : ''}`}
                        onClick={() => handleAuth('login')}
                        disabled={loading}
                        style={{ width: '100%' }}
                    >
                        <Icon icon={loading ? 'mynaui:loader' : 'mynaui:log-in'} className={loading ? 'profile-spin' : ''} />
                        Acceder a mi Cuenta
                    </button>
                    <button
                        className={`profile-btn profile-btn--ghost ${focusArea === 'content' && selectedIndex === 3 ? 'focused' : ''}`}
                        onClick={() => { setTab('register'); setSelectedIndex(0); setError(null); sfx.navigate() }}
                    >
                        ¿Aún no tienes cuenta? Regístrate gratis
                    </button>
                </div>
            </div>
        </div>
    )

    const renderRegisterTab = () => (
        <div className="profile-container">
            <div className="profile-auth-hero">
                <div className="profile-auth-icon">
                    <Icon icon="mynaui:user-plus" />
                </div>
                <h3>Únete a LaLa Cloud</h3>
                <p>
                    Crea una cuenta gratuita en pocos segundos y obtén acceso a respaldo en la nube, marcadores comunitarios y sincronización entre consolas.
                </p>
            </div>

            <div className="profile-section-card">
                <div className="profile-field-group">
                    <label className="profile-field-label">Nombre de usuario</label>
                    <div className={`profile-input-wrap ${focusArea === 'content' && selectedIndex === 0 ? 'focused' : ''}`}>
                        <input
                            id="profile-input-reg-user"
                            className="profile-input"
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="GamerPro2026"
                            onFocus={() => { setFocusArea('content'); setSelectedIndex(0) }}
                        />
                        <Icon icon="mynaui:user" className="profile-input-icon" />
                    </div>
                </div>

                <div className="profile-field-group">
                    <label className="profile-field-label">Correo electrónico</label>
                    <div className={`profile-input-wrap ${focusArea === 'content' && selectedIndex === 1 ? 'focused' : ''}`}>
                        <input
                            id="profile-input-reg-email"
                            className="profile-input"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="tucorreo@ejemplo.com"
                            onFocus={() => { setFocusArea('content'); setSelectedIndex(1) }}
                        />
                        <Icon icon="mynaui:mail" className="profile-input-icon" />
                    </div>
                </div>

                <div className="profile-field-group">
                    <label className="profile-field-label">Contraseña</label>
                    <div className={`profile-input-wrap ${focusArea === 'content' && selectedIndex === 2 ? 'focused' : ''}`}>
                        <input
                            id="profile-input-reg-pass"
                            className="profile-input"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            onFocus={() => { setFocusArea('content'); setSelectedIndex(2) }}
                        />
                        <Icon icon="mynaui:lock-key" className="profile-input-icon" />
                    </div>
                </div>

                {error && (
                    <div className="profile-alert-error">
                        <Icon icon="mynaui:warning-triangle" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="profile-actions-row">
                    <button
                        className={`profile-btn profile-btn--primary ${focusArea === 'content' && selectedIndex === 3 ? 'focused' : ''}`}
                        onClick={() => handleAuth('register')}
                        disabled={loading}
                        style={{ width: '100%' }}
                    >
                        <Icon icon={loading ? 'mynaui:loader' : 'mynaui:check'} className={loading ? 'profile-spin' : ''} />
                        Crear Mi Cuenta Gratis
                    </button>
                    <button
                        className={`profile-btn profile-btn--ghost ${focusArea === 'content' && selectedIndex === 4 ? 'focused' : ''}`}
                        onClick={() => { setTab('login'); setSelectedIndex(0); setError(null); sfx.navigate() }}
                    >
                        ¿Ya tienes una cuenta? Inicia sesión aquí
                    </button>
                </div>
            </div>
        </div>
    )

    return (
        <SidePanel
            visible={visible}
            tabs={activeTabs}
            activeTab={tab}
            focusArea={focusArea as any}
            onTabChange={id => { setTab(id); setFocusArea('content'); setSelectedIndex(0) }}
            onClose={onClose}
            titleOverride="Centro de Perfil"
        >
            <div className="console-panel__content-body">
                {tab === 'overview' && renderOverviewTab()}
                {tab === 'security' && renderSecurityTab()}
                {tab === 'library' && renderLibraryTab()}
                {tab === 'login' && renderLoginTab()}
                {tab === 'register' && renderRegisterTab()}
            </div>
        </SidePanel>
    )
}

export default ProfilePage
