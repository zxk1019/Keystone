import './assets/main.css'
import './i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import EyeBreakOverlay from './features/eyeBreak/EyeBreakOverlay'

// First guess before the settings load; in Electron this already matches the saved theme
document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light'

// The same page also draws the 20-20-20 dark screen, opened by the main process as "#eye-break"
const isEyeBreak = window.location.hash.startsWith('#eye-break')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isEyeBreak ? <EyeBreakOverlay /> : <App />}</StrictMode>
)
