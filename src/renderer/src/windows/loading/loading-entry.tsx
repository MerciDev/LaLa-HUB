import './style.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import LoadingApp from './LoadingApp'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <LoadingApp />
    </StrictMode>
)
