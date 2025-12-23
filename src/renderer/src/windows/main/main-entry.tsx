import '../../assets/main.css'
import './style.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MainApp from './MainApp'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <MainApp />
    </StrictMode>
)
