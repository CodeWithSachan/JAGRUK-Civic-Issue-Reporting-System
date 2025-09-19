// src/components/Header.jsx
import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

let RotateIcon = null
let MenuIcon = null
let CloseIcon = null
try {
  // optional lucide-react — graceful fallback if not installed
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const lucide = require('lucide-react')
  RotateIcon = lucide.RotateCcw
  MenuIcon = lucide.Menu
  CloseIcon = lucide.X
} catch (e) {
  RotateIcon = null
  MenuIcon = null
  CloseIcon = null
}

function FallbackRotate({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 12a9 9 0 10-2.4 6.03" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function FallbackMenu({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function FallbackClose({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const LINKS = [
  { path: '/', label: 'Home' },
  { path: '/report', label: 'Report Issue' },
  { path: '/map', label: 'Map View' },
  { path: '/admin', label: 'Admin Portal' },
]

export default function Header({ onRefresh, onLanguageChange } = {}) {
  const { lang, setLang, t } = useLanguage()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    onLanguageChange?.(lang)
    // close mobile when language changes
    setMobileOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  // refresh helper (callback optional)
  const handleRefresh = () => {
    if (typeof onRefresh === 'function') return onRefresh()
    try { window.location.reload() } catch { window.location.href = window.location.href }
  }

  // optional logo in public/
  const logoSrc = '/logo-jh.png'

  // set CSS var for header height so shell can read it if needed
  useEffect(() => {
    const h = 64 // header height in px
    document.documentElement.style.setProperty('--site-header-height', `${h}px`)
  }, [])

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 bg-white/85 backdrop-blur-sm border-b border-gray-100"
        style={{ height: 64 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            {/* left */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded bg-white p-1 shadow-sm">
                  <img
                    src={logoSrc}
                    alt={t?.('officialJharkhand') || 'CivicReport logo'}
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <div className="leading-tight">
                  <div className="text-base font-bold text-[#0b1220]">JAGRUK</div>
                  <div className="text-xs text-gray-500 hidden sm:block">Official • Govt. of Jharkhand</div>
                </div>
              </div>
            </div>

            {/* center nav */}
            <nav className="hidden md:flex items-center gap-2" aria-label="Main navigation">
              {LINKS.map((l) => (
                <NavLink
                  key={l.path}
                  to={l.path}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-full text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-600)] ${
                      isActive ? 'bg-[rgba(31,111,235,0.08)] text-[var(--brand-700)] font-medium' : 'hover:bg-gray-100 text-gray-700'
                    }`
                  }
                >
                  {t?.(l.label) || l.label}
                </NavLink>
              ))}
            </nav>

            {/* right controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg px-1 py-1 bg-white border border-gray-100 shadow-sm" role="group" aria-label="Language">
                <button
                  onClick={() => setLang('en')}
                  className={`px-3 py-1 text-sm rounded-md ${lang === 'en' ? 'bg-[var(--brand-600)] text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                  aria-pressed={lang === 'en'}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('hi')}
                  className={`px-3 py-1 text-sm rounded-md ${lang === 'hi' ? 'bg-[var(--brand-600)] text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                  aria-pressed={lang === 'hi'}
                >
                  HI
                </button>
              </div>

              <button
                onClick={handleRefresh}
                title={t?.('refresh') || 'Refresh'}
                className="hidden sm:inline-flex ml-2 w-10 h-10 rounded-md border border-gray-100 bg-white items-center justify-center hover:bg-gray-50"
                type="button"
                aria-label="Refresh page"
              >
                {RotateIcon ? <RotateIcon size={18} /> : <FallbackRotate size={18} />}
              </button>

              {/* mobile menu */}
              <div className="md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileOpen((s) => !s)}
                  className="inline-flex items-center justify-center p-2 rounded-md border hover:bg-gray-50"
                  aria-expanded={mobileOpen}
                  aria-label="Toggle navigation menu"
                >
                  {mobileOpen ? (CloseIcon ? <CloseIcon size={18} /> : <FallbackClose />) : (MenuIcon ? <MenuIcon size={18} /> : <FallbackMenu />)}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* mobile panel */}
        <div className={`md:hidden transition-[max-height] duration-200 ease-in-out overflow-hidden ${mobileOpen ? 'max-h-60' : 'max-h-0'}`}>
          <div className="border-t bg-white">
            <div className="px-4 py-3 space-y-1">
              {LINKS.map((l) => (
                <NavLink
                  key={l.path}
                  to={l.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `block px-3 py-2 rounded-md text-base ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  {t?.(l.label) || l.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* spacer element to keep page from jumping under fixed header */}
      <div style={{ height: 64 }} aria-hidden />
    </>
  )
}
