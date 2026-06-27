import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { sfx } from '../utils/audioManager'

export type DialogAction = {
    label: string
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    onClick: () => void
}

export type DialogOptions = {
    title: string
    message?: string
    icon?: string
    actions: DialogAction[]
}

interface DialogContextType {
    showDialog: (options: DialogOptions) => void
    closeDialog: () => void
}

const DialogContext = createContext<DialogContextType | null>(null)

export const useDialog = () => {
    const ctx = useContext(DialogContext)
    if (!ctx) throw new Error('useDialog must be used within DialogProvider')
    return ctx
}

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [dialog, setDialog] = useState<DialogOptions | null>(null)
    const [selectedIndex, setSelectedIndex] = useState(0)

    const showDialog = useCallback((opts: DialogOptions) => {
        sfx.open()
        setDialog(opts)
        setSelectedIndex(Math.max(0, opts.actions.length - 1)) // Default to the last button (e.g. 'Confirm' or 'Cancel')
        // We notify MainApp to lock standard navigation via an event
        window.dispatchEvent(new CustomEvent('dialog-opened'))
    }, [])

    const closeDialog = useCallback(() => {
        if (!dialog) return
        sfx.cancel()
        setDialog(null)
        window.dispatchEvent(new CustomEvent('dialog-closed'))
    }, [dialog])

    useEffect(() => {
        const handler = (e: Event) => {
            if (!dialog) return
            e.stopImmediatePropagation()
            const action = (e as CustomEvent<string>).detail
            
            if (action === 'left') {
                if (selectedIndex === 1) { sfx.navigate(); setSelectedIndex(0) }
            } else if (action === 'right') {
                if (selectedIndex === 0 && dialog.actions.length > 1) { sfx.navigate(); setSelectedIndex(1) }
            } else if (action === 'up') {
                if (dialog.actions.length === 3 && selectedIndex === 2) { sfx.navigate(); setSelectedIndex(1) }
            } else if (action === 'down') {
                if (dialog.actions.length === 3 && (selectedIndex === 0 || selectedIndex === 1)) { sfx.navigate(); setSelectedIndex(2) }
            } else if (action === 'select') {
                sfx.confirm()
                dialog.actions[selectedIndex].onClick()
                closeDialog() // Auto close on action (optional, but standard for native feeling)
            } else if (action === 'back' || action === 'escape') {
                closeDialog()
            }
        }
        
        // Listen to native gamepad events. Since Dialog overlays the app, it intercepts here.
        window.addEventListener('panel-move', handler, true) 
        return () => window.removeEventListener('panel-move', handler, true)
    }, [dialog, selectedIndex, closeDialog])

    return (
        <DialogContext.Provider value={{ showDialog, closeDialog }}>
            {children}
            <AnimatePresence>
                {dialog && (
                    <motion.div
                        className="ag-dialog-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <motion.div
                            className="ag-dialog-box"
                            style={{ width: '450px' }}
                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            <div className="ag-dialog-header">
                                {dialog.icon && <Icon icon={dialog.icon} className="ag-dialog-icon" />}
                                <h2>{dialog.title}</h2>
                            </div>
                            {dialog.message && <p className="ag-dialog-message">{dialog.message}</p>}
                            <div className="ag-dialog-actions" style={dialog.actions.length >= 3 ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } : {}}>
                                {dialog.actions.map((act, i) => (
                                    <button
                                        key={i}
                                        className={`cp-btn cp-btn--${act.variant || 'secondary'} ${selectedIndex === i ? 'cp-btn--focused' : ''}`}
                                        style={(dialog.actions.length === 3 && i === 2) ? { gridColumn: 'span 2' } : {}}
                                        onClick={() => {
                                            act.onClick()
                                            closeDialog()
                                        }}
                                        onMouseEnter={() => setSelectedIndex(i)}
                                    >
                                        {act.label}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DialogContext.Provider>
    )
}
