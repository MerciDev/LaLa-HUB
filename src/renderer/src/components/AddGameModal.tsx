import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Icon } from '@iconify/react'
import { HomeSlot, Emulator } from '../../../shared/types'
import { sfx } from '../utils/audioManager'
import SidePanel, { ConsolePanelTab } from './SidePanel'
import { useDialog } from '../hooks/useDialog'
import { useToast } from '../hooks/useToast'
import { createPortal } from 'react-dom'

interface AddGameForm {
    name: string
    searchId: string
    path: string
    emulatorId: string
    platformId: string
    processName: string
    squareImage: string
    logoImage: string
    verticalImage: string
    horizontalImage: string
    iconImage: string
    backgroundImage?: string
    coverImage?: string
    showLabel?: boolean
    showLogo?: boolean
    labelPosition?: 'bottom' | 'top' | 'center'
    showIcon?: boolean
    iconPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    iconSize?: number
    savesPath?: string
    savesExtension?: string
    cloudSyncEnabled?: boolean
}

const EMPTY_FORM: AddGameForm = { 
    name: '', searchId: '', path: '', emulatorId: '', platformId: '', processName: '',
    squareImage: '', logoImage: '', 
    verticalImage: '', horizontalImage: '', iconImage: '',
    backgroundImage: '', coverImage: '',
    showLabel: false, showLogo: false, labelPosition: 'bottom', showIcon: false, iconPosition: 'bottom-right', iconSize: 64,
    savesPath: '', savesExtension: '.sav', cloudSyncEnabled: true
}

type Tab = 'import' | 'general' | 'media' | 'options' | 'saves'
type FocusArea = 'nav' | 'nav_save' | 'nav_close' | 'content'
type MediaTarget = 'squareImage' | 'logoImage' | 'verticalImage' | 'horizontalImage' | 'iconImage' | 'coverImage' | 'backgroundImage'

const TABS: ConsolePanelTab[] = [
    { id: 'import', label: 'Importar', icon: 'mynaui:cloud-download', description: 'Buscar juegos en la nube' },
    { id: 'general', label: 'General', icon: 'mynaui:controller', description: 'Nombre, ruta y emulador' },
    { id: 'media', label: 'Multimedia', icon: 'mynaui:image', description: 'Carátulas y recursos visuales' },
    { id: 'saves', label: 'Guardados', icon: 'mynaui:save', description: 'Partidas y sincronización' },
    { id: 'options', label: 'Opciones', icon: 'mynaui:cog', description: 'Visualización en la cuadrícula' },
]

const LABEL_POS_OPTIONS = [
    { id: 'bottom', label: 'Abajo' },
    { id: 'top', label: 'Arriba' },
    { id: 'center', label: 'Centro' }
]

const ICON_POS_OPTIONS = [
    { id: 'bottom-right', label: 'Abajo Derecha' },
    { id: 'bottom-left', label: 'Abajo Izquierda' },
    { id: 'top-right', label: 'Arriba Derecha' },
    { id: 'top-left', label: 'Arriba Izquierda' }
]

const ICON_SIZE_OPTIONS = [
    { id: 32, label: 'Pequeño' },
    { id: 48, label: 'Mediano' },
    { id: 64, label: 'Grande' },
    { id: 80, label: 'Muy Grande' }
]

const IMAGE_LABELS: Record<string, string> = {
    square: 'Cuadrada', vertical: 'Vertical',
    horizontal: 'Horizontal', logo: 'Logo', icon: 'Icono'
}

interface AddGamePanelProps {
    visible: boolean
    selectedIndex: number
    editSlot?: HomeSlot | null
    onClose: () => void
    authState?: import('../../../shared/types').AuthState
}

function AddGamePanel({ visible, editSlot, onClose, authState }: AddGamePanelProps): React.JSX.Element {
    const hasPremiumAccess = ['partner', 'admin', 'moderator'].includes(
        (authState?.user?.accountType || '').toLowerCase()
    )
    const [tab, setTab] = useState<Tab>('general')
    // ── Start in 'nav' so the user navigates tabs first ──
    const [focusArea, setFocusArea] = useState<FocusArea>('nav')
    const [contentIndex, setContentIndex] = useState(0)
    const [contentSubIndex, setContentSubIndex] = useState(0)
    const [mediaTarget, setMediaTarget] = useState<MediaTarget>('coverImage')
    const [isTargetMenuOpen, setIsTargetMenuOpen] = useState(false)
    const [menuHoverIndex, setMenuHoverIndex] = useState(0)

    const [isEmuMenuOpen, setIsEmuMenuOpen] = useState(false)
    const [emuMenuHoverIndex, setEmuMenuHoverIndex] = useState(0)
    const [isPlatMenuOpen, setIsPlatMenuOpen] = useState(false)
    const [platMenuHoverIndex, setPlatMenuHoverIndex] = useState(0)

    const [importQuery, setImportQuery] = useState('')
    const [importResults, setImportResults] = useState<any[]>([])
    const [importLoading, setImportLoading] = useState(false)
    const [apiConsoles, setApiConsoles] = useState<any[]>([])
    const [apiYears, setApiYears] = useState<string[]>([])
    const [importConsole, setImportConsole] = useState('')
    const [importYear, setImportYear] = useState('')
    const [importSort, setImportSort] = useState('name-asc')
    
    const [isConsoleMenuOpen, setIsConsoleMenuOpen] = useState(false)
    const [consoleMenuHoverIndex, setConsoleMenuHoverIndex] = useState(0)
    const [isYearMenuOpen, setIsYearMenuOpen] = useState(false)
    const [yearMenuHoverIndex, setYearMenuHoverIndex] = useState(0)
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
    const [sortMenuHoverIndex, setSortMenuHoverIndex] = useState(0)

    const isAMenuOpen = isTargetMenuOpen || isEmuMenuOpen || isPlatMenuOpen || isConsoleMenuOpen || isYearMenuOpen || isSortMenuOpen

    const [form, setForm] = useState<AddGameForm>(EMPTY_FORM)
    const [initialForm, setInitialForm] = useState<AddGameForm>(EMPTY_FORM)
    
    const { showDialog } = useDialog()
    const { showToast } = useToast()

    const [emulators, setEmulators] = useState<Emulator[]>([])
    const [platforms, setPlatforms] = useState<import('../../../shared/types').Platform[]>([])
    const [apiImages, setApiImages] = useState<{ type: string; url: string }[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [isInputEditing, setIsInputEditing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saveFiles, setSaveFiles] = useState<import('../../../shared/types').SaveFileInfo[]>([])
    const [loadingSaves, setLoadingSaves] = useState(false)
    const [syncingCloud, setSyncingCloud] = useState(false)
    const [selectedSaveFile, setSelectedSaveFile] = useState<import('../../../shared/types').SaveFileInfo | null>(null)
    const [saveDescriptionInput, setSaveDescriptionInput] = useState('')
    const [savingDesc, setSavingDesc] = useState(false)
    const [saveDetailFocusIndex, setSaveDetailFocusIndex] = useState(0)

    useEffect(() => {
        if (!visible || tab !== 'saves' || !form.savesPath) {
            setSaveFiles([])
            return
        }
        let active = true
        setLoadingSaves(true)
        window.api.saves.getFiles(form.savesPath, form.savesExtension || undefined)
            .then(res => { if (active) setSaveFiles(res) })
            .catch(() => { if (active) setSaveFiles([]) })
            .finally(() => { if (active) setLoadingSaves(false) })
        return () => { active = false }
    }, [visible, tab, form.savesPath, form.savesExtension])
    const isEditing = !!editSlot

    const r = useRef({ 
        tab, focusArea, contentIndex, contentSubIndex, visible, form, emulators, platforms,
        apiImages, isSaving, editSlot, mediaTarget, isTargetMenuOpen, 
        menuHoverIndex, isInputEditing, isEmuMenuOpen, emuMenuHoverIndex,
        isPlatMenuOpen, platMenuHoverIndex,
        hasAnyChanges: false, importResults,
        apiConsoles, importConsole, isConsoleMenuOpen, consoleMenuHoverIndex,
        apiYears, importYear, importSort, isYearMenuOpen, yearMenuHoverIndex,
        isSortMenuOpen, sortMenuHoverIndex, saveFiles
    })
    
    // Check for unsaved changes per section
    const hasSectionChanges = (section: Tab) => {
        if (section === 'general') {
            return form.name !== initialForm.name ||
                   form.searchId !== initialForm.searchId ||
                   form.path !== initialForm.path ||
                   form.emulatorId !== initialForm.emulatorId ||
                   form.platformId !== initialForm.platformId ||
                   form.processName !== initialForm.processName
        }
        if (section === 'media') {
            return form.squareImage !== initialForm.squareImage ||
                   form.logoImage !== initialForm.logoImage ||
                   form.verticalImage !== initialForm.verticalImage ||
                   form.horizontalImage !== initialForm.horizontalImage ||
                   form.iconImage !== initialForm.iconImage
        }
        if (section === 'options') {
            return !!form.showLabel !== !!initialForm.showLabel ||
                   !!form.showLogo !== !!initialForm.showLogo ||
                   (form.labelPosition || 'bottom') !== (initialForm.labelPosition || 'bottom') ||
                   !!form.showIcon !== !!initialForm.showIcon ||
                   (form.iconPosition || 'bottom-right') !== (initialForm.iconPosition || 'bottom-right') ||
                   (form.iconSize || 64) !== (initialForm.iconSize || 64)
        }
        if (section === 'saves') {
            return form.savesPath !== initialForm.savesPath ||
                   form.savesExtension !== initialForm.savesExtension ||
                   form.cloudSyncEnabled !== initialForm.cloudSyncEnabled
        }
        return false
    }
    const hasAnyChanges = hasSectionChanges('general') || hasSectionChanges('media') || hasSectionChanges('options') || hasSectionChanges('saves')

    useEffect(() => {
        r.current = { 
            tab, focusArea, contentIndex, contentSubIndex, visible, form, emulators, platforms,
            apiImages, isSaving, editSlot, mediaTarget, isTargetMenuOpen, 
            menuHoverIndex, isInputEditing, isEmuMenuOpen, emuMenuHoverIndex,
            isPlatMenuOpen, platMenuHoverIndex,
            hasAnyChanges, importResults, apiConsoles, importConsole,
            isConsoleMenuOpen, consoleMenuHoverIndex,
            apiYears, importYear, importSort, isYearMenuOpen, yearMenuHoverIndex,
            isSortMenuOpen, sortMenuHoverIndex, saveFiles
        }
    })

    // ── Fetch Consoles ──
    useEffect(() => {
        if (!visible) return
        window.api.gameApi.getConsoles().then(setApiConsoles).catch(() => {})
        window.api.gameApi.getYears().then(setApiYears).catch(() => {})
    }, [visible])

    const getGameConsoles = (res: any) => {
        const ids = new Set<string>()
        const primary = typeof res.console === 'string' ? res.console : res.console?.id
        if (primary) ids.add(primary)
        
        if (Array.isArray(res.platforms)) {
            res.platforms.forEach((p: any) => {
                const pid = typeof p.console === 'string' ? p.console : p.console?.id
                if (pid) ids.add(pid)
            })
        }

        return Array.from(ids)
            .map(id => {
                const found = apiConsoles.find(c => c.id === id)
                return found ? found.name : id.toUpperCase()
            })
            .sort((a, b) => a.localeCompare(b))
    }

    // ── Reset state on open ──
    useEffect(() => {
        if (!visible) return
        window.api.emulators.getAll().then(setEmulators)
        window.api.platforms.getAll().then(setPlatforms)
        setTab('import')
        setFocusArea('nav')
        setContentIndex(0)
        setContentSubIndex(0)
        setMediaTarget('coverImage')
        setApiImages([])
        setImportQuery('')
        setImportConsole('')
        setImportResults([])
        setError(null)
        setIsInputEditing(false)
        setIsEmuMenuOpen(false)
        setEmuMenuHoverIndex(0)
        setIsConsoleMenuOpen(false)
        setConsoleMenuHoverIndex(0)

        if (editSlot) {
            const data = {
                name: editSlot.label,
                searchId: editSlot.game?.searchId ?? '',
                path: editSlot.game?.path ?? '',
                emulatorId: editSlot.game?.emulator?.id ?? '',
                platformId: editSlot.game?.platform?.id ?? '',
                processName: editSlot.game?.processName ?? '',
                squareImage: editSlot.squareImage ?? '',
                logoImage: editSlot.logoImage ?? '',
                verticalImage: editSlot.verticalImage ?? '',
                horizontalImage: editSlot.horizontalImage ?? '',
                iconImage: editSlot.iconImage ?? '',
                backgroundImage: editSlot.backgroundImage ?? '',
                coverImage: editSlot.coverImage ?? '',
                showLabel: editSlot.showLabel ?? false,
                showLogo: editSlot.showLogo ?? false,
                labelPosition: editSlot.labelPosition ?? 'bottom',
                showIcon: editSlot.showIcon ?? false,
                iconPosition: editSlot.iconPosition ?? 'bottom-right',
                iconSize: editSlot.iconSize ?? 64,
                savesPath: editSlot.game?.savesPath ?? '',
                savesExtension: editSlot.game?.savesExtension ?? '.sav',
                cloudSyncEnabled: editSlot.game?.cloudSyncEnabled ?? false
            }
            setForm(data)
            setInitialForm(data)
        } else {
            setForm(EMPTY_FORM)
            setInitialForm(EMPTY_FORM)
        }
    }, [visible, editSlot])

    // ── Fetch API images when entering media tab ──
    useEffect(() => {
        const query = form.searchId.trim() || form.name.trim()
        if (tab !== 'media' || !query) { setApiImages([]); return }
        // @ts-ignore
const q = encodeURIComponent(query)
        window.api.gameApi.searchGames(q)
            .then((data: any) => {
                if (data.results?.length > 0) {
                    const imgs = data.results[0].images || {}
                    const keys = ['cover', 'square', 'vertical', 'horizontal', 'background', 'logo', 'icon']
                    const seenUrls = new Set<string>()
                    const uniqueImgs = keys.filter(k => {
                        const url = imgs[k]
                        if (!url || seenUrls.has(url)) return false
                        seenUrls.add(url)
                        return true
                    }).map(k => ({ type: k, url: imgs[k] }))
                    setApiImages(uniqueImgs)
                } else {
                    setApiImages([])
                }
            })
            .catch(() => setApiImages([]))
    }, [tab, form.name, form.searchId])

    // ── Fetch Import Results ──
    useEffect(() => {
        if (tab !== 'import') return
        const timer = setTimeout(() => {
            // @ts-ignore
const q = importQuery.trim() ? encodeURIComponent(importQuery.trim()) : ''
            setImportLoading(true)
            window.api.gameApi.searchGames(importQuery.trim())
                .then((data: any) => {
                    let results = Array.isArray(data) ? data : (data?.results || [])
                    
                    if (importConsole) {
                        results = results.filter((r: any) => {
                            const target = importConsole.toLowerCase();
                            const primaryId = (typeof r.console === 'string' ? r.console : r.console?.id)?.toLowerCase();
                            const matchesPrimary = primaryId === target;
                            const matchesPlatform = r.platforms?.some((p: any) => {
                                const pId = (typeof p.console === 'string' ? p.console : p.console?.id)?.toLowerCase();
                                return pId === target;
                            });
                            return matchesPrimary || matchesPlatform;
                        })
                    }

                    if (importYear) {
                        results = results.filter((r: any) => {
                            if (!r.releaseDate) return false;
                            return new Date(r.releaseDate).getFullYear().toString() === importYear;
                        })
                    }

                    if (importSort === 'name-asc') {
                        results.sort((a, b) => a.name.localeCompare(b.name))
                    } else if (importSort === 'name-desc') {
                        results.sort((a, b) => b.name.localeCompare(a.name))
                    } else if (importSort === 'newest') {
                        results.sort((a, b) => new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime())
                    } else if (importSort === 'oldest') {
                        results.sort((a, b) => new Date(a.releaseDate || 0).getTime() - new Date(b.releaseDate || 0).getTime())
                    }
                    
                    setImportResults(results)
                })
                .catch(() => setImportResults([]))
                .finally(() => setImportLoading(false))
        }, 300)
        return () => clearTimeout(timer)
    }, [tab, importQuery, importConsole, importYear, importSort])

    // ── Input Focus Sync (Native & Gamepad) ──
    const blurAllInputs = useCallback(() => {
        const ids = ['ag-name', 'ag-searchid', 'ag-path', 'ag-emu', 'ag-process', 'ag-import-query', 'ag-import-console']
        ids.forEach(id => {
            const el = document.getElementById(id)
            if (el) el.blur()
        })
    }, [])

    const focusCurrentInput = useCallback(() => {
        if (tab === 'general') {
            const ids = ['ag-name', 'ag-searchid', 'ag-path', 'ag-emu', 'ag-plat', 'ag-process']
            const el = document.getElementById(ids[contentIndex])
            if (el) el.focus()
        } else if (tab === 'import') {
            const ids = ['ag-import-query']
            const el = document.getElementById(ids[contentIndex])
            if (el) el.focus()
        }
    }, [contentIndex, tab])

    useEffect(() => {
        if (!visible) return
        if (isInputEditing) {
            focusCurrentInput()
        } else {
            blurAllInputs()
        }
    }, [isInputEditing, visible, focusCurrentInput, blurAllInputs])

    // Safety: Blur if we leave the content area or a content tab
    useEffect(() => {
        if (focusArea !== 'content' || (tab !== 'general' && tab !== 'import')) {
            setIsInputEditing(false)
            blurAllInputs()
        }
    }, [focusArea, tab, blurAllInputs])

    // Listen to native focus to keep states perfectly in sync automatically.
    // This fixes the bug where MainApp.tsx blurs the input but AddGameModal didn't know.
    useEffect(() => {
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && target.id.startsWith('ag-')) {
                setIsInputEditing(true)
                setFocusArea('content')
                if (target.id === 'ag-name') { setContentIndex(0) }
                if (target.id === 'ag-searchid') { setContentIndex(1) }
                if (target.id === 'ag-path') { setContentIndex(2) }
                if (target.id === 'ag-emu') { setContentIndex(3) }
                if (target.id === 'ag-plat') { setContentIndex(4) }
                if (target.id === 'ag-process') { setContentIndex(5) }
                if (target.id === 'ag-import-query') { setContentIndex(0) }
                if (target.id === 'ag-import-console') { setContentIndex(1) }
            }
        }
        const handleFocusOut = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && target.id.startsWith('ag-')) {
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

    // ── Auto-assign default images from API ──
    useEffect(() => {
        if (!visible || apiImages.length === 0) return
        
        // Define mapping between target field and API type
        const mapping: Record<MediaTarget, string> = {
            squareImage: 'square',
            backgroundImage: 'background',
            logoImage: 'logo',
            coverImage: 'cover',
            verticalImage: 'vertical',
            horizontalImage: 'horizontal',
            iconImage: 'icon'
        }

        const targetType = mapping[mediaTarget]
        const found = apiImages.find(img => img.type === targetType)
        
        // Only auto-assign if the field is currently empty
        if (found && !form[mediaTarget]) {
            const u = found.url
            setForm(prev => ({ ...prev, [mediaTarget]: u }))
        }
    }, [mediaTarget, apiImages, visible])

    // ── Auto-assign Search ID ──
    const handleAutoAssignSearchId = useCallback(() => {
        const name = r.current.form.name
        if (!name) return
        
        const slug = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Limpiar acentos
            .replace(/[^a-z0-9\s-]/g, "")    // Limpiar caracteres especiales
            .trim()
            .replace(/\s+/g, '-')             // Espacios a guiones
            
        setForm(p => ({ ...p, searchId: slug }))
        sfx.confirm()
    }, [])

    // ── Resolve {game_root} in saves path ──
    const resolveSavesPath = useCallback((savesPath: string, gamePath: string): string => {
        if (!savesPath || !gamePath) return savesPath || ''
        const dir = gamePath.replace(/\\/g, '/').replace(/\/[^/]*$/, '')
        return savesPath.replace(/\{game_root\}/g, dir)
    }, [])

    // ── Handle Import Game ──
    const handleImportGame = useCallback((res: any) => {
        const imgs = res.images || {}
        const normalize = (u?: string) => {
            if (!u) return ''
            return u
        }

        const rawSavesPath = res.savesPath || ''
        const currentPath = r.current.form.path
        
        setForm(p => ({
            ...p,
            name: res.name || '',
            searchId: res.id || '',
            squareImage: imgs.square ? normalize(imgs.square) : p.squareImage,
            backgroundImage: imgs.background ? normalize(imgs.background) : p.backgroundImage,
            logoImage: imgs.logo ? normalize(imgs.logo) : p.logoImage,
            coverImage: imgs.cover ? normalize(imgs.cover) : p.coverImage,
            verticalImage: imgs.vertical ? normalize(imgs.vertical) : p.verticalImage,
            horizontalImage: imgs.horizontal ? normalize(imgs.horizontal) : p.horizontalImage,
            iconImage: imgs.icon ? normalize(imgs.icon) : p.iconImage,
            savesPath: currentPath ? resolveSavesPath(rawSavesPath, currentPath) : rawSavesPath || p.savesPath,
            savesExtension: res.savesExtension ?? p.savesExtension,
        }))
        setTab('general')
        setFocusArea('content')
        setContentIndex(2) // saltar directo a "Ruta"
        sfx.confirm()
    }, [])

    // ── Auto-scroll into view ──
    useEffect(() => {
        if (isTargetMenuOpen || isEmuMenuOpen || isConsoleMenuOpen) return;

        const bodyEl = document.querySelector('.console-panel__content-body')

        if (focusArea === 'content' && bodyEl) {
            if (tab === 'import') {
                if (contentIndex <= 3) {
                    bodyEl.scrollTo({ top: 0, behavior: 'smooth' })
                } else {
                    const cardEl = document.getElementById(`ag-import-card-${contentIndex - 4}`)
                    if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            } else if (tab === 'general') {
                if (contentIndex <= 1) {
                    bodyEl.scrollTo({ top: 0, behavior: 'smooth' })
                } else {
                    const id = contentIndex === 2 ? 'ag-path' : contentIndex === 3 ? 'ag-emu' : contentIndex === 4 ? 'ag-plat' : 'ag-process'
                    const el = document.getElementById(id)
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            } else if (tab === 'media') {
                const id = contentIndex === 0 ? 'ag-media-target' : contentIndex === 1 ? 'ag-media-url' : contentIndex === 2 ? 'ag-remove-btn' : `ag-api-btn-${contentIndex - 3}`
                const el = document.getElementById(id)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } else if (tab === 'saves') {
                // @ts-ignore
const hasBtns = !!(editSlot && form.savesPath)
                const savesStartAt = 6
                const id = contentIndex === 0 ? 'ag-saves-path' : contentIndex === 1 ? 'ag-saves-ext' : contentIndex === 2 ? 'ag-cloud-sync' : (hasBtns && contentIndex === 3) ? 'ag-btn-push' : (hasBtns && contentIndex === 4) ? 'ag-btn-pull' : contentIndex === 5 ? 'ag-saves-sync' : `ag-save-card-${contentIndex - savesStartAt}`
                const el = document.getElementById(id)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        }
    }, [contentIndex, focusArea, tab, isTargetMenuOpen, isEmuMenuOpen, isConsoleMenuOpen])

    // ── Auto-scroll internal dropdowns ──
    useEffect(() => {
        if (isConsoleMenuOpen) {
            const el = document.getElementById(`ag-console-opt-${consoleMenuHoverIndex}`)
            const parent = el?.parentElement
            if (el && parent) {
                const targetScroll = el.offsetTop - (parent.offsetHeight / 2) + (el.offsetHeight / 2)
                parent.scrollTo({ top: targetScroll, behavior: 'smooth' })
            }
        }
    }, [consoleMenuHoverIndex, isConsoleMenuOpen])

    useEffect(() => {
        if (isPlatMenuOpen) {
            const el = document.getElementById(`ag-plat-opt-${platMenuHoverIndex}`)
            const parent = el?.parentElement
            if (el && parent) {
                const targetScroll = el.offsetTop - (parent.offsetHeight / 2) + (el.offsetHeight / 2)
                parent.scrollTo({ top: targetScroll, behavior: 'smooth' })
            }
        }
    }, [platMenuHoverIndex, isPlatMenuOpen])

    useEffect(() => {
        if (isEmuMenuOpen) {
            const el = document.getElementById(`ag-emu-opt-${emuMenuHoverIndex}`)
            const parent = el?.parentElement
            if (el && parent) {
                const targetScroll = el.offsetTop - (parent.offsetHeight / 2) + (el.offsetHeight / 2)
                parent.scrollTo({ top: targetScroll, behavior: 'smooth' })
            }
        }
    }, [emuMenuHoverIndex, isEmuMenuOpen])

    useEffect(() => {
        if (isTargetMenuOpen) {
            const el = document.getElementById(`ag-target-opt-${menuHoverIndex}`)
            const parent = el?.parentElement
            if (el && parent) {
                const targetScroll = el.offsetTop - (parent.offsetHeight / 2) + (el.offsetHeight / 2)
                parent.scrollTo({ top: targetScroll, behavior: 'smooth' })
            }
        }
    }, [menuHoverIndex, isTargetMenuOpen])

    useEffect(() => {
        if (isYearMenuOpen) {
            const el = document.getElementById(`ag-year-opt-${yearMenuHoverIndex}`)
            const parent = el?.parentElement
            if (el && parent) {
                const targetScroll = el.offsetTop - (parent.offsetHeight / 2) + (el.offsetHeight / 2)
                parent.scrollTo({ top: targetScroll, behavior: 'smooth' })
            }
        }
    }, [yearMenuHoverIndex, isYearMenuOpen])

    useEffect(() => {
        if (isSortMenuOpen) {
            const el = document.getElementById(`ag-sort-opt-${sortMenuHoverIndex}`)
            const parent = el?.parentElement
            if (el && parent) {
                const targetScroll = el.offsetTop - (parent.offsetHeight / 2) + (el.offsetHeight / 2)
                parent.scrollTo({ top: targetScroll, behavior: 'smooth' })
            }
        }
    }, [sortMenuHoverIndex, isSortMenuOpen])

    const forceClose = useCallback(() => {
        sfx.cancel()
        setForm(EMPTY_FORM)
        setInitialForm(EMPTY_FORM)
        setError(null)
        setIsTargetMenuOpen(false)
        onClose()
    }, [onClose])

    const handleClose = useCallback(() => {
        if (r.current.hasAnyChanges && r.current.visible) {
            showDialog({
                title: 'Cambios sin guardar',
                message: '¿Estás seguro de que quieres salir? Perderás todos los cambios realizados.',
                icon: 'mynaui:warning-triangle',
                actions: [
                    { label: 'Cancelar', variant: 'ghost', onClick: () => {} },
                    { label: 'Descartar Cambios', variant: 'danger', onClick: forceClose }
                ]
            })
        } else {
            forceClose()
        }
    }, [forceClose, showDialog])

    // --- Media targets list ---
    const MEDIA_OPTIONS: { id: MediaTarget; label: string }[] = [
        { id: 'coverImage', label: 'Carátula Principal' },
        { id: 'backgroundImage', label: 'Fondo de Pantalla' },
        { id: 'verticalImage', label: 'Cuadrícula Vertical' },
        { id: 'horizontalImage', label: 'Cuadrícula Horizontal' },
        { id: 'squareImage', label: 'Imagen Cuadrada' },
        { id: 'logoImage', label: 'Logotipo' },
        { id: 'iconImage', label: 'Icono (Pequeño)' }
    ]

    const SORT_OPTIONS = [
        { id: 'name-asc', name: 'Alfabético (A-Z)' },
        { id: 'name-desc', name: 'Alfabético (Z-A)' },
        { id: 'newest', name: 'Más nuevos' },
        { id: 'oldest', name: 'Más antiguos' }
    ]


    // ── Keyboard navigation ──
    useEffect(() => {
        const handler = (e: Event) => {
            const vis = r.current.visible
            const ct = r.current.tab
            const area = r.current.focusArea
            const cIdx = r.current.contentIndex
            const saving = r.current.isSaving
            const menuOpen = r.current.isTargetMenuOpen
            const isEmuMenuOpen = r.current.isEmuMenuOpen

            if (!vis || saving) return
            // If a dialog is open, let it handle the events exclusively
            if (document.querySelector('.ag-dialog-overlay')) return

            const action = (e as CustomEvent<string>).detail

            // ─ Sub-menu: Input Editing ─
            if (r.current.isInputEditing) {
                // MainApp already handled Enter/Escape and called .blur(), which triggers our focusout listener.
                // We just swallow the arrow keys here so navigating while typing doesn't move the UI.
                return 
            }

            // ─ Sub-menu: Emulator Dropdown ─
            if (isEmuMenuOpen) {
                e.stopImmediatePropagation()
                const emuOptions = [{ id: '', name: 'Nativo' }, ...r.current.emulators];
                const currentHover = r.current.emuMenuHoverIndex
                if (action === 'up') {
                    if (currentHover > 0) { sfx.navigate(); setEmuMenuHoverIndex(currentHover - 1) }
                } else if (action === 'down') {
                    if (currentHover < emuOptions.length - 1) { sfx.navigate(); setEmuMenuHoverIndex(currentHover + 1) }
                } else if (action === 'select') {
                    sfx.confirm(); setForm(p => ({ ...p, emulatorId: emuOptions[currentHover].id, platformId: '', path: '' })); setIsEmuMenuOpen(false)
                } else if (action === 'back') {
                    sfx.cancel(); setIsEmuMenuOpen(false)
                }
                return
            }

            // ─ Sub-menu: Platform Dropdown ─
            if (r.current.isPlatMenuOpen) {
                e.stopImmediatePropagation()
                const currentHover = r.current.platMenuHoverIndex
                const selectedEmulator = r.current.emulators.find(e => e.id === r.current.form.emulatorId)
                const platOptions = r.current.platforms.filter(p => selectedEmulator?.platforms?.includes(p.id))

                if (action === 'up') {
                    if (currentHover > 0) { sfx.navigate(); setPlatMenuHoverIndex(currentHover - 1) }
                } else if (action === 'down') {
                    if (currentHover < platOptions.length - 1) { sfx.navigate(); setPlatMenuHoverIndex(currentHover + 1) }
                } else if (action === 'select') {
                    sfx.confirm(); setForm(p => ({ ...p, platformId: platOptions[currentHover].id })); setIsPlatMenuOpen(false); setIsInputEditing(false)
                } else if (action === 'back') {
                    sfx.cancel(); setIsPlatMenuOpen(false); setIsInputEditing(false)
                }
                return
            }

            // ─ Sub-menu: Media Target Dropdown ─
            if (menuOpen) {
                e.stopImmediatePropagation()
                const currentHover = r.current.menuHoverIndex
                if (action === 'up') {
                    if (currentHover > 0) { sfx.navigate(); setMenuHoverIndex(currentHover - 1) }
                } else if (action === 'down') {
                    if (currentHover < MEDIA_OPTIONS.length - 1) { sfx.navigate(); setMenuHoverIndex(currentHover + 1) }
                } else if (action === 'select') {
                    sfx.confirm(); setMediaTarget(MEDIA_OPTIONS[currentHover].id as MediaTarget); setIsTargetMenuOpen(false)
                } else if (action === 'back') {
                    sfx.cancel(); setIsTargetMenuOpen(false)
                }
                return
            }

            // --- FOCUS AREA: SIDEBAR TABS/NAVIGATION ---
            if (area === 'nav') {
                const tabIdx = TABS.findIndex(t => t.id === ct)
                if (action === 'up') {
                    if (tabIdx > 0) { sfx.navigate(); setTab(TABS[tabIdx - 1].id as Tab) }
                } else if (action === 'down') {
                    if (tabIdx < TABS.length - 1) { sfx.navigate(); setTab(TABS[tabIdx + 1].id as Tab) }
                    else { 
                        sfx.navigate()
                        if (r.current.hasAnyChanges) setFocusArea('nav_save')
                        else setFocusArea('nav_close')
                    }
                } else if (action === 'select') {
                    sfx.navigate(); setFocusArea('content'); setContentIndex(0)
                } else if (action === 'back') {
                    handleClose()
                }
                return
            }

            // --- FOCUS AREA: SIDEBAR SAVE BUTTON ---
            if (area === 'nav_save') {
                if (action === 'up') { sfx.navigate(); setFocusArea('nav'); setTab(TABS[TABS.length - 1].id as Tab) }
                else if (action === 'down') { sfx.navigate(); setFocusArea('nav_close') }
                else if (action === 'select') { handleSave() }
                else if (action === 'back') { sfx.navigate(); setFocusArea('nav') }
                return
            }

            // --- FOCUS AREA: SIDEBAR CLOSE BUTTON ---
            if (area === 'nav_close') {
                if (action === 'up') { 
                    sfx.navigate()
                    if (r.current.hasAnyChanges) setFocusArea('nav_save')
                    else { setFocusArea('nav'); setTab(TABS[TABS.length - 1].id as Tab) }
                }
                else if (action === 'select' || action === 'back') { handleClose() }
                return
            }

            // --- FOCUS AREA: CONTENT (MAIN FORM/GRID) ---
            if (area === 'content') {
                // Tab 0: Import (Search, Console dropdown, Grid)
                if (ct === 'import') {
                    const cols = 4
                    const resultsStartAt = 4  // 0=search, 1=console, 2=year, 3=sort, 4+=grid

                    // --- Menus Open Logic ---
                    if (r.current.isConsoleMenuOpen) {
                        const consoleOptions = [{ id: '', name: 'Todas' }, ...r.current.apiConsoles]
                        if (action === 'up') { sfx.navigate(); setConsoleMenuHoverIndex(p => Math.max(0, p - 1)) }
                        else if (action === 'down') { sfx.navigate(); setConsoleMenuHoverIndex(p => Math.min(consoleOptions.length - 1, p + 1)) }
                        else if (action === 'select') {
                            sfx.confirm(); setImportConsole(consoleOptions[r.current.consoleMenuHoverIndex]?.id ?? ''); setIsConsoleMenuOpen(false)
                        } else if (action === 'back') { sfx.navigate(); setIsConsoleMenuOpen(false) }
                        return
                    }

                    if (r.current.isYearMenuOpen) {
                        const yearOptions = [{ id: '', name: 'Cualquier año' }, ...r.current.apiYears.map(y => ({ id: y, name: y }))]
                        if (action === 'up') { sfx.navigate(); setYearMenuHoverIndex(p => Math.max(0, p - 1)) }
                        else if (action === 'down') { sfx.navigate(); setYearMenuHoverIndex(p => Math.min(yearOptions.length - 1, p + 1)) }
                        else if (action === 'select') {
                            sfx.confirm(); setImportYear(yearOptions[r.current.yearMenuHoverIndex]?.id ?? ''); setIsYearMenuOpen(false)
                        } else if (action === 'back') { sfx.navigate(); setIsYearMenuOpen(false) }
                        return
                    }

                    if (r.current.isSortMenuOpen) {
                        if (action === 'up') { sfx.navigate(); setSortMenuHoverIndex(p => Math.max(0, p - 1)) }
                        else if (action === 'down') { sfx.navigate(); setSortMenuHoverIndex(p => Math.min(SORT_OPTIONS.length - 1, p + 1)) }
                        else if (action === 'select') {
                            sfx.confirm(); setImportSort(SORT_OPTIONS[r.current.sortMenuHoverIndex].id); setIsSortMenuOpen(false)
                        } else if (action === 'back') { sfx.navigate(); setIsSortMenuOpen(false) }
                        return
                    }

                    if (action === 'up') {
                        if (cIdx >= resultsStartAt + cols) {
                            sfx.navigate(); setContentIndex(cIdx - cols)
                        } else if (cIdx >= resultsStartAt) {
                            // Up from grid goes back to the filter row
                            sfx.navigate(); setContentIndex(1)
                        } else if (cIdx >= 1) {
                            // Up from filters goes back to search
                            sfx.navigate(); setContentIndex(0)
                        }
                    } else if (action === 'down') {
                        if (cIdx === 0) {
                            // Down from search goes to console selector
                            sfx.navigate(); setContentIndex(1)
                        } else if (cIdx >= 1 && cIdx < resultsStartAt) {
                            // Down from any filter goes to first grid item
                            if (r.current.importResults.length > 0) {
                                sfx.navigate(); setContentIndex(resultsStartAt)
                            }
                        } else {
                            const maxItems = resultsStartAt + r.current.importResults.length
                            const row = Math.floor((cIdx - resultsStartAt) / cols)
                            const totalRows = Math.ceil(r.current.importResults.length / cols)
                            if (row < totalRows - 1) {
                                sfx.navigate(); setContentIndex(Math.min(cIdx + cols, maxItems - 1))
                            }
                        }
                    } else if (action === 'left') {
                        if (cIdx >= 2 && cIdx < resultsStartAt) {
                            sfx.navigate(); setContentIndex(cIdx - 1)
                        } else if (cIdx >= resultsStartAt) {
                            const mod = (cIdx - resultsStartAt) % cols
                            if (mod > 0) { sfx.navigate(); setContentIndex(cIdx - 1) }
                            else { sfx.navigate(); setFocusArea('nav') }
                        } else {
                            sfx.navigate(); setFocusArea('nav')
                        }
                    } else if (action === 'right') {
                        if (cIdx >= 1 && cIdx < resultsStartAt - 1) {
                            sfx.navigate(); setContentIndex(cIdx + 1)
                        } else if (cIdx >= resultsStartAt) {
                            const mod = (cIdx - resultsStartAt) % cols
                            if (mod < cols - 1 && cIdx < resultsStartAt + r.current.importResults.length - 1) {
                                sfx.navigate(); setContentIndex(cIdx + 1)
                            }
                        }
                    } else if (action === 'select') {
                        if (cIdx === 0) {
                            sfx.confirm(); setIsInputEditing(true)
                        } else if (cIdx === 1) {
                            sfx.navigate(); setIsConsoleMenuOpen(true)
                        } else if (cIdx === 2) {
                            sfx.navigate(); setIsYearMenuOpen(true)
                        } else if (cIdx === 3) {
                            sfx.navigate(); setIsSortMenuOpen(true)
                        } else {
                            handleImportGame(r.current.importResults[cIdx - resultsStartAt])
                        }
                    } else if (action === 'back') {
                        sfx.navigate(); setFocusArea('nav')
                    }
                }
                // Tab 1: General Info (Linear List)
                else if (ct === 'general') {
                    const maxItems = 6
                    if (action === 'up') {
                        if (cIdx > 0) { sfx.navigate(); setContentIndex(p => p - 1); setContentSubIndex(0) }
                    } else if (action === 'down') {
                        if (cIdx < maxItems - 1) { sfx.navigate(); setContentIndex(p => p + 1); setContentSubIndex(0) }
                    } else if (action === 'left') {
                        if (cIdx === 1 && r.current.contentSubIndex > 0) {
                            sfx.navigate(); setContentSubIndex(0)
                        }
                    } else if (action === 'right') {
                        if (cIdx === 1 && r.current.contentSubIndex === 0) {
                            sfx.navigate(); setContentSubIndex(1)
                        }
                    } else if (action === 'back') {
                        sfx.navigate(); setFocusArea('nav'); setContentSubIndex(0)
                    } else if (action === 'select') {
                        if (cIdx === 1 && r.current.contentSubIndex === 1) {
                            handleAutoAssignSearchId()
                        } else if (cIdx === 2) {
                            handleBrowseGame()
                        } else if (cIdx === 3) {
                            sfx.open()
                            const emuOptions = [{ id: '', name: 'Nativo' }, ...r.current.emulators];
                            const startIdx = emuOptions.findIndex(o => o.id === r.current.form.emulatorId)
                            setEmuMenuHoverIndex(startIdx >= 0 ? startIdx : 0)
                            setIsEmuMenuOpen(true)
                        } else if (cIdx === 4) {
                            const selectedEmulator = r.current.emulators.find(e => e.id === r.current.form.emulatorId)
                            const platOptions = r.current.platforms.filter(p => selectedEmulator?.platforms?.includes(p.id))
                            if (platOptions.length > 0) {
                                sfx.open()
                                const startIdx = platOptions.findIndex(o => o.id === r.current.form.platformId)
                                setPlatMenuHoverIndex(startIdx >= 0 ? startIdx : 0)
                                setIsPlatMenuOpen(true)
                            } else {
                                sfx.error()
                                showToast('Este emulador no tiene plataformas asociadas', 'warning')
                            }
                        } else {
                            sfx.confirm()
                            setIsInputEditing(true)
                        }
                    }
                } else if (ct === 'media') {
                    const cols = 3
                    const hasRemoveBtn = !!r.current.form[r.current.mediaTarget]
                    const apiImgsStartAt = 3
                    const apiImgs = r.current.apiImages
                    const maxItems = apiImgsStartAt + apiImgs.length
                    
                    if (action === 'up') {
                        if (cIdx >= apiImgsStartAt + cols) { 
                            sfx.navigate(); setContentIndex(cIdx - cols) 
                        } else if (cIdx >= apiImgsStartAt) {
                            sfx.navigate(); setContentIndex(1)
                        } else if (cIdx === 1 || cIdx === 2) {
                            sfx.navigate(); setContentIndex(0)
                        }
                    } else if (action === 'down') {
                        if (cIdx === 0) {
                            sfx.navigate(); setContentIndex(1)
                        } else if (cIdx === 1 || cIdx === 2) {
                            if (apiImgs.length > 0) {
                                sfx.navigate(); setContentIndex(apiImgsStartAt)
                            }
                        } else {
                            const row = Math.floor((cIdx - apiImgsStartAt) / cols)
                            const totalRows = Math.ceil(apiImgs.length / cols)
                            if (row < totalRows - 1) {
                                sfx.navigate(); setContentIndex(Math.min(cIdx + cols, maxItems - 1))
                            }
                        }
                    } else if (action === 'left') {
                        if (cIdx === 2) {
                            sfx.navigate(); setContentIndex(1)
                        } else if (cIdx >= apiImgsStartAt) {
                            if ((cIdx - apiImgsStartAt) % cols !== 0) {
                                sfx.navigate(); setContentIndex(cIdx - 1)
                            }
                        }
                    } else if (action === 'right') {
                        if (cIdx === 1 && hasRemoveBtn) {
                            sfx.navigate(); setContentIndex(2)
                        } else if (cIdx >= apiImgsStartAt) {
                            if ((cIdx - apiImgsStartAt) % cols < cols - 1 && cIdx < maxItems - 1) {
                                sfx.navigate(); setContentIndex(cIdx + 1)
                            }
                        }
                    } else if (action === 'select') {
                        if (cIdx === 0) {
                            sfx.confirm()
                            const startIdx = MEDIA_OPTIONS.findIndex(o => o.id === r.current.mediaTarget)
                            setMenuHoverIndex(startIdx >= 0 ? startIdx : 0)
                            setIsTargetMenuOpen(true)
                        } else if (cIdx === 1) {
                            sfx.confirm(); setIsInputEditing(true); document.getElementById('ag-media-url-input')?.focus()
                        } else if (cIdx === 2) {
                            sfx.cancel(); setForm(p => ({ ...p, [r.current.mediaTarget]: '' }))
                        } else {
                            const img = r.current.apiImages[cIdx - apiImgsStartAt]
                            if (img) {
                                sfx.confirm()
                                setForm(p => ({ ...p, [r.current.mediaTarget]: img.url }))
                            }
                        }
                    } else if (action === 'back') {
                        sfx.navigate(); setFocusArea('nav')
                    }
                } else if (ct === 'saves') {
                    const cols = 4
                    // @ts-ignore
const hasBtns = !!(r.current.editSlot && r.current.form.savesPath)
                    const syncIdx = 5
                    const savesStartAt = 6
                    const sFiles = r.current.saveFiles || []
                    const maxSaves = savesStartAt + sFiles.length

                    if (action === 'up') {
                        if (cIdx >= savesStartAt) {
                            sfx.navigate(); setContentIndex(hasBtns ? 3 : syncIdx)
                        } else if (cIdx === 5) {
                            // sync button: no hacer nada
                        } else if (hasBtns && cIdx === 4) {
                            sfx.navigate(); setContentIndex(3)
                        } else if (hasBtns && cIdx === 3) {
                            sfx.navigate(); setContentIndex(2)
                        } else if (cIdx > 0) {
                            sfx.navigate(); setContentIndex(cIdx - 1)
                        }
                    } else if (action === 'down') {
                        if (cIdx === 0) {
                            sfx.navigate(); setContentIndex(1)
                        } else if (cIdx === syncIdx) {
                            sfx.navigate(); setContentIndex(1)
                        } else if (cIdx === 1) {
                            sfx.navigate(); setContentIndex(2)
                        } else if (cIdx === 2) {
                            if (hasBtns) {
                                sfx.navigate(); setContentIndex(3)
                            } else if (sFiles.length > 0) {
                                sfx.navigate(); setContentIndex(savesStartAt)
                            }
                        } else if (cIdx === 3 && hasBtns) {
                            if (sFiles.length > 0) {
                                sfx.navigate(); setContentIndex(savesStartAt)
                            }
                        } else if (cIdx === 4 && hasBtns) {
                            if (sFiles.length > 0) {
                                sfx.navigate(); setContentIndex(savesStartAt)
                            }
                        } else {
                            const row = Math.floor((cIdx - savesStartAt) / cols)
                            const totalRows = Math.ceil(sFiles.length / cols)
                            if (row < totalRows - 1) {
                                sfx.navigate(); setContentIndex(Math.min(cIdx + cols, maxSaves - 1))
                            }
                        }
                    } else if (action === 'left') {
                        if (cIdx === syncIdx) {
                            sfx.navigate(); setContentIndex(0)
                        } else if (cIdx === 4 && hasBtns) {
                            sfx.navigate(); setContentIndex(3)
                        } else if (cIdx >= savesStartAt) {
                            if ((cIdx - savesStartAt) % cols !== 0) {
                                sfx.navigate(); setContentIndex(cIdx - 1)
                            }
                        }
                    } else if (action === 'right') {
                        if (cIdx === 0) {
                            sfx.navigate(); setContentIndex(syncIdx)
                        } else if (cIdx === 3 && hasBtns) {
                            sfx.navigate(); setContentIndex(4)
                        } else if (cIdx >= savesStartAt) {
                            if ((cIdx - savesStartAt) % cols < cols - 1 && cIdx < maxSaves - 1) {
                                sfx.navigate(); setContentIndex(cIdx + 1)
                            }
                        }
                    } else if (action === 'select') {
                        if (cIdx === 0) {
                            handleBrowseSavesPath()
                        } else if (cIdx === 1) {
                            sfx.confirm(); setIsInputEditing(true); document.getElementById('ag-saves-ext-input')?.focus()
                        } else if (cIdx === 2) {
                            if (hasPremiumAccess) {
                                sfx.confirm(); setForm(p => ({ ...p, cloudSyncEnabled: !p.cloudSyncEnabled }))
                            } else {
                                sfx.cancel()
                            }
                        } else if (cIdx === 3 && hasBtns) {
                            if (hasPremiumAccess) handlePushCloud(); else sfx.cancel()
                        } else if (cIdx === 4 && hasBtns) {
                            if (hasPremiumAccess) handlePullCloud(); else sfx.cancel()
                        } else if (cIdx === syncIdx) {
                            handleSyncSavesPath()
                        } else if (cIdx >= savesStartAt) {
                            const sIdx = cIdx - savesStartAt
                            const sf = r.current.saveFiles[sIdx]
                            if (sf) handleOpenSaveDetail(sf)
                        }
                    } else if (action === 'back') {
                        sfx.navigate(); setFocusArea('nav')
                    }
                } else if (ct === 'options') {
                    if (action === 'up') {
                        if (cIdx > 0) { sfx.navigate(); setContentIndex(cIdx - 1) }
                    } else if (action === 'down') {
                        if (cIdx < 5) { sfx.navigate(); setContentIndex(cIdx + 1) }
                    } else if (action === 'left') {
                        if (cIdx === 2) {
                            const curIdx = LABEL_POS_OPTIONS.findIndex(o => o.id === r.current.form.labelPosition)
                            const prevIdx = (curIdx - 1 + LABEL_POS_OPTIONS.length) % LABEL_POS_OPTIONS.length
                            sfx.navigate(); setForm(p => ({ ...p, labelPosition: LABEL_POS_OPTIONS[prevIdx].id as any }))
                        } else if (cIdx === 4) {
                            const curIdx = ICON_POS_OPTIONS.findIndex(o => o.id === r.current.form.iconPosition)
                            const prevIdx = (curIdx - 1 + ICON_POS_OPTIONS.length) % ICON_POS_OPTIONS.length
                            sfx.navigate(); setForm(p => ({ ...p, iconPosition: ICON_POS_OPTIONS[prevIdx].id as any }))
                        } else if (cIdx === 5) {
                            const curIdx = ICON_SIZE_OPTIONS.findIndex(o => o.id === (r.current.form.iconSize || 64))
                            const prevIdx = (curIdx - 1 + ICON_SIZE_OPTIONS.length) % ICON_SIZE_OPTIONS.length
                            sfx.navigate(); setForm(p => ({ ...p, iconSize: ICON_SIZE_OPTIONS[prevIdx].id as any }))
                        }
                    } else if (action === 'right') {
                        if (cIdx === 2) {
                            const curIdx = LABEL_POS_OPTIONS.findIndex(o => o.id === r.current.form.labelPosition)
                            const nextIdx = (curIdx + 1) % LABEL_POS_OPTIONS.length
                            sfx.navigate(); setForm(p => ({ ...p, labelPosition: LABEL_POS_OPTIONS[nextIdx].id as any }))
                        } else if (cIdx === 4) {
                            const curIdx = ICON_POS_OPTIONS.findIndex(o => o.id === r.current.form.iconPosition)
                            const nextIdx = (curIdx + 1) % ICON_POS_OPTIONS.length
                            sfx.navigate(); setForm(p => ({ ...p, iconPosition: ICON_POS_OPTIONS[nextIdx].id as any }))
                        } else if (cIdx === 5) {
                            const curIdx = ICON_SIZE_OPTIONS.findIndex(o => o.id === (r.current.form.iconSize || 64))
                            const nextIdx = (curIdx + 1) % ICON_SIZE_OPTIONS.length
                            sfx.navigate(); setForm(p => ({ ...p, iconSize: ICON_SIZE_OPTIONS[nextIdx].id as any }))
                        }
                    } else if (action === 'select') {
                        if (cIdx === 0) {
                            sfx.confirm(); setForm(p => ({ ...p, showLabel: !p.showLabel }))
                        } else if (cIdx === 1) {
                            sfx.confirm(); setForm(p => ({ ...p, showLogo: !p.showLogo }))
                        } else if (cIdx === 3) {
                            sfx.confirm(); setForm(p => ({ ...p, showIcon: !p.showIcon }))
                        }
                    } else if (action === 'back') {
                        sfx.navigate(); setFocusArea('nav')
                    }
                }
                return
            }
        }
        window.addEventListener('panel-move', handler)
        return () => window.removeEventListener('panel-move', handler)
    }, [handleClose])

    // File pickers
    const handleBrowseGame = useCallback(async () => {
        const emuId = r.current.form.emulatorId
        const emuList = r.current.emulators
        const isRom = !!emuList.find(e => e.id === emuId)
        const path = await window.api.browseFile({
            title: isRom ? 'Seleccionar ROM' : 'Seleccionar Ejecutable',
            filters: isRom
                ? [{ name: 'ROMs', extensions: ['iso', 'wux', 'nsp', 'xci', 'rvz', 'wbfs', 'gcm', 'cue', 'chd', 'nro', 'nes', 'sfc'] }, { name: 'Todos', extensions: ['*'] }]
                : [{ name: 'Ejecutables', extensions: ['exe', 'app', 'sh'] }, { name: 'Todos', extensions: ['*'] }]
        })
        if (path) setForm(prev => ({ ...prev, path, name: prev.name || path.split('\\').pop()?.replace(/\.[^/.]+$/, '') || '' }))
    }, [])

    const handleBrowseSavesPath = useCallback(async () => {
        const path = await window.api.browseDirectory({
            title: 'Seleccionar Carpeta de Guardados',
        })
        if (path) setForm(prev => ({ ...prev, savesPath: path }))
    }, [])

    const handleSyncSavesPath = useCallback(async () => {
        const searchId = r.current.form.searchId
        if (!searchId) { sfx.error(); showToast('No hay un ID de búsqueda para sincronizar', 'warning'); return }
        const gamePath = r.current.form.path
        try {
            const gameData = await window.api.gameApi.getGameById(searchId)
            if (!gameData || !gameData.savesPath) {
                sfx.error(); showToast('No se encontraron datos de guardado en la web', 'warning'); return
            }
            const resolved = resolveSavesPath(gameData.savesPath, gamePath)
            setForm(p => ({
                ...p,
                savesPath: resolved,
                savesExtension: gameData.savesExtension ?? p.savesExtension,
            }))
            sfx.confirm()
            showToast('Ruta de guardados sincronizada', 'success')
        } catch {
            sfx.error()
            showToast('Error al conectar con la web', 'error')
        }
    }, [showToast])

    const handlePushCloud = useCallback(async () => {
        if (!editSlot || syncingCloud) return
        setSyncingCloud(true)
        const res = await window.api.saves.pushCloud(editSlot.id, { savesPath: form.savesPath, savesExtension: form.savesExtension })
        setSyncingCloud(false)
        if (res.success) {
            showToast('Partidas locales subidas a la nube con éxito', 'success')
            sfx.confirm()
        } else {
            showToast(res.error || 'Error al subir a la nube', 'error')
            sfx.cancel()
        }
    }, [editSlot, form.savesPath, form.savesExtension, syncingCloud, showToast])

    const handlePullCloud = useCallback(async () => {
        if (!editSlot || syncingCloud) return
        setSyncingCloud(true)
        const res = await window.api.saves.pullCloud(editSlot.id, { savesPath: form.savesPath, savesExtension: form.savesExtension })
        setSyncingCloud(false)
        if (res.success) {
            showToast('Partidas descargadas de la nube', 'success')
            sfx.confirm()
            if (form.savesPath) {
                window.api.saves.getFiles(form.savesPath, form.savesExtension || undefined).then(setSaveFiles)
            }
        } else {
            showToast(res.error || 'Error al descargar de la nube', 'error')
            sfx.cancel()
        }
    }, [editSlot, syncingCloud, showToast, form.savesPath, form.savesExtension])

    const handleOpenSaveDetail = useCallback((sf: import('../../../shared/types').SaveFileInfo) => {
        setSelectedSaveFile(sf)
        setSaveDescriptionInput(sf.description || '')
    }, [])

    const handleCloseSaveDetail = useCallback(() => {
        setSelectedSaveFile(null)
        setSaveDescriptionInput('')
    }, [])

    const handleDeleteCloudSave = useCallback(async () => {
        if (!selectedSaveFile || !editSlot) return
        setSavingDesc(true)
        const res = await window.api.saves.deleteCloud(editSlot.id, selectedSaveFile.filename)
        setSavingDesc(false)
        if (res.success) {
            setSelectedSaveFile(null)
            setSaveDescriptionInput('')
            sfx.confirm()
            showToast('Archivo eliminado de la nube', 'success')
        } else {
            sfx.error()
            showToast(res.error || 'Error al eliminar de la nube', 'error')
        }
    }, [selectedSaveFile, editSlot, showToast])

    const saveDetailFocusRef = useRef(0)
    const textareaEditingRef = useRef(false)
    useEffect(() => {
        if (!selectedSaveFile) return
        saveDetailFocusRef.current = 1
        setSaveDetailFocusIndex(1)
        textareaEditingRef.current = false
        const handler = (e: Event) => {
            const action = (e as CustomEvent<string>).detail
            const idx = saveDetailFocusRef.current

            // ── Textarea editing mode ──
            if (idx === 1 && textareaEditingRef.current) {
                if (action === 'back' || action === 'escape') {
                    textareaEditingRef.current = false
                    const el = document.getElementById('save-detail-btn-1') as HTMLTextAreaElement
                    el?.blur()
                    sfx.cancel()
                    return
                }
                if (action === 'select') {
                    textareaEditingRef.current = false
                    sfx.cancel()
                    return
                }
                // arrow keys etc → exit editing and navigate
                textareaEditingRef.current = false
            }

            if (action === 'up') {
                if (idx === 4) { saveDetailFocusRef.current = 2; setSaveDetailFocusIndex(2); sfx.navigate(); return }
                if (idx === 2) { saveDetailFocusRef.current = 1; setSaveDetailFocusIndex(1); sfx.navigate(); return }
                if (idx === 1) { saveDetailFocusRef.current = 0; setSaveDetailFocusIndex(0); sfx.navigate(); return }
                if (idx === 3) { saveDetailFocusRef.current = 2; setSaveDetailFocusIndex(2); sfx.navigate(); return }
                if (idx === 0) { /* nothing above close */ return }
            }
            if (action === 'down') {
                if (idx === 0) { saveDetailFocusRef.current = 1; setSaveDetailFocusIndex(1); sfx.navigate(); return }
                if (idx === 1) { saveDetailFocusRef.current = 2; setSaveDetailFocusIndex(2); sfx.navigate(); return }
                if (idx === 2) { saveDetailFocusRef.current = 4; setSaveDetailFocusIndex(4); sfx.navigate(); return }
                if (idx === 3) { return }
                if (idx === 4) { return }
            }
            if (action === 'left') {
                if (idx === 3) { saveDetailFocusRef.current = 2; setSaveDetailFocusIndex(2); sfx.navigate(); return }
                if (idx === 2) { saveDetailFocusRef.current = 1; setSaveDetailFocusIndex(1); sfx.navigate(); return }
            }
            if (action === 'right') {
                if (idx === 2) { saveDetailFocusRef.current = 3; setSaveDetailFocusIndex(3); sfx.navigate(); return }
            }
            if (action === 'select') {
                if (idx === 1) {
                    textareaEditingRef.current = true
                    const el = document.getElementById('save-detail-btn-1') as HTMLTextAreaElement
                    el?.focus()
                    sfx.confirm()
                    return
                }
                const el = document.getElementById(`save-detail-btn-${idx}`)
                if (el) { sfx.confirm(); el.click() }
                return
            }
            if (action === 'back' || action === 'escape') {
                handleCloseSaveDetail()
            }
        }
        window.addEventListener('panel-move', handler)
        return () => window.removeEventListener('panel-move', handler)
    }, [selectedSaveFile, handleCloseSaveDetail])

    const handleSaveDescription = useCallback(async () => {
        if (!selectedSaveFile) return
        setSavingDesc(true)
        const res = await window.api.saves.saveDescription(selectedSaveFile.path, saveDescriptionInput)
        setSavingDesc(false)
        if (res.success) {
            setSaveFiles(prev => prev.map(sf =>
                sf.path === selectedSaveFile.path
                    ? { ...sf, description: saveDescriptionInput.trim() || undefined }
                    : sf
            ))
            setSelectedSaveFile(null)
            setSaveDescriptionInput('')
            sfx.confirm()
            showToast('Descripción guardada', 'success')
        } else {
            sfx.error()
            showToast('Error al guardar la descripción', 'error')
        }
    }, [selectedSaveFile, saveDescriptionInput, showToast])

    const handleDeleteSaveFile = useCallback(async () => {
        if (!selectedSaveFile) return
        setSavingDesc(true)
        const res = await window.api.saves.deleteFile(selectedSaveFile.path)
        setSavingDesc(false)
        if (res.success) {
            setSaveFiles(prev => prev.filter(sf => sf.path !== selectedSaveFile.path))
            setSelectedSaveFile(null)
            setSaveDescriptionInput('')
            sfx.confirm()
            showToast('Archivo eliminado', 'success')
        } else {
            sfx.error()
            showToast('Error al eliminar el archivo', 'error')
        }
    }, [selectedSaveFile, showToast])

    // @ts-ignore
const handleBrowseArtwork = useCallback(async () => {
        const target = r.current.mediaTarget
        const path = await window.api.browseFile({
            title: 'Seleccionar Imagen',
            filters: [{ name: 'Imágenes', extensions: ['jpg', 'png', 'webp'] }]
        })
        if (!path) return
        const res = await window.api.artwork.import(path)
        if (res.success && res.url) setForm(prev => ({ ...prev, [target]: res.url! }))
        else { sfx.error(); setError('Error copiando imagen.') }
    }, [])

    const handleSave = async () => {
        const f = r.current.form
        const emus = r.current.emulators
        const slot = r.current.editSlot

        setError(null)
        if (!f.name.trim()) { sfx.error(); setError('Falta asignar un nombre.'); return }

        setIsSaving(true)
        try {
            const slotId = slot?.id ?? `game-${Date.now()}`
            const selectedEmulator = emus.find(e => e.id === f.emulatorId)
            const selectedPlatform = r.current.platforms.find(p => p.id === f.platformId)
            const newSlot: HomeSlot = {
                ...(slot ?? {}),
                id: slotId,
                icon: selectedPlatform?.icon || 'mdi:controller',
                label: f.name.trim(),
                squareImage: f.squareImage || slot?.squareImage,
                logoImage: f.logoImage || slot?.logoImage,
                verticalImage: f.verticalImage || slot?.verticalImage,
                horizontalImage: f.horizontalImage || slot?.horizontalImage,
                iconImage: f.iconImage || slot?.iconImage,
                backgroundImage: f.backgroundImage || slot?.backgroundImage,
                coverImage: f.coverImage || slot?.coverImage,
                showLabel: f.showLabel,
                showLogo: f.showLogo,
                labelPosition: f.labelPosition,
                showIcon: f.showIcon,
                iconPosition: f.iconPosition,
                iconSize: f.iconSize,
                onClick: 'run-game',
                onMouseEnter: 'mouse-enter-grid-item',
                onMouseLeave: 'mouse-leave-grid-item',
                game: {
                    id: slot?.game?.id ?? slotId,
                    name: f.name.trim(),
                    searchId: f.searchId.trim(),
                    path: f.path.trim(),
                    emulator: selectedEmulator,
                    platform: selectedPlatform,
                    processName: f.processName.trim(),
                    playtimeMinutes: slot?.game?.playtimeMinutes ?? 0,
                    coverUrl: f.coverImage || f.squareImage || slot?.squareImage,
                    backgroundUrl: f.backgroundImage || f.horizontalImage || slot?.backgroundImage,
                    savesPath: f.savesPath?.trim() || undefined,
                    savesExtension: f.savesExtension?.trim() || undefined,
                    cloudSyncEnabled: f.cloudSyncEnabled || false
                }
            }
            const res = await window.api.slots.add(newSlot)
            if (res.success) {
                sfx.confirm()
                showToast(slot ? 'Juego actualizado' : 'Juego añadido', 'success')
                forceClose()
            } else {
                sfx.error()
                showToast('Fallo al guardar', 'error')
                setError('Fallo al guardar.')
                setIsSaving(false)
            }
        } catch {
            sfx.error()
            showToast('Error inesperado', 'error')
            setError('Error inesperado.')
            setIsSaving(false)
        }
    }

    const isFocused = (area: FocusArea, idx?: number) => {
        if (isTargetMenuOpen) return false
        if (focusArea !== area) return false
        if (idx === undefined) return true
        return contentIndex === idx
    }

    const dynamicTabs = TABS.map(t => ({
        ...t,
        hasChanges: hasSectionChanges(t.id as Tab)
    }))

    // Resolve artwork URL for preview based on media target
    const targetVal = form[mediaTarget]
    const previewUrl = targetVal
        ? (targetVal.startsWith('http') || targetVal.startsWith('media://')
            ? targetVal
            : `media://${targetVal}`)
        : null

    return (
        <SidePanel
            visible={visible}
            tabs={dynamicTabs}
            activeTab={tab}
            focusArea={focusArea as any}
            onTabChange={(id) => { setTab(id as Tab); setFocusArea('content'); setContentIndex(0) }}
            onClose={handleClose}
            onSave={handleSave}
            hasUnsavedChanges={hasAnyChanges}
            titleOverride={isEditing ? 'Editar Juego' : 'Añadir Juego'}
        >
            {error && <div className="cp-form__error" style={{ marginBottom: 16 }}><Icon icon="mynaui:info-circle" /> {error}</div>}

            {/* ── IMPORT TAB ── */}
            {tab === 'import' && (
                <div className="cp-form ag-import-tab">
                    {/* Search bar */}
                    <div style={{ transition: 'all 0.3s' }}>
                        <div
                            className={`ag-field-row ag-import-search ${isFocused('content', 0) ? 'ag-field-row--focused' : ''} ${isInputEditing && isFocused('content', 0) ? 'ag-field-row--editing' : ''}`}
                            onClick={() => { setFocusArea('content'); setContentIndex(0); setIsInputEditing(true) }}
                        >
                            <Icon icon="mynaui:search" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Buscar Juego</div>
                                <input
                                    id="ag-import-query"
                                    className={`ag-field-input ${isInputEditing && isFocused('content', 0) ? 'ag-field-input--editing' : ''}`}
                                    value={importQuery}
                                    onChange={e => setImportQuery(e.target.value)}
                                    placeholder="Nombre del juego..."
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Console filter dropdown */}
                    {apiConsoles.length > 0 && (
                        <div style={{ display: 'flex', gap: '12px', marginBottom: 20 }}>
                        {/* Console dropdown */}
                        {(() => {
                            const consoleOptions = [{ id: '', name: 'Todas las consolas' }, ...apiConsoles]
                            const activeLabel = consoleOptions.find(o => o.id === importConsole)?.name || 'Todas'
                            return (
                                <div
                                    className={`ag-field-row ${isFocused('content', 1) && !isConsoleMenuOpen ? 'ag-field-row--focused' : ''} ${isConsoleMenuOpen ? 'ag-field-row--menu-open' : ''}`}
                                    style={{ flex: 1.5, marginBottom: 0 }}
                                    onClick={() => {
                                        setFocusArea('content'); setContentIndex(1)
                                        if (!isConsoleMenuOpen) {
                                            const idx = consoleOptions.findIndex(c => c.id === importConsole)
                                            setConsoleMenuHoverIndex(idx >= 0 ? idx : 0)
                                        }
                                        setIsConsoleMenuOpen(v => !v)
                                    }}
                                >
                                    <Icon icon="mynaui:monitor" className="ag-field-icon" style={{ fontSize: 18 }} />
                                    <div className="ag-field-body">
                                        <div className="ag-field-label">Consola</div>
                                        <div className="ag-custom-select" style={{ width: '100%' }}>
                                            <div className="ag-custom-select__value">
                                                {activeLabel}
                                                <Icon icon={isConsoleMenuOpen ? 'mynaui:chevron-up' : 'mynaui:chevron-down'} />
                                            </div>
                                            {isConsoleMenuOpen && (
                                                <div className="ag-custom-select__dropdown" style={{ zIndex: 100 }}>
                                                    {consoleOptions.map((opt, i) => (
                                                        <div
                                                            key={opt.id}
                                                            id={`ag-console-opt-${i}`}
                                                            className={`ag-custom-select__option ${consoleMenuHoverIndex === i ? 'active' : ''}`}
                                                            onMouseEnter={() => setConsoleMenuHoverIndex(i)}
                                                            onClick={e => {
                                                                e.stopPropagation(); setImportConsole(opt.id); setIsConsoleMenuOpen(false); sfx.confirm()
                                                            }}
                                                        >
                                                            {opt.name}
                                                            {consoleMenuHoverIndex === i && <Icon icon="mynaui:check" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Year dropdown */}
                        {(() => {
                            const yearOptions = [{ id: '', name: 'Cualquier año' }, ...apiYears.map(y => ({ id: y, name: y }))]
                            const activeLabel = yearOptions.find(o => o.id === importYear)?.name || 'Cualquiera'
                            return (
                                <div
                                    className={`ag-field-row ${isFocused('content', 2) && !isYearMenuOpen ? 'ag-field-row--focused' : ''} ${isYearMenuOpen ? 'ag-field-row--menu-open' : ''}`}
                                    style={{ flex: 1, marginBottom: 0 }}
                                    onClick={() => {
                                        setFocusArea('content'); setContentIndex(2)
                                        if (!isYearMenuOpen) {
                                            const idx = yearOptions.findIndex(y => y.id === importYear)
                                            setYearMenuHoverIndex(idx >= 0 ? idx : 0)
                                        }
                                        setIsYearMenuOpen(v => !v)
                                    }}
                                >
                                    <Icon icon="mynaui:calendar" className="ag-field-icon" style={{ fontSize: 18 }} />
                                    <div className="ag-field-body">
                                        <div className="ag-field-label">Año</div>
                                        <div className="ag-custom-select" style={{ width: '100%' }}>
                                            <div className="ag-custom-select__value">
                                                {activeLabel}
                                                <Icon icon={isYearMenuOpen ? 'mynaui:chevron-up' : 'mynaui:chevron-down'} />
                                            </div>
                                            {isYearMenuOpen && (
                                                <div className="ag-custom-select__dropdown" style={{ zIndex: 100 }}>
                                                    {yearOptions.map((opt, i) => (
                                                        <div
                                                            key={opt.id}
                                                            id={`ag-year-opt-${i}`}
                                                            className={`ag-custom-select__option ${yearMenuHoverIndex === i ? 'active' : ''}`}
                                                            onMouseEnter={() => setYearMenuHoverIndex(i)}
                                                            onClick={e => {
                                                                e.stopPropagation(); setImportYear(opt.id); setIsYearMenuOpen(false); sfx.confirm()
                                                            }}
                                                        >
                                                            {opt.name}
                                                            {yearMenuHoverIndex === i && <Icon icon="mynaui:check" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Sort dropdown */}
                        {(() => {
                            const activeLabel = SORT_OPTIONS.find(o => o.id === importSort)?.name || 'Orden'
                            return (
                                <div
                                    className={`ag-field-row ${isFocused('content', 3) && !isSortMenuOpen ? 'ag-field-row--focused' : ''} ${isSortMenuOpen ? 'ag-field-row--menu-open' : ''}`}
                                    style={{ flex: 1.2, marginBottom: 0 }}
                                    onClick={() => {
                                        setFocusArea('content'); setContentIndex(3)
                                        if (!isSortMenuOpen) {
                                            const idx = SORT_OPTIONS.findIndex(s => s.id === importSort)
                                            setSortMenuHoverIndex(idx >= 0 ? idx : 0)
                                        }
                                        setIsSortMenuOpen(v => !v)
                                    }}
                                >
                                    <Icon icon="mynaui:sort-one" className="ag-field-icon" style={{ fontSize: 18 }} />
                                    <div className="ag-field-body">
                                        <div className="ag-field-label">Orden</div>
                                        <div className="ag-custom-select" style={{ width: '100%' }}>
                                            <div className="ag-custom-select__value">
                                                {activeLabel}
                                                <Icon icon={isSortMenuOpen ? 'mynaui:chevron-up' : 'mynaui:chevron-down'} />
                                            </div>
                                            {isSortMenuOpen && (
                                                <div className="ag-custom-select__dropdown" style={{ zIndex: 100 }}>
                                                    {SORT_OPTIONS.map((opt, i) => (
                                                        <div
                                                            key={opt.id}
                                                            id={`ag-sort-opt-${i}`}
                                                            className={`ag-custom-select__option ${sortMenuHoverIndex === i ? 'active' : ''}`}
                                                            onMouseEnter={() => setSortMenuHoverIndex(i)}
                                                            onClick={e => {
                                                                e.stopPropagation(); setImportSort(opt.id); setIsSortMenuOpen(false); sfx.confirm()
                                                            }}
                                                        >
                                                            {opt.name}
                                                            {sortMenuHoverIndex === i && <Icon icon="mynaui:check" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                    )}

                    {/* Results Grid */}
                    <div className={`ag-import-grid-wrap ${isAMenuOpen ? 'ag-media-content--dimmed' : ''}`} style={{ transition: 'all 0.3s' }}>
                        <div className="ag-import-grid" id="ag-import-grid">
                        {importLoading ? (
                            <div className="ag-import-empty">
                                <Icon icon="mynaui:spinner" className="ag-import-empty-icon" style={{ animation: 'spin 1s linear infinite' }} />
                                <span>Buscando...</span>
                            </div>
                        ) : importResults.length > 0 ? (
                            importResults.map((res: any, i: number) => (
                                <div
                                    key={res.id}
                                    id={`ag-import-card-${i}`}
                                    className={`ag-import-card ${isFocused('content', i + 4) ? 'ag-import-card--focused' : ''}`}
                                    onClick={() => {
                                        setFocusArea('content')
                                        setContentIndex(i + 4)
                                        handleImportGame(res)
                                    }}
                                >
                                    <div className="ag-import-card__cover">
                                        <div className="ag-import-card__badges">
                                            {getGameConsoles(res).map(name => (
                                                <div key={name} className="ag-import-card__badge">
                                                    {name}
                                                </div>
                                            ))}
                                        </div>
                                        {res.images?.cover ? (
                                            <img
                                                src={res.images.cover}
                                                alt={res.name}
                                                onError={e => {
                                                    const t = e.target as HTMLImageElement
                                                    t.style.display = 'none'
                                                    t.nextElementSibling?.classList.remove('ag-import-card__no-cover--hidden')
                                                }}
                                            />
                                        ) : null}
                                        <div className={`ag-import-card__no-cover ${res.images?.cover ? 'ag-import-card__no-cover--hidden' : ''}`}>
                                            <span className="ag-import-card__no-cover-q">?</span>
                                            <span className="ag-import-card__no-cover-label">Sin portada</span>
                                        </div>
                                    </div>
                                    <div className="ag-import-card__info">
                                        <div className="ag-import-card__name" title={res.name}>{res.name}</div>
                                        <div className="ag-import-card__meta">
                                            {res.releaseDate && (
                                                <span className="ag-import-card__year">
                                                    {new Date(res.releaseDate).getFullYear()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="ag-import-empty">
                                <Icon icon="mynaui:cloud-search" className="ag-import-empty-icon" />
                                <span>
                                    {importQuery
                                        ? `Sin resultados para «${importQuery}»`
                                        : 'Escribe para buscar juegos en la base de datos'}
                                </span>
                            </div>
                        )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── GENERAL TAB ── */}
            {tab === 'general' && (
                <div className="cp-form ag-general">
                    <div className={isEmuMenuOpen || isPlatMenuOpen ? 'ag-media-content--dimmed' : ''} style={{ transition: 'all 0.3s' }}>
                        {/* Game Name */}
                        <div 
                            className={`ag-field-row ${isFocused('content', 0) ? 'ag-field-row--focused' : ''} ${isInputEditing && isFocused('content', 0) ? 'ag-field-row--editing' : ''}`}
                            onClick={() => { setFocusArea('content'); setContentIndex(0); setIsInputEditing(true) }}
                        >
                            <Icon icon="mynaui:type" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Nombre del Juego</div>
                                <input 
                                    id="ag-name"
                                    className={`ag-field-input ${isInputEditing && isFocused('content', 0) ? 'ag-field-input--editing' : ''}`}
                                    value={form.name} 
                                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Nombre visible..."
                                    disabled={isSaving}
                                />
                            </div>
                        </div>

                        {/* Search ID */}
                        <div 
                            className={`ag-field-row ${isFocused('content', 1) ? 'ag-field-row--focused' : ''} ${isInputEditing && isFocused('content', 1) ? 'ag-field-row--editing' : ''}`}
                            onClick={() => { setFocusArea('content'); setContentIndex(1); setIsInputEditing(true) }}
                        >
                            <Icon icon="mynaui:id" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">ID de Búsqueda (Slug)</div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <input 
                                        id="ag-searchid"
                                        className={`ag-field-input ${isInputEditing && isFocused('content', 1) && contentSubIndex === 0 ? 'ag-field-input--editing' : ''}`}
                                        value={form.searchId} 
                                        onChange={e => setForm(p => ({ ...p, searchId: e.target.value }))}
                                        placeholder="the-legend-of-zelda..."
                                        disabled={isSaving}
                                    />
                                    <button 
                                        className={`ag-field-btn ${isFocused('content', 1) && contentSubIndex === 1 ? 'active' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); handleAutoAssignSearchId() }}
                                    >
                                        <Icon icon="mynaui:magic" />
                                        Auto
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Executable Path */}
                        <div 
                            className={`ag-field-row ${isFocused('content', 2) ? 'ag-field-row--focused' : ''}`}
                            onClick={() => { setFocusArea('content'); setContentIndex(2); handleBrowseGame() }}
                        >
                            <Icon icon="mynaui:folder" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Ruta del Juego o ROM</div>
                                <div className="ag-field-path-row">
                                    <div className="ag-field-path-text">{form.path || 'Seleccionar archivo...'}</div>
                                    <Icon icon="mynaui:external-link" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Emulator Selector */}
                    <div 
                        className={`ag-field-row ${isFocused('content', 3) && !isEmuMenuOpen ? 'ag-field-row--focused' : ''} ${isEmuMenuOpen ? 'ag-field-row--menu-open' : ''} ${isPlatMenuOpen ? 'ag-media-content--dimmed' : ''}`}
                        onClick={() => { 
                            setFocusArea('content'); 
                            setContentIndex(3); 
                            if (!isEmuMenuOpen) {
                                const emuOptions = [{ id: '', name: 'Nativo' }, ...emulators];
                                const startIdx = emuOptions.findIndex(o => o.id === form.emulatorId)
                                setEmuMenuHoverIndex(startIdx >= 0 ? startIdx : 0)
                            }
                            setIsEmuMenuOpen(!isEmuMenuOpen) 
                        }}
                    >
                        <Icon icon="mynaui:chip" className="ag-field-icon" />
                        <div className="ag-field-body" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="ag-field-label" style={{ marginBottom: 0 }}>Emulador</div>
                            
                            <div className="ag-custom-select">
                                <div className="ag-custom-select__value">
                                    {emulators.find(e => e.id === form.emulatorId)?.name || 'Nativo'}
                                    <Icon icon={isEmuMenuOpen ? 'mynaui:chevron-up' : 'mynaui:chevron-down'} />
                                </div>

                                {isEmuMenuOpen && (
                                    <div className="ag-custom-select__dropdown" style={{ zIndex: 100 }}>
                                        {[{ id: '', name: 'Nativo' }, ...emulators].map((opt, i) => (
                                            <div 
                                                key={opt.id} 
                                                id={`ag-emu-opt-${i}`}
                                                className={`ag-custom-select__option ${emuMenuHoverIndex === i ? 'active' : ''}`}
                                                onMouseEnter={() => setEmuMenuHoverIndex(i)}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setForm(p => ({ ...p, emulatorId: opt.id, platformId: '', path: '' }))
                                                    setIsEmuMenuOpen(false)
                                                    sfx.confirm()
                                                }}
                                            >
                                                {opt.name}
                                                {emuMenuHoverIndex === i && <Icon icon="mynaui:check" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Platform Selector */}
                    <div 
                        className={`ag-field-row ${isFocused('content', 4) && !isPlatMenuOpen ? 'ag-field-row--focused' : ''} ${isPlatMenuOpen ? 'ag-field-row--menu-open' : ''} ${isEmuMenuOpen ? 'ag-media-content--dimmed' : ''}`}
                        onClick={() => { 
                            const selectedEmulator = emulators.find(e => e.id === form.emulatorId)
                            const platOptions = platforms.filter(p => selectedEmulator?.platforms?.includes(p.id))
                            
                            if (platOptions.length > 0) {
                                setFocusArea('content'); 
                                setContentIndex(4); 
                                if (!isPlatMenuOpen) {
                                    const startIdx = platOptions.findIndex(o => o.id === form.platformId)
                                    setPlatMenuHoverIndex(startIdx >= 0 ? startIdx : 0)
                                }
                                setIsPlatMenuOpen(!isPlatMenuOpen)
                            } else {
                                sfx.error()
                                showToast('Este emulador no tiene plataformas asociadas', 'warning')
                            }
                        }}
                    >
                        <Icon icon="mynaui:grid-nine" className="ag-field-icon" />
                        <div className="ag-field-body" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="ag-field-label" style={{ marginBottom: 0 }}>Plataforma</div>
                            
                            <div className="ag-custom-select">
                                <div className="ag-custom-select__value">
                                    {platforms.find(p => p.id === form.platformId)?.name || 'Seleccionar...'}
                                    <Icon icon={isPlatMenuOpen ? 'mynaui:chevron-up' : 'mynaui:chevron-down'} />
                                </div>

                                {isPlatMenuOpen && (
                                    <div className="ag-custom-select__dropdown" style={{ zIndex: 100 }}>
                                        {platforms.filter(p => emulators.find(e => e.id === form.emulatorId)?.platforms?.includes(p.id)).map((opt, i) => (
                                            <div 
                                                key={opt.id} 
                                                id={`ag-plat-opt-${i}`}
                                                className={`ag-custom-select__option ${platMenuHoverIndex === i ? 'active' : ''}`}
                                                onMouseEnter={() => setPlatMenuHoverIndex(i)}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setForm(p => ({ ...p, platformId: opt.id }))
                                                    setIsPlatMenuOpen(false)
                                                    sfx.confirm()
                                                }}
                                            >
                                                {opt.icon && <Icon icon={opt.icon} style={{ marginRight: 10, fontSize: 16 }} />}
                                                {opt.name}
                                                {platMenuHoverIndex === i && <Icon icon="mynaui:check" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={isEmuMenuOpen || isPlatMenuOpen ? 'ag-media-content--dimmed' : ''} style={{ transition: 'all 0.3s' }}>
                        {/* Process Name */}
                        <div
                            className={`ag-field-row ${isFocused('content', 5) ? 'ag-field-row--focused' : ''} ${isInputEditing && isFocused('content', 5) ? 'ag-field-row--editing' : ''}`}
                            onClick={() => { 
                                setFocusArea('content'); 
                                setContentIndex(5);
                                setIsInputEditing(true);
                            }}
                        >
                            <Icon icon="mynaui:search" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Nombre del Proceso (Opcional)</div>
                                <input
                                    id="ag-process"
                                    className={`ag-field-input ${isInputEditing && isFocused('content', 5) ? 'ag-field-input--editing' : ''}`}
                                    value={form.processName}
                                    onChange={e => setForm(p => ({ ...p, processName: e.target.value }))}
                                    placeholder="Ej. java, Minecraft, etc."
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MEDIA TAB ── */}
            {tab === 'media' && (
                <div className="cp-form ag-media">
                    {/* Media Type Selector */}
                    <div
                        id="ag-media-target"
                        className={`ag-field-row ${isFocused('content', 0) && !isTargetMenuOpen ? 'ag-field-row--focused' : ''} ${isTargetMenuOpen ? 'ag-field-row--menu-open' : ''}`}
                        onClick={() => { 
                            setFocusArea('content'); 
                            setContentIndex(0); 
                            if (!isTargetMenuOpen) {
                                const startIdx = MEDIA_OPTIONS.findIndex(o => o.id === mediaTarget)
                                setMenuHoverIndex(startIdx >= 0 ? startIdx : 0)
                            }
                            setIsTargetMenuOpen(!isTargetMenuOpen) 
                        }}
                        style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 12, background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}
                    >
                        <div className="ag-field-body" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 4 }}>
                            <div className="ag-field-label" style={{ marginBottom: 0, fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                <Icon icon="mynaui:layers" style={{ marginRight: 10, fontSize: 18, verticalAlign: '-4px' }}/>
                                TIPO DE ARTE EDITABLE
                            </div>
                            
                            <div className="ag-custom-select">
                                <div className="ag-custom-select__value">
                                    {MEDIA_OPTIONS.find(o => o.id === mediaTarget)?.label}
                                    <Icon icon={isTargetMenuOpen ? 'mynaui:chevron-up' : 'mynaui:chevron-down'} />
                                </div>

                                {isTargetMenuOpen && (
                                    <div className="ag-custom-select__dropdown">
                                        {MEDIA_OPTIONS.map((opt, i) => (
                                            <div 
                                                key={opt.id} 
                                                id={`ag-target-opt-${i}`}
                                                className={`ag-custom-select__option ${menuHoverIndex === i ? 'active' : ''}`}
                                                onMouseEnter={() => setMenuHoverIndex(i)}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setMediaTarget(opt.id as MediaTarget)
                                                    setIsTargetMenuOpen(false)
                                                    sfx.confirm()
                                                }}
                                            >
                                                {opt.label}
                                                {menuHoverIndex === i && <Icon icon="mynaui:check" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Container with dimming effect when menu is open */}
                    <div className={`ag-media-content ${isTargetMenuOpen ? 'ag-media-content--dimmed' : ''}`}>
                        {/* Preview + browse row */}
                        <div className="ag-media-top">
                            <div className="ag-media-preview">
                                {previewUrl
                                    ? <img src={previewUrl} alt="preview" className="ag-media-preview-img" style={{ objectFit: mediaTarget === 'backgroundImage' ? 'cover' : mediaTarget === 'logoImage' ? 'contain' : 'cover' }} />
                                    : <Icon icon="mynaui:image" style={{ fontSize: 36, opacity: 0.3, color: 'var(--text-muted)' }} />
                                }
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div className="cp-form__title">
                                    {mediaTarget === 'squareImage' ? 'Imagen Grid' : 
                                     mediaTarget === 'backgroundImage' ? 'Fondo Pantalla' : 
                                     mediaTarget === 'logoImage' ? 'Logotipo' : 'Carátula'}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                                    Selecciona de la API, pega una URL o importa un archivo local
                                </div>

                                <div 
                                    id="ag-media-url"
                                    className={`ag-field-row ${isFocused('content', 1) ? 'ag-field-row--focused' : ''} ${isInputEditing && isFocused('content', 1) ? 'ag-field-row--editing' : ''}`}
                                    style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.25)', border: isFocused('content', 1) ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)', marginBottom: 4 }}
                                    onClick={() => {
                                        setFocusArea('content');
                                        setContentIndex(1);
                                        setIsInputEditing(true);
                                        document.getElementById('ag-media-url-input')?.focus();
                                    }}
                                >
                                    <Icon icon="mynaui:link" style={{ fontSize: 18, color: 'var(--text-muted)', marginRight: 10 }} />
                                    <input 
                                        id="ag-media-url-input"
                                        type="text"
                                        placeholder="https://..."
                                        value={form[mediaTarget] || ''}
                                        onChange={e => setForm(p => ({ ...p, [mediaTarget]: e.target.value }))}
                                        onFocus={() => { setFocusArea('content'); setContentIndex(1); setIsInputEditing(true); }}
                                        className="ag-field-input"
                                        style={{ fontSize: 13, padding: 0, color: '#fff', background: 'transparent', border: 'none', width: '100%' }}
                                        disabled={isSaving}
                                    />
                                    {form[mediaTarget] && (
                                        <button
                                            id="ag-remove-btn"
                                            onClick={(e) => { e.stopPropagation(); setForm(p => ({ ...p, [mediaTarget]: '' })) }}
                                            disabled={isSaving}
                                            style={{ 
                                                fontSize: 12, 
                                                padding: '4px 8px',
                                                color: '#ff8080',
                                                background: 'rgba(255,128,128,0.1)',
                                                borderRadius: 6,
                                                border: isFocused('content', 2) ? '1px solid rgba(255,128,128,0.3)' : '1px solid transparent',
                                                cursor: 'pointer',
                                                marginLeft: 10,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}
                                        >
                                            <Icon icon="mynaui:trash" /> Quitar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* API image grid */}
                        {apiImages.length > 0 ? (
                            <div style={{ marginTop: 20 }}>
                                <div className="cp-form__title" style={{ marginBottom: 10 }}>
                                    Imágenes de la API — <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>↑↓ para navegar, A para seleccionar</span>
                                </div>
                                <div className="ag-api-grid">
                                    {apiImages.map((img, i) => {
                                        const isSel = isFocused('content', i + 3)
                                        const safeUrl = img.url
                                        const isActive = form[mediaTarget] === img.url

                                        return (
                                            <button
                                                key={i}
                                                id={`ag-api-btn-${i}`}
                                                className={`ag-api-card ${isSel ? 'ag-api-card--focused' : ''} ${isActive ? 'ag-api-card--active' : ''}`}
                                                onClick={() => {
                                                    sfx.confirm();
                                                    setForm(p => ({ ...p, [mediaTarget]: safeUrl }));
                                                    setFocusArea('content');
                                                    setContentIndex(i + 3);
                                                }}
                                                disabled={isSaving}
                                            >
                                                <div className="ag-api-card-img-wrap">
                                                    <img
                                                        src={safeUrl}
                                                        alt={img.type}
                                                        className="ag-api-card-img"
                                                        onError={e => { (e.target as HTMLImageElement).src = '' }}
                                                    />
                                                </div>
                                                <span className="ag-api-card-label">{IMAGE_LABELS[img.type] ?? img.type}</span>
                                                {isActive && <Icon icon="mynaui:check-circle-solid" className="ag-api-card-check" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                                {form.name
                                    ? <><Icon icon="mynaui:search" style={{ marginBottom: 6, fontSize: 22, display: 'block', margin: '0 auto 8px' }} />Sin resultados para "{form.name}"</>
                                    : 'Introduce un nombre en la pestaña General para buscar imágenes'
                                }
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── SAVES TAB ── */}
            {tab === 'saves' && (
                <div className="cp-form ag-saves">
                    <div className="cp-form__section-title" style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                        Gestión de Partidas Guardadas
                    </div>
                    
                    {/* Saves Path */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <div 
                            id="ag-saves-path"
                            className={`ag-field-row ${isFocused('content', 0) ? 'ag-field-row--focused' : ''}`}
                            onClick={() => { setFocusArea('content'); setContentIndex(0); handleBrowseSavesPath() }}
                            style={{ flex: 1, marginBottom: 0 }}
                        >
                            <Icon icon="mynaui:folder" className="ag-field-icon" />
                            <div className="ag-field-body">
                                <div className="ag-field-label">Ruta de Partidas Guardadas</div>
                                <div className="ag-field-path-row">
                                    <div className="ag-field-path-text">{form.savesPath || 'Seleccionar carpeta de saves...'}</div>
                                    <Icon icon="mynaui:external-link" />
                                </div>
                            </div>
                        </div>
                        <button
                            id="ag-saves-sync"
                            className={`ag-field-row ${isFocused('content', 5) ? 'ag-field-row--focused' : ''}`}
                            onClick={() => { setFocusArea('content'); setContentIndex(5); handleSyncSavesPath() }}
                            style={{ aspectRatio: 1, alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 0, cursor: 'pointer', borderRadius: 12, border: isFocused('content', 5) ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}
                            title="Sincronizar ruta desde la web"
                        >
                            <Icon icon="mynaui:refresh" style={{ fontSize: 20, color: 'var(--accent)' }} />
                        </button>
                    </div>

                    {/* Saves Extension Input */}
                    <div 
                        id="ag-saves-ext"
                        className={`ag-field-row ${isFocused('content', 1) ? 'ag-field-row--focused' : ''} ${isInputEditing && isFocused('content', 1) ? 'ag-field-row--editing' : ''}`}
                        onClick={() => { setFocusArea('content'); setContentIndex(1); setIsInputEditing(true); document.getElementById('ag-saves-ext-input')?.focus() }}
                        style={{ marginBottom: 16 }}
                    >
                        <Icon icon="mynaui:file" className="ag-field-icon" />
                        <div className="ag-field-body">
                            <div className="ag-field-label">Extensión de Guardado</div>
                            <input 
                                id="ag-saves-ext-input"
                                className={`ag-field-input ${isInputEditing && isFocused('content', 1) ? 'ag-field-input--editing' : ''}`}
                                value={form.savesExtension || ''} 
                                onChange={e => setForm(p => ({ ...p, savesExtension: e.target.value }))}
                                placeholder=".sav, .srm, .mcr (opcional)..."
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    {/* Cloud Sync Toggle */}
                    <div 
                        id="ag-cloud-sync"
                        className={`ag-field-row ${isFocused('content', 2) ? 'ag-field-row--focused' : ''}`}
                        onClick={() => { 
                            if (!hasPremiumAccess) return
                            setFocusArea('content'); setContentIndex(2); setForm(p => ({ ...p, cloudSyncEnabled: !p.cloudSyncEnabled })); sfx.confirm() 
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: hasPremiumAccess ? 'pointer' : 'not-allowed', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: isFocused('content', 2) ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', marginBottom: 16, opacity: hasPremiumAccess ? 1 : 0.55 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Icon icon={hasPremiumAccess ? 'mynaui:cloud-up' : 'mynaui:lock'} className="ag-field-icon" style={{ margin: 0, opacity: form.cloudSyncEnabled ? 1 : 0.5 }} />
                            <div>
                                <div className="ag-field-label" style={{ marginBottom: 2, opacity: form.cloudSyncEnabled ? 1 : 0.7 }}>Sincronización en la Nube</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {hasPremiumAccess ? 'Copia de seguridad automática de las partidas de este juego' : 'Disponible para cuentas Partner, Admin y Moderator'}
                                </div>
                            </div>
                        </div>
                        <Icon icon={!hasPremiumAccess ? 'mynaui:lock' : (form.cloudSyncEnabled ? 'mynaui:toggle-right' : 'mynaui:toggle-left')} style={{ fontSize: 32, color: !hasPremiumAccess ? 'var(--text-muted)' : (form.cloudSyncEnabled ? 'var(--accent)' : 'var(--text-muted)') }} />
                    </div>

                    {/* Manual Sync Actions */}
                    {isEditing && form.savesPath && (
                        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                            <button
                                id="ag-btn-push"
                                className={`cp-btn ${isFocused('content', 3) ? 'cp-btn--focused' : ''}`}
                                onClick={() => { setFocusArea('content'); setContentIndex(3); handlePushCloud() }}
                                disabled={syncingCloud || !hasPremiumAccess}
                                title={!hasPremiumAccess ? 'Solo disponible para Partner, Admin y Moderator' : undefined}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: isFocused('content', 3) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)', border: isFocused('content', 3) ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: (syncingCloud || !hasPremiumAccess) ? 'not-allowed' : 'pointer', opacity: hasPremiumAccess ? 1 : 0.4 }}
                            >
                                <Icon icon={syncingCloud ? "mynaui:spinner" : (hasPremiumAccess ? "mynaui:cloud-upload" : "mynaui:lock")} className={syncingCloud ? "spin" : ""} style={{ fontSize: 18, color: 'var(--accent)' }} />
                                <span>Subir a la nube</span>
                            </button>
                            <button
                                id="ag-btn-pull"
                                className={`cp-btn ${isFocused('content', 4) ? 'cp-btn--focused' : ''}`}
                                onClick={() => { setFocusArea('content'); setContentIndex(4); handlePullCloud() }}
                                disabled={syncingCloud || !hasPremiumAccess}
                                title={!hasPremiumAccess ? 'Solo disponible para Partner, Admin y Moderator' : undefined}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: isFocused('content', 4) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)', border: isFocused('content', 4) ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: (syncingCloud || !hasPremiumAccess) ? 'not-allowed' : 'pointer', opacity: hasPremiumAccess ? 1 : 0.4 }}
                            >
                                <Icon icon={syncingCloud ? "mynaui:spinner" : (hasPremiumAccess ? "mynaui:cloud-download" : "mynaui:lock")} className={syncingCloud ? "spin" : ""} style={{ fontSize: 18, color: '#4ade80' }} />
                                <span>Descargar remotos</span>
                            </button>
                        </div>
                    )}

                    {/* Detected Saves Grid */}
                    <div className="cp-form__section-title" style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Partidas Encontradas</span>
                        {loadingSaves && <Icon icon="mynaui:spinner" className="spin" style={{ fontSize: 16 }} />}
                    </div>

                    {form.savesPath ? (
                        saveFiles.length > 0 ? (
                            <div className="ag-api-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14 }}>
                                {saveFiles.map((sf, i) => {
                                    // @ts-ignore
const hasBtns = !!(isEditing && form.savesPath)
                                    const cardIdx = 6 + i
                                    const isFoc = isFocused('content', cardIdx)
                                    const imgUrl = sf.imageUrl || form.squareImage || editSlot?.squareImage || form.coverImage || editSlot?.coverImage
                                    return (
                                        <div 
                                            key={sf.filename}
                                            id={`ag-save-card-${i}`}
                                            className={`ag-api-card ${isFoc ? 'ag-api-card--focused' : ''}`}
                                            onClick={() => { setFocusArea('content'); setContentIndex(cardIdx); handleOpenSaveDetail(sf) }}
                                            onDoubleClick={() => handleOpenSaveDetail(sf)}
                                            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: 8, background: isFoc ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', border: isFoc ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 10, transition: 'all 0.2s' }}
                                        >
                                            <div className="ag-api-card-img-wrap" style={{ aspectRatio: '1/1', width: '100%', borderRadius: 6, overflow: 'hidden', background: 'rgba(0,0,0,0.3)', marginBottom: 8, position: 'relative' }}>
                                                {imgUrl ? (
                                                    <img src={imgUrl} alt="Save" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Icon icon="mynaui:save" style={{ fontSize: 32, color: 'var(--text-muted)' }} />
                                                    </div>
                                                )}
                                                <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '2px 6px', borderRadius: 4, fontSize: 10, color: '#fff', fontWeight: 600 }}>
                                                    {sf.filename.split('.').pop()?.toUpperCase()}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }} title={sf.filename}>
                                                {sf.filename}
                                            </div>
                                            {sf.description && (
                                                <div style={{ fontSize: 10, color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: 'italic', marginBottom: 2 }}>
                                                    {sf.description}
                                                </div>
                                            )}
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                {sf.formattedDate}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.06)' }}>
                                No se han encontrado archivos de guardado en esta carpeta
                            </div>
                        )
                    ) : (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.06)' }}>
                            Selecciona una ruta arriba para escanear partidas guardadas
                        </div>
                    )}
                </div>
            )}

            {/* ── SAVE DETAIL MODAL (portal to body to avoid backdrop-filter clipping) ── */}
            {selectedSaveFile && createPortal(
                <div className="ag-dialog-overlay" style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                }} onClick={handleCloseSaveDetail}>
                    <div className="cp-form ag-save-detail" onClick={e => e.stopPropagation()} style={{
                        background: 'var(--bg-secondary, #1a1d23)', borderRadius: 16,
                        padding: 24, width: '90%', maxWidth: 400,
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{selectedSaveFile.filename}</div>
                            <button id="save-detail-btn-0" onClick={handleCloseSaveDetail} onFocus={() => { saveDetailFocusRef.current = 0; setSaveDetailFocusIndex(0) }} style={{
                                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
                                outline: saveDetailFocusIndex === 0 ? '2px solid var(--accent)' : 'none',
                                outlineOffset: 2, borderRadius: 6
                            }}>
                                <Icon icon="mynaui:x" style={{ fontSize: 20 }} />
                            </button>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                            {selectedSaveFile.formattedDate} · {(selectedSaveFile.sizeBytes / 1024).toFixed(1)} KB
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <div className="ag-field-label" style={{ marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Descripción</div>
                            <textarea
                                id="save-detail-btn-1"
                                className="ag-field-input"
                                value={saveDescriptionInput}
                                onChange={e => setSaveDescriptionInput(e.target.value)}
                                onFocus={() => { saveDetailFocusRef.current = 1; setSaveDetailFocusIndex(1) }}
                                placeholder="Añade una descripción para este guardado..."
                                style={{
                                    width: '100%', minHeight: 80, padding: 10, fontSize: 13, borderRadius: 8,
                                    background: 'rgba(0,0,0,0.3)', border: saveDetailFocusIndex === 1 ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                                    color: '#fff', resize: 'vertical', outline: 'none', pointerEvents: 'auto'
                                }}
                                disabled={savingDesc}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                id="save-detail-btn-2"
                                onClick={handleSaveDescription}
                                disabled={savingDesc}
                                onFocus={() => { saveDetailFocusRef.current = 2; setSaveDetailFocusIndex(2) }}
                                style={{
                                    flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                                    background: savingDesc ? 'rgba(99,102,241,0.4)' : saveDetailFocusIndex === 2 ? 'var(--accent)' : 'rgba(99,102,241,0.2)',
                                    color: '#fff', border: saveDetailFocusIndex === 2 ? '1px solid rgba(255,255,255,0.3)' : 'none',
                                    cursor: savingDesc ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: 6, opacity: savingDesc ? 0.6 : 1
                                }}
                            >
                                {savingDesc ? <Icon icon="mynaui:spinner" className="spin" /> : <Icon icon="mynaui:check" />}
                                Guardar
                            </button>
                            <button
                                id="save-detail-btn-3"
                                onClick={handleDeleteSaveFile}
                                disabled={savingDesc}
                                onFocus={() => { saveDetailFocusRef.current = 3; setSaveDetailFocusIndex(3) }}
                                style={{
                                    padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                                    background: saveDetailFocusIndex === 3 ? 'rgba(255,80,80,0.3)' : 'rgba(255,80,80,0.15)',
                                    color: '#ff6666', border: saveDetailFocusIndex === 3 ? '1px solid rgba(255,80,80,0.5)' : '1px solid rgba(255,80,80,0.2)',
                                    cursor: savingDesc ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: 6, opacity: savingDesc ? 0.6 : 1
                                }}
                            >
                                <Icon icon="mynaui:trash" />
                                Eliminar
                            </button>
                        </div>
                        <button
                            id="save-detail-btn-4"
                            onClick={handleDeleteCloudSave}
                            disabled={savingDesc || !editSlot}
                            onFocus={() => { saveDetailFocusRef.current = 4; setSaveDetailFocusIndex(4) }}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                                background: saveDetailFocusIndex === 4 ? 'rgba(255,160,50,0.25)' : 'rgba(255,160,50,0.12)',
                                color: '#ffa030', border: saveDetailFocusIndex === 4 ? '1px solid rgba(255,160,50,0.5)' : '1px solid rgba(255,160,50,0.2)',
                                cursor: savingDesc ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', gap: 6, opacity: savingDesc ? 0.6 : 1, marginTop: 8
                            }}
                        >
                            <Icon icon="mynaui:cloud-x" />
                            Eliminar de la nube
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* ── OPTIONS TAB ── */}
            {tab === 'options' && (
                <div className="cp-form ag-options">
                    <div className="cp-form__section-title" style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                        Etiqueta de Nombre
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 24 }}>
                        <div 
                            className={`ag-field-row ${isFocused('content', 0) ? 'ag-field-row--focused' : ''}`}
                            onClick={() => { setFocusArea('content'); setContentIndex(0); setForm(p => ({ ...p, showLabel: !p.showLabel })); sfx.confirm() }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 14px', borderRadius: 10, marginBottom: 12 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Icon icon={form.showLabel ? 'mynaui:check-square-solid' : 'mynaui:square'} style={{ fontSize: 24, color: form.showLabel ? 'var(--accent)' : 'var(--text-muted)' }} />
                                <span style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>Mostrar nombre sin hacer hover</span>
                            </div>
                        </div>

                        <div 
                            className={`ag-field-row ${isFocused('content', 1) ? 'ag-field-row--focused' : ''}`}
                            onClick={() => { setFocusArea('content'); setContentIndex(1); setForm(p => ({ ...p, showLogo: !p.showLogo })); sfx.confirm() }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 14px', borderRadius: 10, marginBottom: 12, opacity: form.showLabel ? 1 : 0.4 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Icon icon={form.showLogo ? 'mynaui:check-square-solid' : 'mynaui:square'} style={{ fontSize: 24, color: form.showLogo ? 'var(--accent)' : 'var(--text-muted)' }} />
                                <span style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>Usar logo en lugar de texto</span>
                            </div>
                        </div>

                        <div 
                            className={`ag-field-row ${isFocused('content', 2) ? 'ag-field-row--focused' : ''}`}
                            onClick={() => { setFocusArea('content'); setContentIndex(2); }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, opacity: form.showLabel ? 1 : 0.4 }}
                        >
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Posición del nombre <span style={{ fontSize: 11 }}>←→</span></span>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {LABEL_POS_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={(e) => { e.stopPropagation(); setForm(p => ({ ...p, labelPosition: opt.id as any })); sfx.confirm() }}
                                        style={{
                                            padding: '6px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                                            background: form.labelPosition === opt.id ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                                            color: form.labelPosition === opt.id ? '#fff' : 'var(--text-muted)',
                                            border: 'none', fontWeight: 600
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="cp-form__section-title" style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                        Icono del Juego
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div 
                            className={`ag-field-row ${isFocused('content', 3) ? 'ag-field-row--focused' : ''}`}
                            onClick={() => { setFocusArea('content'); setContentIndex(3); setForm(p => ({ ...p, showIcon: !p.showIcon })); sfx.confirm() }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 14px', borderRadius: 10, marginBottom: 12 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Icon icon={form.showIcon ? 'mynaui:check-square-solid' : 'mynaui:square'} style={{ fontSize: 24, color: form.showIcon ? 'var(--accent)' : 'var(--text-muted)' }} />
                                <span style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>Mostrar icono sin hacer hover</span>
                            </div>
                        </div>

                        <div 
                            className={`ag-field-row ${isFocused('content', 4) ? 'ag-field-row--focused' : ''}`}
                            onClick={() => { setFocusArea('content'); setContentIndex(4); }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, opacity: form.showIcon ? 1 : 0.4 }}
                        >
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Posición del icono <span style={{ fontSize: 11 }}>←→</span></span>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {ICON_POS_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={(e) => { e.stopPropagation(); setForm(p => ({ ...p, iconPosition: opt.id as any })); sfx.confirm() }}
                                        style={{
                                            padding: '6px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                                            background: form.iconPosition === opt.id ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                                            color: form.iconPosition === opt.id ? '#fff' : 'var(--text-muted)',
                                            border: 'none', fontWeight: 600
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div 
                            className={`ag-field-row ${isFocused('content', 5) ? 'ag-field-row--focused' : ''}`}
                            onClick={() => { setFocusArea('content'); setContentIndex(5); }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, opacity: form.showIcon ? 1 : 0.4, marginTop: 8 }}
                        >
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tamaño del icono <span style={{ fontSize: 11 }}>←→</span></span>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {ICON_SIZE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={(e) => { e.stopPropagation(); setForm(p => ({ ...p, iconSize: opt.id as any })); sfx.confirm() }}
                                        style={{
                                            padding: '6px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                                            background: (form.iconSize || 64) === opt.id ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                                            color: (form.iconSize || 64) === opt.id ? '#fff' : 'var(--text-muted)',
                                            border: 'none', fontWeight: 600
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </SidePanel>
    )
}

export default AddGamePanel
