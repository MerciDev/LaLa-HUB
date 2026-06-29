import { ConsolePanelTab } from '../SidePanel'

export const LOGGED_IN_TABS: ConsolePanelTab[] = [
    { id: 'overview', label: 'Vista General', icon: 'mynaui:user', description: 'Tu tarjeta de jugador y estado en la nube' },
    { id: 'themes', label: 'Gestor de Temas', icon: 'mdi:paint-outline', description: 'Personaliza colores, estilos y temas visuales de la aplicación' },
    { id: 'security', label: 'Cuenta y Seguridad', icon: 'mynaui:shield-check', description: 'Personaliza tu identidad o gestiona tu sesión activa' },
    { id: 'library', label: 'Gestionar Biblioteca', icon: 'mynaui:folder', description: 'Opciones de sincronización y descubrimiento de juegos' }
]

export const GUEST_TABS: ConsolePanelTab[] = [
    { id: 'login', label: 'Iniciar Sesión', icon: 'mynaui:log-in', description: 'Accede a tu biblioteca sincronizada en la nube' },
    { id: 'register', label: 'Crear Cuenta', icon: 'mynaui:user-plus', description: 'Regístrate gratis para respaldar tus partidas en línea' },
    { id: 'themes', label: 'Gestor de Temas', icon: 'mdi:paint-outline', description: 'Personaliza colores, estilos y temas visuales de la aplicación' }
]

export const BUILTIN_THEMES = ['dark', 'platinum', 'apple-glass', 'apple-glass-light', 'xmas', 'halloween', 'twilight-princess'] as const
