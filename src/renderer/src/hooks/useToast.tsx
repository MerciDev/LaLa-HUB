import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
    id: string
    message: string
    type: ToastType
    icon?: string
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, icon?: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export const useToast = () => {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within ToastProvider')
    return ctx
}

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([])

    const showToast = useCallback((message: string, type: ToastType = 'info', icon?: string) => {
        const id = Date.now().toString() + Math.random()
        setToasts(prev => [...prev, { id, message, type, icon }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3000) // Auto-dismiss after 3s
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="ag-toast-container">
                <AnimatePresence>
                    {toasts.map(toast => {
                        const defaultIcon = toast.type === 'success' ? 'mynaui:check-circle' :
                                            toast.type === 'error' ? 'mynaui:x-circle' :
                                            toast.type === 'warning' ? 'mynaui:danger-triangle' :
                                            'mynaui:info-circle'
                        return (
                            <motion.div
                                key={toast.id}
                                className={`ag-toast ag-toast--${toast.type}`}
                                layout
                                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            >
                                <Icon icon={toast.icon || defaultIcon} className="ag-toast-icon" />
                                <span>{toast.message}</span>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    )
}
