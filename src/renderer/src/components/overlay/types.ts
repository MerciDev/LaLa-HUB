export type SectionId = 'home' | 'game' | 'social' | 'trophies' | 'settings' | 'power'
export type Theme = 'dark' | 'platinum' | 'midnight' | 'apple-glass' | 'apple-glass-light' | 'xmas' | 'halloween' | 'twilight-princess'

export interface Friend {
  id: string; name: string; initials: string
  status: 'online' | 'away' | 'offline'; statusText: string
}

export interface Achievement {
  id: string; name: string; desc: string; icon: string
  tier: 'gold' | 'silver' | 'bronze' | 'locked'; progress: number
}

export const FRIENDS: Friend[] = [
  { id: '1', name: 'ArikamX',  initials: 'A', status: 'online',  statusText: 'Jugando Halo CE' },
  { id: '2', name: 'JuanPA',   initials: 'J', status: 'online',  statusText: 'En el menú' },
  { id: '3', name: 'MeloDark', initials: 'M', status: 'away',    statusText: 'Ausente' },
  { id: '4', name: 'Xenon95',  initials: 'X', status: 'offline', statusText: 'Hace 2h' },
]

export const ACHIEVEMENTS: Achievement[] = [
  { id: '1', name: 'Primer Paso',   desc: 'Completa el tutorial',       icon: '⭐', tier: 'bronze', progress: 100 },
  { id: '2', name: 'Sin Detenerse', desc: 'Juega 10h sin pausas',       icon: '🔥', tier: 'silver', progress: 100 },
  { id: '3', name: 'Leyenda',       desc: 'Completa el juego al 100%',  icon: '👑', tier: 'locked', progress: 62  },
  { id: '4', name: 'Velocista',     desc: 'Carrera en menos de 3 min',  icon: '⚡', tier: 'locked', progress: 0   },
]

export const THEMES: { id: Theme; label: string }[] = [
  { id: 'dark',     label: 'Oscuro'     },
  { id: 'platinum', label: 'Platino'    },
  { id: 'midnight', label: 'Medianoche' },
  { id: 'apple-glass', label: 'Liquid Glass (Dark)' },
  { id: 'apple-glass-light', label: 'Liquid Glass (Light)' },
  { id: 'xmas', label: 'Navidad' },
  { id: 'halloween', label: 'Halloween' },
]

export const SECTIONS: { id: SectionId; icon: string; label: string; badge?: true }[] = [
  { id: 'home',     icon: 'mynaui:home-solid', label: 'Inicio'  },
  { id: 'game',     icon: 'mynaui:controller', label: 'Juego'   },
  { id: 'social',   icon: 'mynaui:users',      label: 'Social', badge: true },
  { id: 'trophies', icon: 'mynaui:trophy',     label: 'Logros'  },
  { id: 'settings', icon: 'mynaui:cog-six',    label: 'Ajustes' },
  { id: 'power',    icon: 'mynaui:power',      label: 'Sistema' },
]

export function panelCount(s: SectionId): number {
  switch (s) {
    case 'home':     return 0
    case 'game':     return 1
    case 'social':   return FRIENDS.length
    case 'trophies': return ACHIEVEMENTS.length
    case 'settings': return 3
    case 'power':    return 3
    default:         return 0
  }
}
