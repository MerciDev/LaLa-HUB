import { useEffect } from 'react'

export function useInputFocus() {
    useEffect(() => {
        const handleFocus = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                window.api.movementControl.setInputFocused(true)
            }
        }
        const handleBlur = (e: FocusEvent) => {
            const target = e.target as HTMLElement
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
                window.api.movementControl.setInputFocused(false)
            }
        }
        window.addEventListener('focusin', handleFocus)
        window.addEventListener('focusout', handleBlur)
        return () => {
            window.removeEventListener('focusin', handleFocus)
            window.removeEventListener('focusout', handleBlur)
        }
    }, [])
}
