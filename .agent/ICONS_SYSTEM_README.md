# 🎨 Sistema de Iconos - LaLa-HUB

## Descripción General

Este sistema permite gestionar dinámicamente iconos en las barras `mainOptions` y `socialOptions` de la aplicación. Los iconos se pueden añadir individualmente desde el proceso principal de Electron y las barras se pueden expandir/colapsar con animaciones suaves.

## 📐 Arquitectura

### Estructura Visual

```
┌────────────────────────────────────────────────────────┐
│  [🏠]         [══ Info Island ══]          [👤]       │
│ Main                                        Social      │
│                                                         │
│ COLLAPSED: Solo muestra el primer icono                │
│ EXPANDED:                                               │
│  [🏠][⚙️][📁][🔔]                 [🔔][📁][⚙️][👤]   │
│  (izq → der)                       (der ← izq)         │
└────────────────────────────────────────────────────────┘
```

### Tipos de Datos

```typescript
interface IconOption {
    id: string           // Identificador único del icono
    icon: string        // Emoji o texto del ícono (ej: '🏠', '⚙️')
    label: string       // Etiqueta/tooltip para el icono
    onClick?: string    // ID de acción personalizada (opcional)
}
```

## 🎯 Comportamiento

### Estados

1. **COLLAPSED (Por defecto)**
   - Width: `56px`
   - Muestra solo: `icons[0]` (el primer icono)
   - Animación: Transition `width 0.3s ease`

2. **EXPANDED**
   - Width: `fit-content` (hasta max-width `24%`)
   - Muestra: Todos los iconos de la lista
   - Gap entre iconos: `8px`

### Diferencias entre Main y Social

| Característica | mainOptions | socialOptions |
|----------------|-------------|---------------|
| Dirección | Izquierda → Derecha | Derecha ← Izquierda |
| flex-direction | `row` (default) | `row-reverse` |
| Primer icono visible | Izquierda | Derecha |
| Expansión | Hacia la derecha | Hacia la izquierda |

## 🛠️ Funciones API

### Desde el proceso principal (`src/main/windows/main/main.ts`)

```typescript
// Añadir iconos
addMainIcon(icon: IconOption): void
addSocialIcon(icon: IconOption): void

// Toggle expansión
toggleMainOptions(): void
toggleSocialOptions(): void

// Info Island (bonus)
changeInfoIsland(text: string): void
expandInfoIsland(): void
collapseInfoIsland(): void
```

## 💡 Ejemplos de Uso

### Añadir un icono a MainOptions

```typescript
import * as mainApp from './windows/main/main'

mainApp.addMainIcon({
    id: 'settings',
    icon: '⚙️',
    label: 'Configuración'
})
```

### Añadir un icono a SocialOptions

```typescript
mainApp.addSocialIcon({
    id: 'messages',
    icon: '💬',
    label: 'Mensajes'
})
```

### Expandir/Colapsar

```typescript
// Toggle mainOptions (expande si está colapsado, colapsa si está expandido)
mainApp.toggleMainOptions()

// Toggle socialOptions
mainApp.toggleSocialOptions()
```

### Ejemplo Completo

```typescript
// En src/main/index.ts dentro de main()

// 1. Añadir iconos progresivamente
setTimeout(() => {
    mainApp.addMainIcon({ 
        id: 'home', 
        icon: '🏠', 
        label: 'Inicio' 
    })
}, 1000)

setTimeout(() => {
    mainApp.addMainIcon({ 
        id: 'settings', 
        icon: '⚙️', 
        label: 'Configuración' 
    })
}, 2000)

setTimeout(() => {
    mainApp.addMainIcon({ 
        id: 'folder', 
        icon: '📁', 
        label: 'Carpetas' 
    })
}, 3000)

// 2. Expandir después de añadir todos
setTimeout(() => {
    mainApp.toggleMainOptions()
}, 4000)

// 3. Social Options
setTimeout(() => {
    mainApp.addSocialIcon({ 
        id: 'profile', 
        icon: '👤', 
        label: 'Perfil' 
    })
    mainApp.addSocialIcon({ 
        id: 'friends', 
        icon: '👥', 
        label: 'Amigos' 
    })
}, 5000)
```

## 🎨 Estilos CSS

### Clases principales

- `.mainOptions` / `.socialOptions`: Contenedores de iconos
- `.mainOptions.expanded` / `.socialOptions.expanded`: Estado expandido
- `.icon-button`: Botón individual de cada icono

### Personalización

```css
/* Cambiar el tamaño máximo */
.mainOptions.expanded {
    max-width: 30%; /* Por defecto es 24% */
}

/* Cambiar gap entre iconos */
.mainOptions {
    gap: 12px; /* Por defecto es 8px */
}

/* Cambiar tamaño de iconos */
.icon-button {
    width: 48px;
    height: 48px;
    font-size: 28px;
}
```

## 🔄 Flujo de Datos

```
[Main Process]                    [Renderer Process]
main.ts                           MainApp.tsx
    │                                  │
    ├─ addMainIcon()                   │
    │  └─ dispatch-action ─────────── ▶│
    │                                  ├─ ADD_MAIN_ICON
    │                                  ├─ setMainIcons([...prev, new])
    │                                  └─ Re-render con nuevo icono
    │                                  
    ├─ toggleMainOptions()             │
    │  └─ dispatch-action ─────────── ▶│
    │                                  ├─ TOGGLE_MAIN_OPTIONS
    │                                  └─ setMainExpanded(!prev)
    │                                     └─ CSS transition (0.3s)
```

## ⚡ Interacción del Usuario

### Click en el contenedor
- **Acción**: Expande/colapsa toda la barra
- **Función**: `onClick={() => setMainExpanded(!mainExpanded)}`

### Click en un icono individual
- **Acción**: Ejecuta la acción del icono
- **Función**: `e.stopPropagation()` para no activar el toggle del contenedor
- **Log**: `console.log(\`Clicked: ${icon.label}\`)`

### Hover en iconos
- **Efecto**: `transform: scale(1.1)`
- **Tooltip**: Muestra `title={icon.label}`

## 📝 Notas Importantes

1. **Social Options invertido**: Usa `flex-direction: row-reverse` para mostrar iconos de derecha a izquierda
2. **Primer icono siempre visible**: Incluso en estado collapsed, el primer icono se muestra
3. **Animaciones suaves**: Todas las transiciones usan `ease` timing function
4. **Límite de ancho**: max-width 24% para evitar que las barras ocupen todo el espacio
5. **IDs únicos**: Cada icono debe tener un `id` único para el key de React

## 🚀 Próximas Mejoras Sugeridas

- [ ] Función para eliminar iconos por ID
- [ ] Función para reordenar iconos
- [ ] Badges/notificaciones en iconos
- [ ] Animación de entrada para nuevos iconos
- [ ] Persistencia de iconos en localStorage
- [ ] Click handlers personalizados por icono
- [ ] Sub-menús desplegables por icono
