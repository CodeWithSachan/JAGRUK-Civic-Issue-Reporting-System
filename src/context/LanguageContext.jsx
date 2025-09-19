// src/context/LanguageContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const LANG_KEY = 'app_lang'
const LanguageContext = createContext(null)

// Basic translations object — add keys you need. Keep keys stable across components.
const DICT = {
  en: {
    civicReport: 'CivicReport',
    officialJharkhand: 'Official • Govt. of Jharkhand',
    reportIssue: 'Report Issue',
    mapView: 'Map View',
    adminPortal: 'Admin Portal',
    refresh: 'Refresh',
    submit: 'Submit',
    contactNo: 'Contact No.',
    complainantName: 'Complainant Name',
    complaintRelated: 'Complaint (Related to)',
    complaintLocation: 'Complaint Location',
    complaintComment: 'Complaint / Comment',
    imageIfAny: 'Image, if any',
    captcha: 'Captcha',
    // add more keys used across your app...
  },
  hi: {
    civicReport: 'सिविकरिपोर्ट',
    officialJharkhand: 'आधिकारिक • झारखंड सरकार',
    reportIssue: 'समस्या रिपोर्ट करें',
    mapView: 'मानचित्र दृश्य',
    adminPortal: 'प्रशासन पोर्टल',
    refresh: 'रिफ्रेश',
    submit: 'सबमिट करें',
    contactNo: 'संपर्क संख्या',
    complainantName: 'शिकायतकर्ता का नाम',
    complaintRelated: 'शिकायत (संबंधित)',
    complaintLocation: 'शिकायत स्थान',
    complaintComment: 'शिकायत / टिप्पणी',
    imageIfAny: 'छवि (यदि कोई हो)',
    captcha: 'कैप्चा',
    // add more translations as you update components
  },
}

// Provider
export function LanguageProvider({ children, defaultLang }) {
  const [lang, setLang] = useState(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY)
      if (stored === 'hi') return 'hi'
      if (stored === 'en') return 'en'
    } catch (e) {}
    return defaultLang === 'hi' ? 'hi' : 'en'
  })

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch (e) {}
  }, [lang])

  const t = useMemo(() => {
    return (key, fallback = '') => {
      if (!key) return fallback
      return (DICT[lang] && DICT[lang][key]) || (DICT.en && DICT.en[key]) || fallback || key
    }
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return ctx
}
