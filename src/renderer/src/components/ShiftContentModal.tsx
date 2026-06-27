import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { HomeSlot, ContentOffsetSettings } from '../../../shared/types'
import { sfx } from '../utils/audioManager'

interface ShiftContentModalProps {
  slot: HomeSlot
  onLiveUpdate: (offsets: ContentOffsetSettings) => void
  onSave: (offsets: ContentOffsetSettings) => void
  onClose: () => void
}

type TabType = 'image' | 'label' | 'icon'

interface SelectableItem {
  id: string
  type: 'tab' | 'action'
  tab?: TabType
  label: string
  icon: string
  variant?: string
}

export const ShiftContentModal: React.FC<ShiftContentModalProps> = ({
  slot,
  onLiveUpdate,
  onSave,
  onClose
}) => {
  // Deep clone initial offsets or default to 0
  const [offsets, setOffsets] = useState<ContentOffsetSettings>(() => ({
    image: { x: slot.contentOffsets?.image?.x || 0, y: slot.contentOffsets?.image?.y || 0, scale: slot.contentOffsets?.image?.scale || 1 },
    label: { x: slot.contentOffsets?.label?.x || 0, y: slot.contentOffsets?.label?.y || 0, scale: slot.contentOffsets?.label?.scale || 1 },
    icon: { x: slot.contentOffsets?.icon?.x || 0, y: slot.contentOffsets?.icon?.y || 0, scale: slot.contentOffsets?.icon?.scale || 1 }
  }))

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeEditingTab, setActiveEditingTab] = useState<TabType | null>(null)

  // Build dynamic list of selectable tabs & buttons
  const items = React.useMemo<SelectableItem[]>(() => {
    const list: SelectableItem[] = [
      { id: 'tab-image', type: 'tab', tab: 'image', label: 'Imagen', icon: 'mdi:image-outline' }
    ]
    if (slot.showLabel) {
      list.push({ id: 'tab-label', type: 'tab', tab: 'label', label: 'Nombre', icon: 'mdi:format-title' })
    }
    if (slot.showIcon) {
      list.push({ id: 'tab-icon', type: 'tab', tab: 'icon', label: 'Icono', icon: 'mynaui:star' })
    }
    list.push(
      { id: 'btn-reset', type: 'action', label: 'Resetear', icon: 'mdi:refresh', variant: 'secondary' },
      { id: 'btn-cancel', type: 'action', label: 'Cancelar', icon: 'mdi:close', variant: 'secondary' },
      { id: 'btn-save', type: 'action', label: 'Guardar', icon: 'mdi:check', variant: 'primary' }
    )
    return list
  }, [slot.showLabel, slot.showIcon])

  // Trigger live updates whenever offsets change (using ref to avoid infinite re-render loop)
  const onLiveUpdateRef = React.useRef(onLiveUpdate)
  onLiveUpdateRef.current = onLiveUpdate

  useEffect(() => {
    onLiveUpdateRef.current(offsets)
  }, [offsets])

  const handleReset = useCallback(() => {
    sfx.cancel()
    setOffsets({
      image: { x: 0, y: 0, scale: 1 },
      label: { x: 0, y: 0, scale: 1 },
      icon: { x: 0, y: 0, scale: 1 }
    })
  }, [])

  // Keyboard & Gamepad handler
  useEffect(() => {
    const handler = (e: Event) => {
      e.stopImmediatePropagation()
      const action = (e as CustomEvent<string>).detail

      if (activeEditingTab) {
        // --- LIVE SHIFTING MODE ---
        const step = 8 // Mayor velocidad de desplazamiento
        if (action === 'left') {
          sfx.navigate()
          setOffsets(prev => ({
            ...prev,
            [activeEditingTab]: {
              ...prev[activeEditingTab],
              x: (prev[activeEditingTab]?.x || 0) - step
            }
          }))
        } else if (action === 'right') {
          sfx.navigate()
          setOffsets(prev => ({
            ...prev,
            [activeEditingTab]: {
              ...prev[activeEditingTab],
              x: (prev[activeEditingTab]?.x || 0) + step
            }
          }))
        } else if (action === 'up') {
          sfx.navigate()
          setOffsets(prev => ({
            ...prev,
            [activeEditingTab]: {
              ...prev[activeEditingTab],
              y: (prev[activeEditingTab]?.y || 0) - step
            }
          }))
        } else if (action === 'down') {
          sfx.navigate()
          setOffsets(prev => ({
            ...prev,
            [activeEditingTab]: {
              ...prev[activeEditingTab],
              y: (prev[activeEditingTab]?.y || 0) + step
            }
          }))
        } else if (action === 'prevPage' || action === 'lb' || action === 'l1') {
          sfx.navigate()
          setOffsets(prev => {
            const curScale = prev[activeEditingTab]?.scale ?? 1
            const newScale = Math.max(0.1, curScale - 0.05)
            return {
              ...prev,
              [activeEditingTab]: {
                ...prev[activeEditingTab],
                scale: Number(newScale.toFixed(2))
              }
            }
          })
        } else if (action === 'nextPage' || action === 'rb' || action === 'r1') {
          sfx.navigate()
          setOffsets(prev => {
            const curScale = prev[activeEditingTab]?.scale ?? 1
            const newScale = Math.min(5, curScale + 0.05)
            return {
              ...prev,
              [activeEditingTab]: {
                ...prev[activeEditingTab],
                scale: Number(newScale.toFixed(2))
              }
            }
          })
        } else if (action === 'select') {
          sfx.confirm()
          setActiveEditingTab(null)
        } else if (action === 'back' || action === 'escape') {
          sfx.cancel()
          setActiveEditingTab(null)
        }
        return
      }

      // --- NAVIGATION MODE ---
      if (action === 'left' || action === 'up') {
        sfx.navigate()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : items.length - 1))
      } else if (action === 'right' || action === 'down') {
        sfx.navigate()
        setSelectedIndex(prev => (prev < items.length - 1 ? prev + 1 : 0))
      } else if (action === 'select') {
        const cur = items[selectedIndex]
        if (!cur) return
        if (cur.type === 'tab' && cur.tab) {
          sfx.confirm()
          setActiveEditingTab(cur.tab)
        } else if (cur.id === 'btn-reset') {
          handleReset()
        } else if (cur.id === 'btn-cancel') {
          sfx.cancel()
          onClose()
        } else if (cur.id === 'btn-save') {
          sfx.confirm()
          onSave(offsets)
        }
      } else if (action === 'back' || action === 'escape') {
        sfx.cancel()
        onClose()
      }
    }

    window.addEventListener('panel-move', handler, true)
    return () => window.removeEventListener('panel-move', handler, true)
  }, [activeEditingTab, items, selectedIndex, offsets, onSave, onClose, handleReset])

  // Also support standard keyboard arrow keys directly if panel-move doesn't fire for some keydowns
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (!activeEditingTab) return
      e.stopImmediatePropagation()
      const step = e.shiftKey ? 16 : 8
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setOffsets(p => ({ ...p, [activeEditingTab]: { ...p[activeEditingTab], x: (p[activeEditingTab]?.x || 0) - step } }))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setOffsets(p => ({ ...p, [activeEditingTab]: { ...p[activeEditingTab], x: (p[activeEditingTab]?.x || 0) + step } }))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setOffsets(p => ({ ...p, [activeEditingTab]: { ...p[activeEditingTab], y: (p[activeEditingTab]?.y || 0) - step } }))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setOffsets(p => ({ ...p, [activeEditingTab]: { ...p[activeEditingTab], y: (p[activeEditingTab]?.y || 0) + step } }))
      } else if (e.key === '+' || e.key === '=' || e.key === 'e' || e.key === 'E') {
        setOffsets(p => {
          const cur = p[activeEditingTab]?.scale ?? 1
          return { ...p, [activeEditingTab]: { ...p[activeEditingTab], scale: Number(Math.min(5, cur + 0.05).toFixed(2)) } }
        })
      } else if (e.key === '-' || e.key === 'q' || e.key === 'Q') {
        setOffsets(p => {
          const cur = p[activeEditingTab]?.scale ?? 1
          return { ...p, [activeEditingTab]: { ...p[activeEditingTab], scale: Number(Math.max(0.1, cur - 0.05).toFixed(2)) } }
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        sfx.confirm()
        setActiveEditingTab(null)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        sfx.cancel()
        setActiveEditingTab(null)
      }
    }
    window.addEventListener('keydown', keyHandler, true)
    return () => window.removeEventListener('keydown', keyHandler, true)
  }, [activeEditingTab])

  const tabsCount = items.filter(i => i.type === 'tab').length

  if (activeEditingTab) {
    const curOff = offsets[activeEditingTab]
    return (
      <AnimatePresence>
        <motion.div
          className="grid-mode-hud"
          style={{ zIndex: 10000, pointerEvents: 'auto' }}
          initial={{ opacity: 0, y: 10, scale: 0.9, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: 10, scale: 0.9, x: '-50%' }}
        >
          <Icon icon="mdi:cursor-move" className="grid-mode-hud__icon" />
          <span>🎯 Desplazando <b>{activeEditingTab.toUpperCase()}</b> ({curOff ? `X: ${curOff.x}px, Y: ${curOff.y}px` : ''})</span>
          <kbd>↑↓←→</kbd>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>mover</span>
          <kbd>LB / RB</kbd>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>zoom ({(curOff?.scale ?? 1).toFixed(2)}x)</span>
          <kbd>SELECT / A / Enter</kbd>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>fijar</span>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        className="ag-dialog-overlay"
        style={{ pointerEvents: 'auto', zIndex: 10000 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="ag-dialog-box"
          style={{ width: '480px', padding: '24px' }}
          initial={{ scale: 0.9, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 10, opacity: 0 }}
        >
          <div className="ag-dialog-header" style={{ marginBottom: '16px' }}>
            <Icon icon="mdi:swap-horizontal" className="ag-dialog-icon" />
            <div>
              <h2 style={{ fontSize: '20px', margin: 0 }}>Desplazar Contenido</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Selecciona un elemento para encuadrarlo en la tarjeta
              </p>
            </div>
          </div>

          {/* Tabs Section */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tabsCount}, 1fr)`, gap: '10px', marginBottom: '20px' }}>
            {items.filter(i => i.type === 'tab').map((item) => {
              const idx = items.findIndex(x => x.id === item.id)
              const isFocused = selectedIndex === idx
              const curOff = item.tab ? offsets[item.tab] : null

              return (
                <div
                  key={item.id}
                  onClick={() => { setSelectedIndex(idx); setActiveEditingTab(item.tab || null); sfx.confirm() }}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: isFocused ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${isFocused ? 'var(--accent)' : 'transparent'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon icon={item.icon} style={{ fontSize: '24px', color: isFocused ? 'var(--accent)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {curOff ? `X:${curOff.x} Y:${curOff.y}` : ''}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {items.filter(i => i.type === 'action').map((act) => {
              const idx = items.findIndex(x => x.id === act.id)
              const isFocused = selectedIndex === idx

              return (
                <button
                  key={act.id}
                  className={`cp-btn cp-btn--${act.variant || 'secondary'} ${isFocused ? 'cp-btn--focused' : ''}`}
                  onClick={() => {
                    if (act.id === 'btn-reset') handleReset()
                    else if (act.id === 'btn-cancel') { sfx.cancel(); onClose() }
                    else if (act.id === 'btn-save') { sfx.confirm(); onSave(offsets) }
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Icon icon={act.icon} />
                  <span>{act.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
