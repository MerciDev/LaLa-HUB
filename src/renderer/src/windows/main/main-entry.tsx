import './style.css'
import '../../assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MainApp from './MainApp'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <MainApp />
    </StrictMode>
)
