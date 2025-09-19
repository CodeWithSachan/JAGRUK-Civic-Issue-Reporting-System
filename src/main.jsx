// src/main.jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import './styles/index.css'
import 'leaflet/dist/leaflet.css'

// add LanguageProvider
import { LanguageProvider } from './context/LanguageContext' // <-- ensure this path is correct

// Grab root element safely
const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root not found in index.html')
}

createRoot(container).render(
  <React.StrictMode>
    <LanguageProvider defaultLang="en">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>
)
