import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initAnalytics, installScrollDepthTracker, installExternalLinkTracker } from './lib/analytics.js'

initAnalytics()
installScrollDepthTracker()
installExternalLinkTracker('site1_home')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
