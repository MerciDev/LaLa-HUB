import './assets/main.css'
import './windows/main/style.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MainApp from './windows/main/MainApp'
import { DialogProvider } from './hooks/useDialog'
import { ToastProvider } from './hooks/useToast'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ToastProvider>
            <DialogProvider>
                <MainApp />
            </DialogProvider>
        </ToastProvider>
    </StrictMode>
)
