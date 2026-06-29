import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import { AuthResult, HomeSlot, InterfaceSettings, AppTheme, FriendProfile, UserProfile } from '../../../../shared/types'
import { sfx } from '../../utils/audioManager'
import SidePanel from '../SidePanel'
import { useToast } from '../../hooks/useToast'
import { useDialog } from '../../hooks/useDialog'
import ThemeEditorModal from '../ThemeEditorModal'
import { ProfilePageProps } from './types'
import { LOGGED_IN_TABS, GUEST_TABS, BUILTIN_THEMES } from './constants'
import OverviewTab from './tabs/OverviewTab'
import ThemesTab from './tabs/ThemesTab'
import SecurityTab from './tabs/SecurityTab'
import LibraryTab from './tabs/LibraryTab'
import LoginTab from './tabs/LoginTab'
import RegisterTab from './tabs/RegisterTab'
import FriendsTab from './tabs/FriendsTab'
import TrophiesTab from './tabs/TrophiesTab'
import './ProfilePage.css'

function ProfilePage({ visible, authState, onLogin, onClose, onOpenAddGame }: ProfilePageProps): React.JSX.Element {
    const { showToast } = useToast()
    const { showDialog } = useDialog()
    const isLoggedIn = authState.isLoggedIn
    const user = authState.user

    const hasPremiumAccess = ['partner', 'admin', 'moderator'].includes(
        (user?.accountType || '').toLowerCase()
    )

    const [tab, setTab] = useState<string>('overview')
    const [focusArea, setFocusArea] = useState<'nav' | 'content' | 'nav_close' | 'nav_save' | 'footer' | 'game-actions'>('nav')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [isInputEditing, setIsInputEditing] = useState(false)

    const [librarySlots, setLibrarySlots] = useState<HomeSlot[]>([])
    const [libSearch, setLibSearch] = useState('')
    const [libFilterConsole, setLibFilterConsole] = useState('todas')

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

    const [settings, setSettings] = useState<InterfaceSettings>({ showGameBackground: true, activeTheme: 'dark', customThemes: [] })
    const [editingTheme, setEditingTheme] = useState<AppTheme | null>(null)

    const [friendsList, setFriendsList] = useState<FriendProfile[]>([])
    const [friendSearchQuery, setFriendSearchQuery] = useState('')
    const [friendSearchResults, setFriendSearchResults] = useState<UserProfile[]>([])
    const [isSearchingFriends, setIsSearchingFriends] = useState(false)
    const [friendSearchMessage, setFriendSearchMessage] = useState<string | null>(null)
    const [sendingRequestIds, setSendingRequestIds] = useState<string[]>([])

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
            if (tab === 'friends' && isLoggedIn) {
                window.api?.social?.getFriends()?.then(res => {
                    if (res?.success && res.data) setFriendsList(res.data)
                }).catch(() => {})
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
        if (!res) return
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
            colors: {}
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
        } else if (BUILTIN_THEMES.includes(themeId as any)) {
            const isDark = themeId === 'dark'
            const isApple = themeId === 'apple-glass'
            const isAppleLight = themeId === 'apple-glass-light'
            const isXmas = themeId === 'xmas'
            const isHall = themeId === 'halloween'
            const name = isDark ? 'Dark' : isApple ? 'Liquid Glass (Dark)' : isAppleLight ? 'Liquid Glass (Light)' : isXmas ? 'Navidad' : isHall ? 'Halloween' : 'Platinum'
            const colors = getBuiltinColors(themeId)
            setEditingTheme({
                id: 'theme_' + Date.now(),
                name: name + ' (Copia)',
                author: (user?.username || 'Usuario'),
                description: 'Copia del tema integrado.',
                colors
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
        visible, isLoggedIn, tab, focusArea, selectedIndex, isInputEditing, activeTabs, newUsername, newAvatarUrl, email, password, username, consolesList, hasAddGame: !!onOpenAddGame, hasPremiumAccess, expandedGameId, confirmDeleteGame, settings, friendsList, friendSearchQuery, friendSearchResults, isSearchingFriends
    })
    useEffect(() => {
        stateRef.current = { visible, isLoggedIn, tab, focusArea, selectedIndex, isInputEditing, activeTabs, newUsername, newAvatarUrl, email, password, username, consolesList, hasAddGame: !!onOpenAddGame, hasPremiumAccess, expandedGameId, confirmDeleteGame, settings, friendsList, friendSearchQuery, friendSearchResults, isSearchingFriends }
    })

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

    useEffect(() => {
        if (visible && isLoggedIn) {
            window.api.auth.refreshProfile?.().catch(() => {})
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible])

    useEffect(() => {
        const container = document.querySelector('.console-panel__content-body')
        if (container) container.scrollTop = 0
        setSelectedIndex(0)
        setError(null)
    }, [tab])

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

    useEffect(() => {
        const unsub = window.api?.social?.onPresenceUpdate?.(() => {
            window.api?.social?.getFriends()?.then(res => {
                if (res?.success && res.data) setFriendsList(res.data)
            }).catch(() => {})
        })
        return () => { unsub && unsub() }
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

    const handleSearchFriends = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!friendSearchQuery.trim()) return
        setIsSearchingFriends(true)
        setFriendSearchMessage(null)
        setFriendSearchResults([])
        try {
            const res = await window.api?.social?.searchUsers(friendSearchQuery.trim())
            if (!res?.success) {
                setFriendSearchMessage(res?.error || 'Error al buscar usuarios.')
            } else if (res.data) {
                setFriendSearchResults(res.data)
                if (res.data.length === 0) {
                    setFriendSearchMessage('No se han encontrado usuarios que coincidan con esa búsqueda.')
                }
            }
        } catch {
            setFriendSearchMessage('Error de conexión o de búsqueda.')
        }
        setIsSearchingFriends(false)
    }

    const handleSendFriendRequest = async (userId: string) => {
        try {
            const req = await window.api?.social?.sendFriendRequest(userId)
            if (!req?.success) {
                setFriendSearchMessage(req?.error || 'Error al enviar la solicitud.')
                return
            }
            const res = await window.api?.social?.getFriends()
            if (res?.success && res.data) setFriendsList(res.data)
            setFriendSearchMessage('¡Solicitud enviada correctamente!')
        } catch {
            setFriendSearchMessage('Error de conexión.')
        }
    }

    const handleAcceptFriendRequest = async (friendshipId: string) => {
        await window.api?.social?.acceptFriendRequest(friendshipId)
        const res = await window.api?.social?.getFriends()
        if (res?.success && res.data) setFriendsList(res.data)
    }

    const handleRemoveFriend = async (friendshipId: string) => {
        await window.api?.social?.removeFriend(friendshipId)
        const res = await window.api?.social?.getFriends()
        if (res?.success && res.data) setFriendsList(res.data)
    }

    const isFocused = (area: string, idx: number) => focusArea === area && selectedIndex === idx

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
                if (curTab === 'friends') maxCount = friendsList.length + 2
                if (curTab === 'trophies') maxCount = 1
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
                        else if (idx >= 1 && idx <= 7) {
                            handleSelectTheme(BUILTIN_THEMES[idx - 1])
                        }
                        else if (idx >= 8 && idx < 8 + customThemes.length) {
                            handleSelectTheme(customThemes[idx - 8].id)
                        } else if (idx === 8 + customThemes.length) {
                            handleCreateTheme()
                        } else if (idx === 9 + customThemes.length) {
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
                    setSelectedIndex(gameIdx >= 0 ? consolesEnd + 1 + gameIdx : consolesEnd + 1)
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
                {tab === 'overview' && (
                    <OverviewTab
                        focusArea={focusArea}
                        selectedIndex={selectedIndex}
                        isFocused={isFocused}
                        user={user}
                        loading={loading}
                        error={error}
                        hasPremiumAccess={hasPremiumAccess}
                        onOpenSecurity={() => { sfx.confirm(); setTab('security'); setSelectedIndex(0) }}
                        onLogout={handleLogout}
                    />
                )}
                {tab === 'themes' && (
                    <ThemesTab
                        focusArea={focusArea}
                        selectedIndex={selectedIndex}
                        isFocused={isFocused}
                        user={user}
                        loading={loading}
                        error={error}
                        settings={settings}
                        onToggleGameBackground={() => {
                            sfx.confirm()
                            setSettings(prev => {
                                const updated = { ...prev, showGameBackground: !prev.showGameBackground }
                                window.api?.ui?.saveSettings(updated)
                                window.dispatchEvent(new CustomEvent('theme-changed', { detail: updated }))
                                return updated
                            })
                        }}
                        onSelectTheme={handleSelectTheme}
                        onDuplicateTheme={handleDuplicateTheme}
                        onEditTheme={handleEditTheme}
                        onDeleteTheme={handleDeleteTheme}
                        onCreateTheme={handleCreateTheme}
                        onImportTheme={handleImportTheme}
                    />
                )}
                {tab === 'security' && (
                    <SecurityTab
                        focusArea={focusArea}
                        selectedIndex={selectedIndex}
                        isFocused={isFocused}
                        user={user}
                        loading={loading}
                        error={error}
                        newUsername={newUsername}
                        newAvatarUrl={newAvatarUrl}
                        onUsernameChange={setNewUsername}
                        onAvatarUrlChange={setNewAvatarUrl}
                        onSave={handleUpdateProfile}
                        onLogout={handleLogout}
                    />
                )}
                {tab === 'library' && (
                    <LibraryTab
                        focusArea={focusArea}
                        selectedIndex={selectedIndex}
                        isFocused={isFocused}
                        user={user}
                        loading={loading}
                        error={error}
                        librarySlots={librarySlots}
                        libSearch={libSearch}
                        libFilterConsole={libFilterConsole}
                        consolesList={consolesList}
                        filteredLibSlots={filteredLibSlots}
                        autoSync={autoSync}
                        syncingCloud={syncingCloud}
                        hasPremiumAccess={hasPremiumAccess}
                        hasAddGame={!!onOpenAddGame}
                        expandedGameId={expandedGameId}
                        onToggleAutoSync={() => { if (hasPremiumAccess) { sfx.confirm(); setAutoSync(!autoSync) } else sfx.cancel() }}
                        onPushCloud={handlePushCloud}
                        onPullCloud={handlePullCloud}
                        onAddGame={() => { sfx.confirm(); onOpenAddGame?.() }}
                        onSearchChange={setLibSearch}
                        onFilterConsole={(c) => { sfx.navigate(); setLibFilterConsole(c) }}
                        onSelectGame={(slot) => { sfx.confirm(); setExpandedGameId(slot.id); setFocusArea('game-actions'); setSelectedIndex(0) }}
                        onRunGame={(slot) => { sfx.confirm(); window.api.gridItemControl('run-game', slot); onClose() }}
                        onEditGame={(slot) => { sfx.confirm(); onOpenAddGame?.(slot) }}
                        onDeleteGame={(slot) => { sfx.confirm(); confirmDeleteGame(slot) }}
                        onCloseGameActions={() => { setExpandedGameId(null); setFocusArea('content') }}
                        isGameActionFocused={(actionIdx: number) => focusArea === 'game-actions' && selectedIndex === actionIdx}
                        onClose={onClose}
                    />
                )}
                {tab === 'login' && (
                    <LoginTab
                        focusArea={focusArea}
                        selectedIndex={selectedIndex}
                        isFocused={isFocused}
                        user={user}
                        loading={loading}
                        error={error}
                        email={email}
                        password={password}
                        onEmailChange={setEmail}
                        onPasswordChange={setPassword}
                        onLogin={() => handleAuth('login')}
                        onSwitchToRegister={() => { sfx.navigate(); setTab('register'); setSelectedIndex(0); setError(null) }}
                    />
                )}
                {tab === 'register' && (
                    <RegisterTab
                        focusArea={focusArea}
                        selectedIndex={selectedIndex}
                        isFocused={isFocused}
                        user={user}
                        loading={loading}
                        error={error}
                        email={email}
                        password={password}
                        username={username}
                        onUsernameChange={setUsername}
                        onEmailChange={setEmail}
                        onPasswordChange={setPassword}
                        onRegister={() => handleAuth('register')}
                        onSwitchToLogin={() => { sfx.navigate(); setTab('login'); setSelectedIndex(0); setError(null) }}
                    />
                )}
                {tab === 'friends' && (
                    <FriendsTab
                        focusArea={focusArea}
                        selectedIndex={selectedIndex}
                        friendsList={friendsList}
                        friendSearchQuery={friendSearchQuery}
                        friendSearchResults={friendSearchResults}
                        isSearchingFriends={isSearchingFriends}
                        friendSearchMessage={friendSearchMessage}
                        sendingRequestIds={sendingRequestIds}
                        onSearchQueryChange={(v) => { setFriendSearchQuery(v); setFriendSearchMessage(null) }}
                        onSearch={handleSearchFriends}
                        onSendFriendRequest={handleSendFriendRequest}
                        onAcceptFriendRequest={handleAcceptFriendRequest}
                        onRemoveFriend={handleRemoveFriend}
                        onClearSearchMessage={() => setFriendSearchMessage(null)}
                    />
                )}
                {tab === 'trophies' && <TrophiesTab />}
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

function getBuiltinColors(themeId: string): Record<string, string> {
    switch (themeId) {
        case 'dark': return {}
        case 'apple-glass': return {
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
        }
        case 'apple-glass-light': return {
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
        }
        case 'xmas': return {
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
        }
        case 'halloween': return {
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
        }
        case 'twilight-princess': return {
            '--bg-base': '#060805',
            '--bg-surface': 'rgba(189, 169, 114, 0.15)',
            '--bg-elevated': 'rgba(189, 169, 114, 0.25)',
            '--bg-hover': 'rgba(189, 169, 114, 0.1)',
            '--accent': '#bda972',
            '--accent-glow': 'rgba(189, 169, 114, 0.4)',
            '--accent-bright': '#d4c48a',
            '--text-primary': '#f0ead6',
            '--text-secondary': 'rgba(240, 234, 214, 0.7)',
            '--text-muted': 'rgba(240, 234, 214, 0.4)',
            '--border': 'rgba(189, 169, 114, 0.3)',
            '--border-active': 'rgba(189, 169, 114, 0.6)',
            '--bg-overlay': 'rgba(6, 8, 5, 0.6)',
            '--bg-header-gradient': 'transparent'
        }
        default: return {
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
    }
}

export default ProfilePage
