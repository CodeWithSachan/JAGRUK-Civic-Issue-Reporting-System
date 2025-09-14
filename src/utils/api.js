/**
 * src/utils/api.js
 * Helper to produce absolute API and upload URLs using VITE_API_BASE
 */
export const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE)
  ? String(import.meta.env.VITE_API_BASE).replace(/\/$/, '')
  : ''

/** Return absolute API url for a path (path may start with or without "/") */
export function apiUrl(path = '') {
  if (!path) return API_BASE || ''
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
}

/** Return absolute photo url for a stored photo path (eg "/uploads/xxx") */
export function absolutePhotoUrl(photoPath) {
  if (!photoPath) return null
  if (/^https?:\/\//i.test(photoPath)) return photoPath
  return `${API_BASE}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`
}
