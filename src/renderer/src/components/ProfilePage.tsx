import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import { AuthState, AuthResult, HomeSlot, InterfaceSettings, AppTheme } from '../../../shared/types'
import { sfx } from '../utils/audioManager'
import SidePanel, { ConsolePanelTab } from './SidePanel'
import { useToast } from '../hooks/useToast'
import { useDialog } from '../hooks/useDialog'
import './ProfilePage.css'
import ThemeEditorModal from './ThemeEditorModal'

interface ProfilePageProps {
    visible: boolean
    authState: AuthState
    onLogin: (result: AuthResult) => void
    onClose: () => void
    onOpenAddGame?: (editSlot?: HomeSlot) => void
}

const LOGGED_IN_TABS: ConsolePanelTab[] = [
    { id: 'overview', label: 'Vista General', icon: 'mynaui:user', description: 'Tu tarjeta de jugador y estado en la nube' },
    { id: 'themes', label: 'Gestor de Temas', icon: 'mynaui:palette', description: 'Personaliza colores, estilos y temas visuales de la aplicación' },
    { id: 'security', label: 'Cuenta y Seguridad', icon: 'mynaui:shield-check', description: 'Personaliza tu identidad o gestiona tu sesión activa' },
    { id: 'library', label: 'Gestionar Biblioteca', icon: 'mynaui:folder', description: 'Opciones de sincronización y descubrimiento de juegos' }
]

const GUEST_TABS: ConsolePanelTab[] = [
    { id: 'login', label: 'Iniciar Sesión', icon: 'mynaui:log-in', description: 'Accede a tu biblioteca sincronizada en la nube' },
    { id: 'register', label: 'Crear Cuenta', icon: 'mynaui:user-plus', description: 'Regístrate gratis para respaldar tus partidas en línea' },
    { id: 'themes', label: 'Gestor de Temas', icon: 'mynaui:palette', description: 'Personaliza colores, estilos y temas visuales de la aplicación' }
]

function ProfilePage({ visible, authState, onLogin, onClose, onOpenAddGame }: ProfilePageProps): React.JSX.Element {
    const { showToast } = useToast()
    const { showDialog } = useDialog()
    const isLoggedIn = authState.isLoggedIn
    const user = authState.user

    /** True for Partner, Admin, Moderator — the roles that have cloud sync access */
    const hasPremiumAccess = ['partner', 'admin', 'moderator'].includes(
        (user?.accountType || '').toLowerCase()
    )

    const [tab, setTab] = useState<string>('overview')
    const [focusArea, setFocusArea] = useState<'nav' | 'content' | 'nav_close' | 'nav_save' | 'footer' | 'game-actions'>('nav')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [isInputEditing, setIsInputEditing] = useState(false)

    // Library states
    const [librarySlots, setLibrarySlots] = useState<HomeSlot[]>([])
    const [libSearch, setLibSearch] = useState('')
    const [libFilterConsole, setLibFilterConsole] = useState('todas')

    // Form states
    const [autoSync, setAutoSync] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [newUsername, setNewUsername] = useState('')
    const [newAvatarUrl, setNewAvatarUrl] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [syncingCloud, setSyncingCloud] = useState(false)
    const [expandedGameId, setExpandedGameId] = useState<string | null>(null)

    // Theme state
    const [settings, setSettings] = useState<InterfaceSettings>({ showGameBackground: true, activeTheme: 'dark', customThemes: [] })
    const [editingTheme, setEditingTheme] = useState<AppTheme | null>(null)

    const handleDeleteGame = useCallback(async (slotId: string) => {
        try {
            await window.api.slots?.remove?.(slotId)
            const updated = await window.api.slots?.getAll?.()
            setLibrarySlots(updated || [])
            setExpandedGameId(null)
            setFocusArea('content')
            setSelectedIndex(0)
            showToast('Juego eliminado', 'success')
        } catch (e: any) {
            console.error(e)
            showToast(`Error eliminando juego: ${e.message}`, 'error')
        }
    }, [showToast])

    const confirmDeleteGame = useCallback((slot: HomeSlot) => {
        showDialog({
            title: 'Confirmar eliminación',
            message: `¿Seguro que quieres eliminar "${slot.label || slot.game?.name}"?`,
            icon: 'mynaui:trash',
            actions: [
                { label: 'Cancelar', variant: 'secondary', onClick: () => { sfx.cancel() } },
                { label: 'Eliminar', variant: 'danger', onClick: () => { sfx.confirm(); handleDeleteGame(slot.id) } }
            ]
        })
    }, [showDialog, handleDeleteGame])

    useEffect(() => {
        if (visible) {
            if (tab === 'library') {
                window.api.slots?.getAll?.().then(res => setLibrarySlots(res || []))
            }
            if (tab === 'themes' || tab === 'overview') {
                window.api?.ui?.getSettings().then(res => {
                    if (res) setSettings(res)
                }).catch(console.error)
            }
        }
    }, [visible, tab])

    const handleSelectTheme = useCallback(async (themeId: string) => {
        sfx.confirm()
        setSettings(prev => {
            const updated = { ...prev, activeTheme: themeId }
            window.api?.ui?.saveSettings(updated)
            window.dispatchEvent(new CustomEvent('theme-changed', { detail: updated }))
            return updated
        })
        showToast('Tema cambiado correctamente', 'success')
    }, [showToast])

    const handleImportTheme = useCallback(async () => {
        sfx.confirm()
        const res = await window.api?.ui?.importTheme()
        if (!res) return // Canceled
        if ('error' in res) {
            sfx.cancel()
            showToast(`Error importando tema: ${res.error}`, 'error')
            return
        }
        
        setSettings(prev => {
            const customThemes = [...(prev.customThemes || [])]
            const existingIdx = customThemes.findIndex(t => t.id === res.id || t.name.toLowerCase() === res.name.toLowerCase())
            if (existingIdx >= 0) {
                customThemes[existingIdx] = res
            } else {
                customThemes.push(res)
            }
            const updated = { ...prev, customThemes, activeTheme: res.id }
            window.api?.ui?.saveSettings(updated)
            window.dispatchEvent(new CustomEvent('theme-changed', { detail: updated }))
            return updated
        })
        
        showToast(`Tema "${res.name}" instalado y activado`, 'success')
    }, [showToast])

    const handleDeleteTheme = useCallback(async (themeId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        sfx.cancel()
        setSettings(prev => {
            const customThemes = (prev.customThemes || []).filter(t => t.id !== themeId)
            const activeTheme = prev.activeTheme === themeId ? 'dark' : prev.activeTheme
            const updated = { ...prev, customThemes, activeTheme }
            window.api?.ui?.saveSettings(updated)
            window.dispatchEvent(new CustomEvent('theme-changed', { detail: updated }))
            return updated
        })
        showToast('Tema eliminado', 'info')
    }, [showToast])

    const handleCreateTheme = useCallback(() => {
        sfx.confirm()
        setEditingTheme({
            id: 'theme_' + Date.now(),
            name: 'Nuevo Tema',
            author: (user?.username || 'Usuario'),
            description: 'Un tema personalizado.',
            colors: {} // We rely on DEFAULT_COLORS in the modal
        })
    }, [user])

    const handleDuplicateTheme = useCallback((themeId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        sfx.confirm()
        const baseTheme = (settings.customThemes || []).find(t => t.id === themeId)
        if (baseTheme) {
            setEditingTheme({
                ...baseTheme,
                id: 'theme_' + Date.now(),
                name: baseTheme.name + ' (Copia)'
            })
        } else if (themeId === 'dark' || themeId === 'platinum' || themeId === 'apple-glass' || themeId === 'apple-glass-light' || themeId === 'xmas' || themeId === 'halloween') {
            const isDark = themeId === 'dark'
            const isApple = themeId === 'apple-glass'
            const isAppleLight = themeId === 'apple-glass-light'
            const isXmas = themeId === 'xmas'
            const isHall = themeId === 'halloween'
            setEditingTheme({
                id: 'theme_' + Date.now(),
                name: (isDark ? 'Dark' : isApple ? 'Liquid Glass (Dark)' : isAppleLight ? 'Liquid Glass (Light)' : isXmas ? 'Navidad' : isHall ? 'Halloween' : 'Platinum') + ' (Copia)',
                author: (user?.username || 'Usuario'),
                description: 'Copia del tema integrado.',
                colors: isDark ? {} : isApple ? {
                    '--bg-base': '#000000',
                    '--bg-surface': 'rgba(255, 255, 255, 0.1)',
                    '--bg-elevated': 'rgba(255, 255, 255, 0.18)',
                    '--bg-hover': 'rgba(255, 255, 255, 0.15)',
                    '--accent': '#0A84FF',
                    '--accent-glow': 'rgba(10, 132, 255, 0.4)',
                    '--accent-bright': '#5ebdff',
                    '--text-primary': '#ffffff',
                    '--text-secondary': 'rgba(255, 255, 255, 0.7)',
                    '--text-muted': 'rgba(255, 255, 255, 0.4)',
                    '--border': 'rgba(255, 255, 255, 0.25)',
                    '--border-active': 'rgba(255, 255, 255, 0.6)',
                    '--bg-overlay': 'rgba(0, 0, 0, 0.4)',
                    '--bg-header-gradient': 'transparent'
                } : isAppleLight ? {
                    '--bg-base': '#f5f5f7',
                    '--bg-surface': 'rgba(255, 255, 255, 0.6)',
                    '--bg-elevated': 'rgba(255, 255, 255, 0.85)',
                    '--bg-hover': 'rgba(0, 0, 0, 0.05)',
                    '--accent': '#0071e3',
                    '--accent-glow': 'rgba(0, 113, 227, 0.3)',
                    '--accent-bright': '#0077ed',
                    '--text-primary': '#1d1d1f',
                    '--text-secondary': 'rgba(0, 0, 0, 0.6)',
                    '--text-muted': 'rgba(0, 0, 0, 0.4)',
                    '--border': 'rgba(0, 0, 0, 0.1)',
                    '--border-active': 'rgba(0, 0, 0, 0.3)',
                    '--bg-overlay': 'rgba(255, 255, 255, 0.5)',
                    '--bg-header-gradient': 'transparent'
                } : isXmas ? {
                    '--bg-base': '#081c15',
                    '--bg-surface': 'rgba(216, 27, 96, 0.25)',
                    '--bg-elevated': 'rgba(216, 27, 96, 0.4)',
                    '--bg-hover': 'rgba(255, 255, 255, 0.15)',
                    '--accent': '#f4a261',
                    '--accent-glow': 'rgba(244, 162, 97, 0.5)',
                    '--accent-bright': '#e9c46a',
                    '--text-primary': '#ffffff',
                    '--text-secondary': 'rgba(255, 255, 255, 0.8)',
                    '--text-muted': 'rgba(255, 255, 255, 0.5)',
                    '--border': 'rgba(244, 162, 97, 0.4)',
                    '--border-active': 'rgba(244, 162, 97, 0.8)',
                    '--bg-overlay': 'rgba(8, 28, 21, 0.6)',
                    '--bg-header-gradient': 'rgba(216, 27, 96, 0.15)'
                } : isHall ? {
                    '--bg-base': '#0f0518',
                    '--bg-surface': 'rgba(255, 102, 0, 0.25)',
                    '--bg-elevated': 'rgba(255, 102, 0, 0.4)',
                    '--bg-hover': 'rgba(255, 255, 255, 0.15)',
                    '--accent': '#ff6600',
                    '--accent-glow': 'rgba(255, 102, 0, 0.5)',
                    '--accent-bright': '#ff9933',
                    '--text-primary': '#ffffff',
                    '--text-secondary': 'rgba(255, 255, 255, 0.8)',
                    '--text-muted': 'rgba(255, 255, 255, 0.5)',
                    '--border': 'rgba(255, 102, 0, 0.4)',
                    '--border-active': 'rgba(255, 102, 0, 0.8)',
                    '--bg-overlay': 'rgba(15, 5, 24, 0.6)',
                    '--bg-header-gradient': 'rgba(255, 102, 0, 0.15)'
                } : {
                    '--bg-base': '#e0e5ec',
                    '--bg-surface': 'rgba(255, 255, 255, 0.5)',
                    '--bg-elevated': 'rgba(255, 255, 255, 0.8)',
                    '--bg-hover': 'rgba(0, 0, 0, 0.05)',
                    '--accent': '#2a2d34',
                    '--accent-glow': 'rgba(0, 0, 0, 0.1)',
                    '--accent-bright': '#4a4e69',
                    '--text-primary': '#1a1b1e',
                    '--text-secondary': 'rgba(0, 0, 0, 0.6)',
                    '--text-muted': 'rgba(0, 0, 0, 0.3)',
                    '--border': 'rgba(0, 0, 0, 0.1)',
                    '--border-active': 'rgba(0, 0, 0, 0.4)'
                }
            })
        }
    }, [settings, user])

    const handleEditTheme = useCallback((themeId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        sfx.confirm()
        const customTheme = (settings.customThemes || []).find(t => t.id === themeId)
        if (customTheme) {
            setEditingTheme(customTheme)
        }
    }, [settings])

    const handleSaveTheme = useCallback(async (theme: AppTheme) => {
        sfx.confirm()
        setSettings(prev => {
            const customThemes = [...(prev.customThemes || [])]
            const existingIdx = customThemes.findIndex(t => t.id === theme.id)
            if (existingIdx >= 0) {
                customThemes[existingIdx] = theme
            } else {
                customThemes.push(theme)
            }
            const updated = { ...prev, customThemes, activeTheme: theme.id }
            window.api?.ui?.saveSettings(updated)
            window.dispatchEvent(new CustomEvent('theme-changed', { detail: updated }))
            return updated
        })
        setEditingTheme(null)
        showToast(`Tema "${theme.name}" guardado`, 'success')
    }, [showToast])



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
        visible, isLoggedIn, tab, focusArea, selectedIndex, isInputEditing, activeTabs, newUsername, newAvatarUrl, email, password, username, consolesList, hasAddGame: !!onOpenAddGame, hasPremiumAccess, expandedGameId, confirmDeleteGame, settings
    })
    useEffect(() => {
        stateRef.current = { visible, isLoggedIn, tab, focusArea, selectedIndex, isInputEditing, activeTabs, newUsername, newAvatarUrl, email, password, username, consolesList, hasAddGame: !!onOpenAddGame, hasPremiumAccess, expandedGameId, confirmDeleteGame, settings }
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

    // Refresh accountType from DB once each time the panel is opened (not on user changes to avoid loops)
    useEffect(() => {
        if (visible && isLoggedIn) {
            window.api.auth.refreshProfile?.().catch(() => {})
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible])

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

    // @ts-ignore
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

    const isFocused = (area: string, idx: number) => focusArea === area && selectedIndex === idx

    const handlePushCloud = useCallback(async () => {
        if (!hasPremiumAccess || syncingCloud) return
        setSyncingCloud(true)
        setError(null)
        try {
            const res = await window.api.sync?.pushCloud?.()
            setSyncingCloud(false)
            if (res?.success) {
                showToast('Archivos locales de biblioteca subidos a la nube con éxito', 'success')
                sfx.confirm()
            } else {
                showToast(res?.error || 'Error al subir a la nube', 'error')
                sfx.cancel()
            }
        } catch (e: any) {
            setSyncingCloud(false)
            showToast(e.message || 'Error de conexión', 'error')
            sfx.error()
        }
    }, [hasPremiumAccess, syncingCloud, showToast])

    const handlePullCloud = useCallback(async () => {
        if (!hasPremiumAccess || syncingCloud) return
        setSyncingCloud(true)
        setError(null)
        try {
            const res = await window.api.sync?.pullCloud?.()
            setSyncingCloud(false)
            if (res?.success) {
                showToast('Biblioteca descargada y aplicada correctamente', 'success')
                sfx.confirm()
                window.api.slots?.getAll?.().then(res => setLibrarySlots(res || []))
            } else {
                showToast(res?.error || 'Error al descargar de la nube', 'error')
                sfx.cancel()
            }
        } catch (e: any) {
            setSyncingCloud(false)
            showToast(e.message || 'Error de conexión', 'error')
            sfx.error()
        }
    }, [hasPremiumAccess, syncingCloud, showToast])

    // Keyboard & Gamepad navigation
    useEffect(() => {
        if (!visible) return
        const handler = (e: CustomEvent) => {
            if (document.querySelector('.ag-dialog-overlay')) return
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
                const hasAdd = stateRef.current.hasAddGame
                const searchIdx = hasAdd ? 4 : 3
                const consolesStart = searchIdx + 1
                const consolesEnd = consolesStart + stateRef.current.consolesList.length - 1
                const totalLibItems = consolesEnd + 1 + filteredLibSlots.length

                let maxCount = 2
                if (curTab === 'overview') maxCount = 2
                if (curTab === 'themes') maxCount = 10 + (stateRef.current.settings?.customThemes?.length || 0)
                if (curTab === 'security') maxCount = 4
                if (curTab === 'library') maxCount = totalLibItems
                if (curTab === 'login') maxCount = 4
                if (curTab === 'register') maxCount = 5

                if (curTab === 'library') {
                    const gamesStart = consolesEnd + 1
                    const gamesEnd = consolesEnd + filteredLibSlots.length

                    if (action === 'down') {
                        sfx.navigate()
                        if (idx === 0) setSelectedIndex(1)
                        else if (idx === 1 || idx === 2) setSelectedIndex(hasAdd ? 3 : searchIdx)
                        else if (hasAdd && idx === 3) setSelectedIndex(searchIdx)
                        else if (idx === searchIdx) setSelectedIndex(consolesStart)
                        else if (idx >= consolesStart && idx <= consolesEnd) {
                            if (filteredLibSlots.length > 0) setSelectedIndex(gamesStart)
                        }
                        else if (idx >= gamesStart && idx < gamesEnd) setSelectedIndex(idx + 1)
                        return
                    }

                    if (action === 'up') {
                        sfx.navigate()
                        if (idx === 1 || idx === 2) setSelectedIndex(0)
                        else if (hasAdd && idx === 3) setSelectedIndex(1)
                        else if (idx === searchIdx) setSelectedIndex(hasAdd ? 3 : 1)
                        else if (idx >= consolesStart && idx <= consolesEnd) setSelectedIndex(searchIdx)
                        else if (idx === gamesStart) setSelectedIndex(consolesStart)
                        else if (idx > gamesStart) setSelectedIndex(idx - 1)
                        return
                    }

                    if (action === 'right') {
                        if (idx === 1) { sfx.navigate(); setSelectedIndex(2); return }
                        if (idx >= consolesStart && idx < consolesEnd) { sfx.navigate(); setSelectedIndex(idx + 1); return }
                        return
                    }

                    if (action === 'left') {
                        if (idx === 2) { sfx.navigate(); setSelectedIndex(1); return }
                        if (idx > consolesStart && idx <= consolesEnd) { sfx.navigate(); setSelectedIndex(idx - 1); return }
                        if (idx === 0 || idx === 1 || (hasAdd && idx === 3) || idx === searchIdx || idx === consolesStart || idx >= gamesStart) {
                            sfx.navigate(); setFocusArea('nav'); return
                        }
                        return
                    }

                    if (action === 'back' || action === 'escape') {
                        sfx.navigate(); setFocusArea('nav'); return
                    }
                }

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
                    } else if (curTab === 'themes') {
                        const customThemes = stateRef.current.settings?.customThemes || []
                        if (idx === 0) {
                            sfx.confirm()
                            const currentSet = stateRef.current.settings
                            if (currentSet) {
                                const updated = { ...currentSet, showGameBackground: !currentSet.showGameBackground }
                                setSettings(updated)
                                window.api?.ui?.saveSettings(updated)
                                window.dispatchEvent(new CustomEvent('theme-changed', { detail: updated }))
                            }
                        }
                        else if (idx === 1) handleSelectTheme('dark')
                        else if (idx === 2) handleSelectTheme('platinum')
                        else if (idx === 3) handleSelectTheme('apple-glass')
                        else if (idx === 4) handleSelectTheme('apple-glass-light')
                        else if (idx === 5) handleSelectTheme('xmas')
                        else if (idx === 6) handleSelectTheme('halloween')
                        else if (idx >= 7 && idx < 7 + customThemes.length) {
                            handleSelectTheme(customThemes[idx - 7].id)
                        } else if (idx === 7 + customThemes.length) {
                            handleCreateTheme()
                        } else if (idx === 8 + customThemes.length) {
                            handleImportTheme()
                        }
                    } else if (curTab === 'security') {
                        if (idx === 0) { sfx.confirm(); document.getElementById('profile-input-user')?.focus() }
                        else if (idx === 1) { sfx.confirm(); document.getElementById('profile-input-avatar')?.focus() }
                        else if (idx === 2) { handleUpdateProfile() }
                        else if (idx === 3) { handleLogout() }
                    } else if (curTab === 'library') {
                        if (idx === 0) { if (stateRef.current.hasPremiumAccess) { sfx.confirm(); setAutoSync(prev => !prev) } else sfx.cancel() }
                        else if (idx === 1) { if (stateRef.current.hasPremiumAccess) handlePushCloud(); else sfx.cancel() }
                        else if (idx === 2) { if (stateRef.current.hasPremiumAccess) handlePullCloud(); else sfx.cancel() }
                        else if (hasAdd && idx === 3) { sfx.confirm(); onOpenAddGame?.() }
                        else if (idx === searchIdx) { sfx.confirm(); (document.querySelector('.profile-input') as HTMLInputElement)?.focus() }
                        else if (idx >= consolesStart && idx <= consolesEnd) {
                            sfx.navigate(); setLibFilterConsole(stateRef.current.consolesList[idx - consolesStart])
                        }
                        else if (idx > consolesEnd) {
                            const slot = filteredLibSlots[idx - consolesEnd - 1]
                            if (slot) {
                                sfx.confirm()
                                setExpandedGameId(slot.id)
                                setFocusArea('game-actions')
                                setSelectedIndex(0)
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
            } else if (area === 'game-actions') {
                if (action === 'left') {
                    if (idx > 0) { sfx.navigate(); setSelectedIndex(idx - 1) }
                } else if (action === 'right') {
                    const maxActions = stateRef.current.hasAddGame ? 2 : 0
                    if (idx < maxActions) { sfx.navigate(); setSelectedIndex(idx + 1) }
                } else if (action === 'back' || action === 'escape') {
                    sfx.navigate()
                    setFocusArea('content')
                    setExpandedGameId(null)
                    const searchIdx = stateRef.current.hasAddGame ? 4 : 3
                    const consolesEnd = searchIdx + stateRef.current.consolesList.length
                    const gameIdx = filteredLibSlots.findIndex(s => s.id === stateRef.current.expandedGameId)
                    if (gameIdx >= 0) {
                        setSelectedIndex(consolesEnd + 1 + gameIdx)
                    } else {
                        setSelectedIndex(consolesEnd + 1)
                    }
                } else if (action === 'select') {
                    const slot = filteredLibSlots.find(s => s.id === stateRef.current.expandedGameId)
                    if (slot) {
                        if (idx === 0) {
                            sfx.confirm(); window.api.gridItemControl('run-game', slot); onClose()
                        } else if (idx === 1 && stateRef.current.hasAddGame) {
                            sfx.confirm(); onOpenAddGame?.(slot)
                        } else if (idx === 2 && stateRef.current.hasAddGame) {
                            sfx.confirm(); stateRef.current.confirmDeleteGame?.(slot)
                        }
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
                <div className={`profile-stat-card ${!hasPremiumAccess ? 'profile-stat-card--disabled' : ''}`}>
                    <div className="profile-stat-icon profile-stat-icon--cloud">
                        <Icon icon="mdi:floppy" />
                    </div>
                    <div className="profile-stat-info">
                        <span className="profile-stat-label">Sincronización de Guardados</span>
                        <span className="profile-stat-value" style={{ color: hasPremiumAccess ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {hasPremiumAccess ? 'Activa' : 'No disponible'}
                        </span>
                    </div>
                </div>

                <div className={`profile-stat-card ${!hasPremiumAccess ? 'profile-stat-card--disabled' : ''}`}>
                    <div className="profile-stat-icon profile-stat-icon--games">
                        <Icon icon="mynaui:book-open" />
                    </div>
                    <div className="profile-stat-info">
                        <span className="profile-stat-label">Sincronización de Biblioteca</span>
                        <span className="profile-stat-value" style={{ color: hasPremiumAccess ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {hasPremiumAccess ? 'Activa' : 'No disponible'}
                        </span>
                    </div>
                </div>

                <div className="profile-stat-card" style={{ border: hasPremiumAccess ? '1px solid var(--accent)' : undefined }}>
                    <div className="profile-stat-icon profile-stat-icon--sync">
                        <Icon icon="mynaui:shield-check" style={{ color: hasPremiumAccess ? 'var(--accent)' : undefined }} />
                    </div>
                    <div className="profile-stat-info">
                        <span className="profile-stat-label">Tipo de Cuenta</span>
                        <span className="profile-stat-value" style={{ textTransform: 'capitalize', color: hasPremiumAccess ? 'var(--accent)' : undefined, fontWeight: hasPremiumAccess ? 700 : undefined }}>
                            {user?.accountType || 'Standard'}
                        </span>
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

    const renderThemesTab = () => {
        const customThemes = settings.customThemes || []
        const activeTheme = settings.activeTheme || 'dark'

        return (
            <div className="profile-container">
                <div className="profile-section-card">
                    <div className="profile-section-header">
                        <div className="profile-section-title-wrap">
                            <Icon icon="mynaui:image" />
                            <span className="profile-section-title">Comportamiento del Fondo</span>
                        </div>
                    </div>
                    <div className="profile-field-group">
                        <div
                            onClick={async () => {
                                sfx.confirm()
                                const updated = { ...settings, showGameBackground: !settings.showGameBackground }
                                setSettings(updated)
                                setSelectedIndex(0)
                                setFocusArea('content')
                                await window.api?.ui?.saveSettings(updated)
                                window.dispatchEvent(new CustomEvent('theme-changed', { detail: updated }))
                            }}
                            className={`profile-toggle ${focusArea === 'content' && selectedIndex === 0 ? 'focused' : ''}`}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px', cursor: 'pointer', marginTop: '8px'
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Fondo Dinámico de Juegos</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Muestra la portada del juego seleccionado en lugar del fondo del tema.</div>
                            </div>
                            <div style={{
                                width: '40px', height: '24px', borderRadius: '12px',
                                background: settings.showGameBackground ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                                position: 'relative', transition: 'all 0.2s'
                            }}>
                                <div style={{
                                    position: 'absolute', top: '2px', left: settings.showGameBackground ? '18px' : '2px',
                                    width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
                                    transition: 'all 0.2s'
                                }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-section-card">
                    <div className="profile-section-header">
                        <div className="profile-section-title-wrap">
                            <Icon icon="mynaui:palette" />
                            <span className="profile-section-title">Temas Integrados</span>
                        </div>
                    </div>
                    <p className="profile-section-desc">
                        Elige entre los diseños de color predeterminados de LaLa Hub.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        {/* Dark Theme */}
                        <div
                            onClick={() => { handleSelectTheme('dark'); setSelectedIndex(1); setFocusArea('content'); }}
                            className={`profile-toggle ${focusArea === 'content' && selectedIndex === 1 ? 'focused' : ''}`}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                                background: activeTheme === 'dark' ? 'rgba(58, 134, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: activeTheme === 'dark' ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px', cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#0a0c10', border: '2px solid #3a86ff' }} />
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dark (Predeterminado)</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Oscuro profundo estilo consola premium</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {activeTheme === 'dark' && <Icon icon="mynaui:check-circle" style={{ color: 'var(--accent)', fontSize: '20px' }} />}
                                <button onClick={(e) => handleDuplicateTheme('dark', e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Duplicar tema">
                                    <Icon icon="mynaui:copy" style={{ fontSize: '18px' }} />
                                </button>
                            </div>
                        </div>

                        {/* Platinum Theme */}
                        <div
                            onClick={() => { handleSelectTheme('platinum'); setSelectedIndex(2); setFocusArea('content'); }}
                            className={`profile-toggle ${focusArea === 'content' && selectedIndex === 2 ? 'focused' : ''}`}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                                background: activeTheme === 'platinum' ? 'rgba(58, 134, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: activeTheme === 'platinum' ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px', cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e0e5ec', border: '2px solid #2a2d34' }} />
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Platinum</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tema claro metálico retro</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {activeTheme === 'platinum' && <Icon icon="mynaui:check-circle" style={{ color: 'var(--accent)', fontSize: '20px' }} />}
                                <button onClick={(e) => handleDuplicateTheme('platinum', e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Duplicar tema">
                                    <Icon icon="mynaui:copy" style={{ fontSize: '18px' }} />
                                </button>
                            </div>
                        </div>

                        {/* Apple Glass Theme */}
                        <div
                            onClick={() => { handleSelectTheme('apple-glass'); setSelectedIndex(3); setFocusArea('content'); }}
                            className={`profile-toggle ${focusArea === 'content' && selectedIndex === 3 ? 'focused' : ''}`}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                                background: activeTheme === 'apple-glass' ? 'rgba(58, 134, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: activeTheme === 'apple-glass' ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px', cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#000000', border: '2px solid rgba(255, 255, 255, 0.3)' }} />
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Liquid Glass</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cristal translúcido estilo visionOS</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {activeTheme === 'apple-glass' && <Icon icon="mynaui:check-circle" style={{ color: 'var(--accent)', fontSize: '20px' }} />}
                                <button onClick={(e) => handleDuplicateTheme('apple-glass', e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Duplicar tema">
                                    <Icon icon="mynaui:copy" style={{ fontSize: '18px' }} />
                                </button>
                            </div>
                        </div>

                        {/* Apple Glass Light Theme */}
                        <div
                            onClick={() => { handleSelectTheme('apple-glass-light'); setSelectedIndex(4); setFocusArea('content'); }}
                            className={`profile-toggle ${focusArea === 'content' && selectedIndex === 4 ? 'focused' : ''}`}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                                background: activeTheme === 'apple-glass-light' ? 'rgba(0, 113, 227, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: activeTheme === 'apple-glass-light' ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px', cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f5f5f7', border: '2px solid #0071e3' }} />
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Liquid Glass (Light)</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cristal translúcido brillante de Apple</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {activeTheme === 'apple-glass-light' && <Icon icon="mynaui:check-circle" style={{ color: 'var(--accent)', fontSize: '20px' }} />}
                                <button onClick={(e) => handleDuplicateTheme('apple-glass-light', e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Duplicar tema">
                                    <Icon icon="mynaui:copy" style={{ fontSize: '18px' }} />
                                </button>
                            </div>
                        </div>

                        {/* Xmas Theme */}
                        <div
                            onClick={() => { handleSelectTheme('xmas'); setSelectedIndex(5); setFocusArea('content'); }}
                            className={`profile-toggle ${focusArea === 'content' && selectedIndex === 5 ? 'focused' : ''}`}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                                background: activeTheme === 'xmas' ? 'rgba(216, 27, 96, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: activeTheme === 'xmas' ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px', cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#081c15', border: '2px solid #f4a261' }} />
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Navidad</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tonos festivos con efecto de nieve</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {activeTheme === 'xmas' && <Icon icon="mynaui:check-circle" style={{ color: 'var(--accent)', fontSize: '20px' }} />}
                                <button onClick={(e) => handleDuplicateTheme('xmas', e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Duplicar tema">
                                    <Icon icon="mynaui:copy" style={{ fontSize: '18px' }} />
                                </button>
                            </div>
                        </div>

                        {/* Halloween Theme */}
                        <div
                            onClick={() => { handleSelectTheme('halloween'); setSelectedIndex(6); setFocusArea('content'); }}
                            className={`profile-toggle ${focusArea === 'content' && selectedIndex === 6 ? 'focused' : ''}`}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                                background: activeTheme === 'halloween' ? 'rgba(255, 102, 0, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: activeTheme === 'halloween' ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px', cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#0f0518', border: '2px solid #ff6600' }} />
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Halloween</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Calabazas, misterio y terror</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {activeTheme === 'halloween' && <Icon icon="mynaui:check-circle" style={{ color: 'var(--accent)', fontSize: '20px' }} />}
                                <button onClick={(e) => handleDuplicateTheme('halloween', e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Duplicar tema">
                                    <Icon icon="mynaui:copy" style={{ fontSize: '18px' }} />
                                </button>
                            </div>
                        </div>
                        {/* Twilight Princess Theme */}
                        <div
                            onClick={() => { handleSelectTheme('twilight-princess'); setSelectedIndex(7); setFocusArea('content'); }}
                            className={`profile-toggle ${focusArea === 'content' && selectedIndex === 7 ? 'focused' : ''}`}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                                background: activeTheme === 'twilight-princess' ? 'rgba(189, 169, 114, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                border: activeTheme === 'twilight-princess' ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px', cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#060805', border: '2px solid #bda972' }} />
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Twilight Princess</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>El Reino del Crepúsculo</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {activeTheme === 'twilight-princess' && <Icon icon="mynaui:check-circle" style={{ color: 'var(--accent)', fontSize: '20px' }} />}
                                <button onClick={(e) => handleDuplicateTheme('twilight-princess', e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Duplicar tema">
                                    <Icon icon="mynaui:copy" style={{ fontSize: '18px' }} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-section-card">
                    <div className="profile-section-header">
                        <div className="profile-section-title-wrap">
                            <Icon icon="mynaui:download" />
                            <span className="profile-section-title">Temas Personalizados</span>
                        </div>
                    </div>
                    <p className="profile-section-desc">
                        Instala temas creados por la comunidad desde archivos de hojas de estilo CSS.
                    </p>

                    {customThemes.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', marginBottom: '16px' }}>
                            {customThemes.map((t, i) => {
                                const idx = 8 + i
                                const isAct = activeTheme === t.id
                                return (
                                    <div
                                        key={t.id}
                                        onClick={() => { handleSelectTheme(t.id); setSelectedIndex(idx); setFocusArea('content'); }}
                                        className={`profile-toggle ${focusArea === 'content' && selectedIndex === idx ? 'focused' : ''}`}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                                            background: isAct ? 'rgba(58, 134, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                            border: isAct ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '12px', cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: t.colors['--bg-base'] || '#333', border: `2px solid ${t.colors['--accent'] || '#fff'}` }} />
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.description || (t.author ? `Por ${t.author}` : 'Tema personalizado')}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {isAct && <Icon icon="mynaui:check-circle" style={{ color: 'var(--accent)', fontSize: '20px' }} />}
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button onClick={(e) => handleEditTheme(t.id, e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Editar tema">
                                                    <Icon icon="mynaui:edit" style={{ fontSize: '18px' }} />
                                                </button>
                                                <button onClick={(e) => handleDuplicateTheme(t.id, e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Duplicar tema">
                                                    <Icon icon="mynaui:copy" style={{ fontSize: '18px' }} />
                                                </button>
                                                <button onClick={(e) => handleDeleteTheme(t.id, e)} style={{ background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '6px', display: 'flex' }} title="Eliminar tema">
                                                    <Icon icon="mynaui:trash" style={{ fontSize: '18px' }} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <div className="profile-actions-row" style={{ marginTop: customThemes.length > 0 ? '0' : '16px' }}>
                        <button
                            onClick={handleCreateTheme}
                            className={`profile-btn profile-btn--secondary ${focusArea === 'content' && selectedIndex === 8 + customThemes.length ? 'focused' : ''}`}
                        >
                            <Icon icon="mynaui:palette" />
                            Crear Tema Nuevo
                        </button>
                        <button
                            onClick={handleImportTheme}
                            className={`profile-btn profile-btn--primary ${focusArea === 'content' && selectedIndex === 9 + customThemes.length ? 'focused' : ''}`}
                        >
                            <Icon icon="mynaui:plus" />
                            Instalar Tema (.css)
                        </button>
                    </div>
                </div>
            </div>
        )
    }

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

    const renderLibraryTab = () => {
        const hasAdd = !!onOpenAddGame
        const searchIdx = hasAdd ? 4 : 3
        const consolesStart = searchIdx + 1
        const consolesEnd = consolesStart + consolesList.length - 1

        return (
        <div className="profile-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100%', gap: 16 }}>
            {/* Cloud Sync Section at the Top */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Icon icon="mynaui:cloud" style={{ color: 'var(--accent)' }} /> 
                            Sincronización Cloud
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {hasPremiumAccess ? 'Respalda automáticamente tu biblioteca y rutas de juegos' : 'Disponible para cuentas Partner, Admin y Moderator'}
                        </span>
                    </div>
                    <div 
                        className={`profile-toggle ${isFocused('content', 0) ? 'focused' : ''}`}
                        style={{ 
                            width: 44, height: 24, borderRadius: 12, 
                            background: autoSync ? 'var(--accent)' : 'rgba(255,255,255,0.1)', 
                            position: 'relative', cursor: hasPremiumAccess ? 'pointer' : 'not-allowed', transition: '0.3s',
                            opacity: hasPremiumAccess ? 1 : 0.5
                        }}
                        onClick={() => { if (hasPremiumAccess) { sfx.confirm(); setAutoSync(!autoSync) } else sfx.cancel() }}
                    >
                        <div style={{ 
                            width: 20, height: 20, borderRadius: '50%', background: '#fff', 
                            position: 'absolute', top: 2, left: autoSync ? 22 : 2, transition: '0.3s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        disabled={syncingCloud || !hasPremiumAccess}
                        title={!hasPremiumAccess ? 'Solo disponible para Partner, Admin y Moderator' : undefined}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 10,
                            background: isFocused('content', 1) ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                            border: isFocused('content', 1) ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                            color: 'var(--text)', fontSize: 13, fontWeight: 600,
                            cursor: (syncingCloud || !hasPremiumAccess) ? 'not-allowed' : 'pointer',
                            opacity: hasPremiumAccess ? 1 : 0.4
                        }}
                        onClick={handlePushCloud}
                    >
                        <Icon icon={syncingCloud ? "mynaui:spinner" : (hasPremiumAccess ? "mynaui:cloud-up" : "mynaui:lock")} className={syncingCloud ? "profile-spin" : ""} style={{ fontSize: 18, color: 'var(--accent)' }} />
                        Subir a la Nube
                    </button>
                    <button
                        disabled={syncingCloud || !hasPremiumAccess}
                        title={!hasPremiumAccess ? 'Solo disponible para Partner, Admin y Moderator' : undefined}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 10,
                            background: isFocused('content', 2) ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                            border: isFocused('content', 2) ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                            color: 'var(--text)', fontSize: 13, fontWeight: 600,
                            cursor: (syncingCloud || !hasPremiumAccess) ? 'not-allowed' : 'pointer',
                            opacity: hasPremiumAccess ? 1 : 0.4
                        }}
                        onClick={handlePullCloud}
                    >
                        <Icon icon={syncingCloud ? "mynaui:spinner" : (hasPremiumAccess ? "mynaui:cloud-down" : "mynaui:lock")} className={syncingCloud ? "profile-spin" : ""} style={{ fontSize: 18, color: '#4ade80' }} />
                        Descargar de la Nube
                    </button>
                </div>
            </div>

            {/* Header for Library directly */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon icon="mynaui:folder" style={{ color: 'var(--text-muted)' }} />
                    Juegos Locales ({filteredLibSlots.length})
                </span>
                {onOpenAddGame && (
                    <button
                        className={`cp-btn cp-btn--primary ${isFocused('content', 3) ? 'cp-btn--focused' : ''}`}
                        style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: 8 }}
                        onClick={() => { sfx.confirm(); onOpenAddGame() }}
                        title="Añadir nuevo juego a la biblioteca"
                    >
                        <Icon icon="mynaui:plus" /> Añadir Juego
                    </button>
                )}
            </div>

            <div className="profile-field-group" style={{ marginBottom: 4 }}>
                <div className={`profile-input-wrap ${isFocused('content', searchIdx) ? 'focused' : ''}`}>
                    <input
                        type="text"
                        className="profile-input"
                        placeholder="Buscar juego por título..."
                        value={libSearch}
                        onChange={(e) => setLibSearch(e.target.value)}
                        onFocus={() => { setFocusArea('content'); setSelectedIndex(searchIdx) }}
                    />
                    <Icon icon="mynaui:search" className="profile-input-icon" />
                </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {consolesList.map((c, idx) => (
                    <button
                        key={c}
                        className={`cp-btn cp-btn--${libFilterConsole === c ? 'primary' : 'secondary'} ${isFocused('content', consolesStart + idx) ? 'cp-btn--focused' : ''}`}
                        style={{ padding: '5px 12px', fontSize: '0.75rem', borderRadius: 20, textTransform: 'capitalize' }}
                        onClick={() => { sfx.navigate(); setLibFilterConsole(c) }}
                    >
                        {c}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 150, overflowY: 'auto', paddingRight: 4, marginBottom: 16 }}>
                {filteredLibSlots.length === 0 ? (
                    <p className="profile-section-desc" style={{ textAlign: 'center', padding: '24px 0' }}>No se encontraron juegos con estos filtros.</p>
                ) : (
                    filteredLibSlots.map((s, idx) => {
                        const isExpanded = expandedGameId === s.id
                        const isRowFocused = isFocused('content', consolesEnd + 1 + idx)
                        return (
                        <div 
                            key={s.id} 
                            className={`cp-list__item ${isRowFocused || isExpanded ? 'cp-list__item--focused' : ''}`} 
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(15, 18, 25, 0.8)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s ease', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                            onClick={() => {
                                sfx.confirm()
                                setExpandedGameId(s.id)
                                setFocusArea('game-actions')
                                setSelectedIndex(0)
                            }}
                        >
                            {((s as any).image || s.squareImage) && (
                                <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: `url("${(s as any).image || s.squareImage}")`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(16px)' }} />
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                                {(s as any).image || s.squareImage ? (
                                    <div style={{ minWidth: 88, width: 88, height: 88, borderRadius: 14, backgroundImage: `url("${s.squareImage || (s as any).image}")`, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: '0 6px 15px rgba(0,0,0,0.4)' }} />
                                ) : (
                                    <div style={{ minWidth: 88, width: 88, height: 88, borderRadius: 14, background: 'linear-gradient(135deg, rgba(58,134,255,0.2), rgba(58,134,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a86ff', fontSize: 36, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)' }}>
                                        <Icon icon={s.icon || "mynaui:gamepad"} />
                                    </div>
                                )}
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{s.label || s.game?.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 6, color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>{s.game?.platform?.name || s.game?.emulator?.name || 'PC'}</span>
                                        {s.game?.playtimeMinutes ? `${s.game.playtimeMinutes} min jugados` : 'Sin empezar'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexShrink: 0, position: 'relative', zIndex: 1, opacity: (isExpanded || isRowFocused) ? 1 : 0.8, transition: 'opacity 0.2s' }}>
                                <button
                                    className={`cp-btn cp-btn--secondary ${isExpanded && focusArea === 'game-actions' && selectedIndex === 0 ? 'cp-btn--focused' : ''}`}
                                    style={{ padding: '10px 14px', fontSize: '1.1rem', borderRadius: 10, background: 'rgba(255,255,255,0.1)' }}
                                    onClick={(e) => { e.stopPropagation(); window.api.gridItemControl('run-game', s); onClose() }}
                                    title="Lanzar juego"
                                >
                                    <Icon icon="mynaui:play" />
                                </button>
                                {onOpenAddGame && (
                                    <button
                                        className={`cp-btn cp-btn--secondary ${isExpanded && focusArea === 'game-actions' && selectedIndex === 1 ? 'cp-btn--focused' : ''}`}
                                        style={{ padding: '10px 14px', fontSize: '1.1rem', borderRadius: 10, background: 'rgba(255,255,255,0.1)' }}
                                        onClick={(e) => { e.stopPropagation(); sfx.confirm(); onOpenAddGame(s) }}
                                        title="Editar juego"
                                    >
                                        <Icon icon="mynaui:edit" />
                                    </button>
                                )}
                                {onOpenAddGame && (
                                    <button
                                        className={`profile-btn profile-btn--danger ${isExpanded && focusArea === 'game-actions' && selectedIndex === 2 ? 'focused' : ''}`}
                                        style={{ padding: '10px 14px', fontSize: '1.1rem', borderRadius: 10 }}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            sfx.confirm()
                                            confirmDeleteGame(s)
                                        }}
                                        title="Eliminar juego"
                                    >
                                        <Icon icon="mynaui:trash" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )})
                )}
            </div>
            {error && (
                <div className="profile-alert-error" style={{ marginTop: 12, color: error.includes('Error') ? '#ff8080' : '#80ff80', borderColor: error.includes('Error') ? 'rgba(242, 63, 67, 0.35)' : 'rgba(35, 165, 89, 0.35)', background: error.includes('Error') ? 'rgba(242, 63, 67, 0.12)' : 'rgba(35, 165, 89, 0.12)' }}>
                    <Icon icon={error.includes('Error') ? "mynaui:danger-triangle" : "mynaui:check-circle"} />
                    {error}
                </div>
            )}
        </div>
        )
    }

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
            <div className="console-panel__content-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 'calc(100vh - 180px)', padding: 0 }}>
                {tab === 'overview' && renderOverviewTab()}
                {tab === 'themes' && renderThemesTab()}
                {tab === 'security' && renderSecurityTab()}
                {tab === 'library' && renderLibraryTab()}
                {tab === 'login' && renderLoginTab()}
                {tab === 'register' && renderRegisterTab()}
            </div>
            {editingTheme && (
                <ThemeEditorModal
                    visible={true}
                    theme={editingTheme}
                    onClose={() => setEditingTheme(null)}
                    onSave={handleSaveTheme}
                />
            )}
        </SidePanel>
    )
}

export default ProfilePage
