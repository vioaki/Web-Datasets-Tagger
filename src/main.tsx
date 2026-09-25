import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { registerOffline } from './core/pwa'

import '@fontsource-variable/newsreader'
import '@fontsource-variable/inter'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'

import './design/tokens.css'
import './design/global.css'
import './design/primitives.css'
import './app.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerOffline()
