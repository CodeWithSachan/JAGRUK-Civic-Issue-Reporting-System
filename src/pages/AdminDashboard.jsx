// src/pages/AdminDashboard.jsx
import { absolutePhotoUrl } from '../utils/api'
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// --- react-leaflet imports for inline ReportMap component ---
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
// import marker images (works with Vite)
import markerUrl from 'leaflet/dist/images/marker-icon.png'
import markerRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// make default icon available (fix marker invisible issue in many bundlers)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerRetinaUrl,
  iconUrl: markerUrl,
  shadowUrl: markerShadow,
})

/**
 * Admin dashboard — canonical statuses:
 *  - high_priority
 *  - submitted
 *  - acknowledged
 *  - in_progress
 *  - resolved
 *
 * Quarantine is a separate boolean flag (r.quarantined).
 */

/* ---------- Shared status metadata ---------- */
const STATUS_TO_COLOR = {
  high_priority: '#ef4444',
  submitted: '#f59e0b',
  acknowledged: '#60a5fa',
  in_progress: '#3b82f6',
  resolved: '#10b981',
  quarantined: '#ef4444',
}

function statusLabelFromKey(key) {
  if (!key) return 'Unknown'
  const k = String(key).toLowerCase()
  switch (k) {
    case 'high_priority': return 'High Priority'
    case 'submitted': return 'Submitted'
    case 'acknowledged': return 'Acknowledged'
    case 'in_progress': return 'In Progress'
    case 'resolved': return 'Resolved'
    case 'quarantined': return 'Quarantined'
    default: return k.replace(/_/g, ' ')
  }
}

/* ---------- UI helpers ---------- */
function StatusBadge({ status = '' }) {
  const s = String(status || '').toLowerCase()
  const color = STATUS_TO_COLOR[s] ?? '#e5e7eb'
  const label = statusLabelFromKey(s)
  return (
    <span
      className="inline-block px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
      aria-label={`status ${label}`}
    >
      {label}
    </span>
  )
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
    </div>
  )
}

function buildImageSrc(src) {
  if (!src) return null
  if (/^https?:\/\//i.test(src)) return src
  if (typeof window === 'undefined') return src
  return src.startsWith('/') ? `${window.location.origin}${src}` : `${window.location.origin}/${src}`
}

/* --------------------- New: coords extractor + ReportMap --------------------- */

/**
 * Try many common key names and formats to extract [lat, lng] numbers.
 * Returns [lat, lng] (numbers) or null.
 */
function extractCoords(report) {
  if (!report) return null

  const pairs = [
    ['lat', 'lng'],
    ['latitude', 'longitude'],
    ['location_lat', 'location_lng'],
    ['locationLatitude', 'locationLongitude'],
    ['locationLat', 'locationLng'],
  ]

  for (const [a, b] of pairs) {
    if (report?.[a] != null && report?.[b] != null) {
      const la = Number(report[a])
      const lo = Number(report[b])
      if (!Number.isNaN(la) && !Number.isNaN(lo)) return [la, lo]
    }
  }

  // location string like "12.3456, 78.9012"
  if (typeof report.location === 'string') {
    const m = report.location.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
    if (m) return [parseFloat(m[1]), parseFloat(m[2])]
  }

  if (report.coords) {
    const parts = String(report.coords).split(',').map((s) => s.trim())
    if (parts.length >= 2) {
      const la = Number(parts[0]), lo = Number(parts[1])
      if (!Number.isNaN(la) && !Number.isNaN(lo)) return [la, lo]
    }
  }

  return null
}

/**
 * ReportMap: small react-leaflet wrapper that sets view when coords change
 * and invalidates size after a short delay so it works inside modals.
 */
function SetViewAndResize({ coords, zoom = 15 }) {
  const map = useMap()
  React.useEffect(() => {
    if (!coords) return
    try {
      map.setView(coords, zoom)
      const t = setTimeout(() => {
        try { map.invalidateSize() } catch (e) {}
      }, 200)
      return () => clearTimeout(t)
    } catch (e) {
      // ignore
    }
  }, [coords, map, zoom])
  return null
}

function ReportMap({ coords, zoom = 15, style = { height: 300, width: '100%' } }) {
  const center = coords ? [Number(coords[0]), Number(coords[1])] : [20, 0]
  return (
    <div className="rounded-md overflow-hidden border">
      <MapContainer center={center} zoom={coords ? zoom : 3} style={style} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {coords && <Marker position={[Number(coords[0]), Number(coords[1])]} />}
        <SetViewAndResize coords={coords} zoom={zoom} />
      </MapContainer>
    </div>
  )
}

/* ---------------------------------------------------------------------------- */

function ReportCard({ r, onChangeStatus, onView, onQuarantine, onRestore, onPurge, busy }) {
  const src = r.photo_url || r.photo || r.photoUrl || r.file_url || null
  const imageSrc = buildImageSrc(src)
  const [imgVisible, setImgVisible] = useState(Boolean(imageSrc))
  const quarantined = Boolean(r.quarantined)

  return (
    <div className={`bg-white rounded-lg p-4 border flex md:items-start gap-4 ${quarantined ? 'opacity-70' : ''}`}>
<div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-50 border flex items-center justify-center">
  {quarantined ? (
    <div className="text-xs text-orange-600 px-2 text-center">Report quarantined</div>
  ) : imageSrc && imgVisible ? (
    <img
      src={absolutePhotoUrl(imageSrc)}
      alt={r.type ? `${r.type} thumbnail` : 'report thumbnail'}
      className="object-cover w-full h-full"
      onError={(e) => {
        // hide broken image and mark invisible so we show fallback
        e.currentTarget.onerror = null
        e.currentTarget.style.display = 'none'
        setImgVisible(false)
      }}
      onLoad={() => setImgVisible(true)}
    />
  ) : (
    <div className="text-xs text-gray-400 px-2 text-center">No image</div>
  )}
</div>


      <div className="flex-1">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {(r.type || '').replace(/_/g, ' ') || 'Issue'}
              </span>
              <StatusBadge status={r.status} />
              {quarantined && (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded ml-2">Quarantined</span>
              )}
            </div>

            <div className="font-medium text-lg">{r.title || r.description || 'No title'}</div>

            <div className="text-sm text-gray-500 mt-2">
              {r.address || r.location_text || '—'} <span className="mx-2">•</span>{' '}
              {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <select
              value={r.status || 'submitted'}
              onChange={(e) => onChangeStatus(r.id, e.target.value)}
              className="px-3 py-2 rounded border bg-gray-50 text-sm"
              disabled={quarantined || busy}
            >
              <option value="submitted">Submitted</option>
              <option value="high_priority">High Priority</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => onView(r)}
                className="px-3 py-2 rounded border bg-white text-sm"
                disabled={busy}
              >
                View
              </button>

              {!quarantined ? (
                <button
                  onClick={() => onQuarantine(r.id)}
                  className="px-3 py-2 rounded border text-orange-600 bg-white text-sm"
                  disabled={busy}
                >
                  🚫 Quarantine
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onRestore(r.id)}
                    className="px-3 py-2 rounded border text-blue-600 bg-white text-sm"
                    disabled={busy}
                  >
                    ♻️ Restore
                  </button>
                  <button
                    onClick={() => onPurge(r.id)}
                    className="px-3 py-2 rounded border text-red-700 bg-white text-sm"
                    disabled={busy}
                  >
                    🗑️ Delete Forever
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose} />
      <div className="relative max-w-3xl w-full bg-white rounded-lg shadow-lg p-6 z-10">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 px-2 py-1 rounded hover:bg-gray-100">
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

/* ---------- Main component ---------- */

export default function AdminDashboard() {
  const navigate = useNavigate()

  // API base (mirrors AdminLogin). Set VITE_API_BASE=http://localhost:4000 in dev if needed.
  const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE)
    ? import.meta.env.VITE_API_BASE
    : ''

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showQuarantine, setShowQuarantine] = useState(false)
  const [openReport, setOpenReport] = useState(null)
  const [toast, setToast] = useState(null)
  const [busyIds, setBusyIds] = useState(new Set())
  const [logoutLoading, setLogoutLoading] = useState(false)

  // helper: build headers with token if available
  const buildHeaders = (extra = {}, includeJson = true) => {
    const h = { ...extra }
    if (includeJson) h['Content-Type'] = 'application/json'
    try {
      const token = localStorage.getItem('admin_token')
      if (token) h['Authorization'] = `Bearer ${token}`
    } catch (e) {
      // ignore storage errors
    }
    return h
  }

  // LOGOUT: remove token locally and attempt server-side logout (best-effort)
  const handleLogout = useCallback(async () => {
    if (!confirm('Sign out from admin?')) return
    setLogoutLoading(true)
    try {
      // try server logout (don't block on failures)
      try {
        const token = localStorage.getItem('admin_token')
        if (token) {
          const res = await fetch(`${API_BASE || ''}/api/admin/logout`, {
            method: 'POST',
            headers: buildHeaders({}, true),
          })
          // ignore non-OK; just remove token locally regardless
          if (!res.ok) {
            // optionally show small notice for server-side failure
            console.warn('Server logout returned', res.status)
          }
        }
      } catch (e) {
        // network or other: ignore, proceed to clear local state
        console.warn('Logout request failed', e)
      }

      try { localStorage.removeItem('admin_token') } catch (e) {}
      setToast({ type: 'success', text: 'Signed out' })
      // navigate to login
      navigate('/admin-login', { replace: true })
    } finally {
      setLogoutLoading(false)
      // clear toast after short delay
      setTimeout(() => setToast(null), 1800)
    }
  }, [API_BASE, navigate])

  // auth guard: redirect to /admin-login if no token
  useEffect(() => {
    let ok = false
    try { ok = Boolean(localStorage.getItem('admin_token')) } catch (e) { ok = false }
    if (!ok) navigate('/admin-login', { replace: true })
  }, [navigate])

  // load reports
  useEffect(() => {
    const ac = new AbortController()
    let mounted = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE}/api/reports`, { signal: ac.signal, headers: buildHeaders({}, false) })
        if (!res.ok) {
          // If unauthorized, redirect to login
          if (res.status === 401) {
            try { localStorage.removeItem('admin_token') } catch (e) {}
            navigate('/admin-login', { replace: true })
            return
          }
          throw new Error(`Server ${res.status}`)
        }

        const text = await res.text().catch(() => '')
        let data
        try { data = text ? JSON.parse(text) : [] } catch (err) { data = [] }

        const normalized = (Array.isArray(data) ? data : []).map((r) => {
          const rawStatus = (r.status || r.priority || '').toString().trim()
          const normStatus = rawStatus ? rawStatus.toLowerCase().replace(/\s+/g, '_') : 'submitted'

          // --- Normalization: canonicalize created_at, id, status, and ensure coordinates are accessible ---
          // Try to populate location_lat/location_lng from many common key names so view can rely on them.
          const latCandidates = r.lat ?? r.latitude ?? r.location_lat ?? r.locationLat ?? r.location_latitude ?? r.locationLatitude ?? r.locationLat
          const lngCandidates = r.lng ?? r.longitude ?? r.location_lng ?? r.locationLng ?? r.location_longitude ?? r.locationLongitude ?? r.locationLng

          const parsedLat = latCandidates != null ? Number(latCandidates) : (r.location ? (() => {
            const m = String(r.location).match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
            return m ? Number(m[1]) : null
          })() : null)

          const parsedLng = lngCandidates != null ? Number(lngCandidates) : (r.location ? (() => {
            const m = String(r.location).match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
            return m ? Number(m[2]) : null
          })() : null)

          return {
            ...r,
            created_at: r.created_at || r.createdAt || r.date || null,
            quarantined: !!r.quarantined,
            id: r.id ?? r._id ?? r.uuid ?? null,
            status: normStatus,
            // attach canonical location_lat / location_lng if we can parse them
            location_lat: parsedLat != null && !Number.isNaN(parsedLat) ? parsedLat : r.location_lat ?? r.locationLat ?? null,
            location_lng: parsedLng != null && !Number.isNaN(parsedLng) ? parsedLng : r.location_lng ?? r.locationLng ?? null,
          }
        })
        if (mounted) setReports(normalized)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('admin load error', err)
          if (mounted) setError(err.message || 'Failed to load')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
      ac.abort()
    }
  }, [API_BASE, navigate])

  // derived stats
  const totalActive = reports.filter((r) => !r.quarantined).length
  const pending = reports.filter((r) => !r.quarantined && ['submitted', 'acknowledged'].includes(r.status)).length
  const inProgress = reports.filter((r) => !r.quarantined && r.status === 'in_progress').length
  const resolved = reports.filter((r) => !r.quarantined && r.status === 'resolved').length
  const quarantineCount = reports.filter((r) => r.quarantined).length

  const normalizedCategoryOptions = useMemo(() => {
    return Array.from(new Set(reports.map((r) => (r.type || '').toString().trim().toLowerCase()).filter(Boolean)))
  }, [reports])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return reports.filter((r) => {
      // showQuarantine true -> include only quarantined, false -> include only non-quarantined
      if (showQuarantine ? !r.quarantined : r.quarantined) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (categoryFilter !== 'all' && (r.type || '').toString().toLowerCase() !== categoryFilter) return false
      if (!qq) return true
      const hay = `${r.description || ''} ${r.title || ''} ${r.address || ''} ${r.id || ''}`.toLowerCase()
      return hay.includes(qq)
    })
  }, [reports, q, statusFilter, categoryFilter, showQuarantine])

  const showToast = useCallback((t) => {
    setToast(t)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const markBusy = useCallback((id, v) => {
    setBusyIds((s) => {
      const next = new Set(s)
      if (v) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  /* ---------- Actions (optimistic + rollback) ---------- */
  const changeStatus = useCallback(async (id, status) => {
    if (!id) return
    markBusy(id, true)
    let prev = null
    setReports((rs) => {
      prev = rs
      return rs.map((x) => (x.id === id ? { ...x, status } : x))
    })
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}`, {
        method: 'PATCH',
        headers: buildHeaders({}, true),
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        if (res.status === 401) {
          try { localStorage.removeItem('admin_token') } catch (e) {}
          navigate('/admin-login', { replace: true })
          return
        }
        const text = await res.text().catch(() => '')
        throw new Error(text || `Server ${res.status}`)
      }
      showToast({ type: 'success', text: 'Status updated' })
    } catch (err) {
      setReports(prev || [])
      showToast({ type: 'error', text: 'Failed to update status' })
      console.error('changeStatus error', err)
    } finally {
      markBusy(id, false)
    }
  }, [API_BASE, markBusy, showToast, navigate])

  const quarantineReport = useCallback(async (id) => {
    if (!id) return
    const reason = prompt('Reason for quarantining (optional):', 'flagged by admin')
    if (reason === null) return
    if (!confirm('Quarantine this report?')) return
    markBusy(id, true)
    let prev = null
    setReports((rs) => {
      prev = rs
      return rs.map((x) => (x.id === id ? { ...x, quarantined: true, quarantine_reason: reason } : x))
    })
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}`, {
        method: 'PATCH',
        headers: buildHeaders({}, true),
        body: JSON.stringify({ quarantined: true, quarantine_reason: reason }),
      })
      if (!res.ok) {
        if (res.status === 401) {
          try { localStorage.removeItem('admin_token') } catch (e) {}
          navigate('/admin-login', { replace: true })
          return
        }
        const text = await res.text().catch(() => '')
        throw new Error(text || `Server ${res.status}`)
      }
      showToast({ type: 'success', text: 'Report quarantined' })
    } catch (err) {
      setReports(prev || [])
      showToast({ type: 'error', text: 'Failed to quarantine report' })
      console.error('quarantineReport error', err)
    } finally {
      markBusy(id, false)
    }
  }, [API_BASE, markBusy, showToast, navigate])

  const restoreReport = useCallback(async (id) => {
    if (!id) return
    if (!confirm('Restore this report to public view?')) return
    markBusy(id, true)
    let prev = null
    setReports((rs) => {
      prev = rs
      return rs.map((x) => (x.id === id ? { ...x, quarantined: false, quarantine_reason: null } : x))
    })
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}`, {
        method: 'PATCH',
        headers: buildHeaders({}, true),
        body: JSON.stringify({ quarantined: false }),
      })
      if (!res.ok) {
        if (res.status === 401) {
          try { localStorage.removeItem('admin_token') } catch (e) {}
          navigate('/admin-login', { replace: true })
          return
        }
        const text = await res.text().catch(() => '')
        throw new Error(text || `Server ${res.status}`)
      }
      showToast({ type: 'success', text: 'Report restored' })
    } catch (err) {
      setReports(prev || [])
      showToast({ type: 'error', text: 'Failed to restore report' })
      console.error('restoreReport error', err)
    } finally {
      markBusy(id, false)
    }
  }, [API_BASE, markBusy, showToast, navigate])

  const purgeReport = useCallback(async (id) => {
    if (!id) return
    if (!confirm('Permanently delete this report? This cannot be undone.')) return
    markBusy(id, true)
    let prev = null
    setReports((rs) => {
      prev = rs
      return rs.filter((x) => x.id !== id)
    })
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}`, {
        method: 'DELETE',
        headers: buildHeaders({}, false),
      })
      if (!res.ok) {
        if (res.status === 401) {
          try { localStorage.removeItem('admin_token') } catch (e) {}
          navigate('/admin-login', { replace: true })
          return
        }
        const text = await res.text().catch(() => '')
        throw new Error(text || `Server ${res.status}`)
      }
      showToast({ type: 'success', text: 'Report deleted permanently' })
    } catch (err) {
      setReports(prev || [])
      showToast({ type: 'error', text: 'Failed to delete report' })
      console.error('purgeReport error', err)
    } finally {
      markBusy(id, false)
    }
  }, [API_BASE, markBusy, showToast, navigate])

  // debug: log the report object when opening view so you can inspect keys in browser console
  const handleView = useCallback((r) => {
    console.log('openReport payload', r)
    setOpenReport(r)
  }, [])

  /* ---------- Render ---------- */
  return (
    <div className="space-y-8">
      {/* Header with Logout */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold">Administrative Dashboard</h1>
          <p className="text-gray-500 mt-2">Manage and moderate reported issues</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
            disabled={logoutLoading}
            aria-label="Logout"
          >
            {logoutLoading ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <StatCard title="Active Reports" value={totalActive} />
        <StatCard title="Pending" value={pending} />
        <StatCard title="In Progress" value={inProgress} />
        <StatCard title="Resolved" value={resolved} />
        <div className="bg-white rounded-2xl p-4 shadow-sm border flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Quarantine</div>
            <div className="text-2xl font-semibold mt-2">{quarantineCount}</div>
          </div>
          <button
            onClick={() => setShowQuarantine((s) => !s)}
            className="px-3 py-2 rounded-lg bg-gray-50 border text-sm"
          >
            {showQuarantine ? 'Show Active' : 'Show Quarantine'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border shadow-sm">
        <div className="mb-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
          <input
            placeholder={showQuarantine ? 'Search quarantine...' : 'Search reports...'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 rounded-lg px-4 py-3 bg-gray-50 border"
          />

          <div className="flex gap-3 ml-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg px-3 py-2 bg-gray-50 border"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="high_priority">High Priority</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg px-3 py-2 bg-gray-50 border"
            >
              <option value="all">All Categories</option>
              {normalizedCategoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-500">Loading reports…</div>
        ) : error ? (
          <div className="text-red-500">Error: {error}</div>
        ) : (
          <div className="space-y-4">
            {filtered.length === 0 && <div className="text-gray-500">No reports match your filters.</div>}

            {filtered.map((r, idx) => {
              const key = r.id ?? `report-${idx}`
              const isBusy = busyIds.has(r.id)
              return (
                <ReportCard
                  key={key}
                  r={r}
                  onChangeStatus={changeStatus}
                  onView={handleView}
                  onQuarantine={quarantineReport}
                  onRestore={restoreReport}
                  onPurge={purgeReport}
                  busy={isBusy}
                />
              )
            })}
          </div>
        )}
      </div>

<Modal open={!!openReport} onClose={() => setOpenReport(null)} title={`Report #${openReport?.id || ''}`}>
  {openReport ? (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="text-sm text-gray-500 mb-2">Category</div>
        <div className="font-medium mb-4">{openReport.type || '—'}</div>

        <div className="text-sm text-gray-500 mb-2">Status</div>
        <div className="mb-4"><StatusBadge status={openReport.status} /></div>

        <div className="text-sm text-gray-500 mb-2">Reported</div>
        <div className="mb-4">{openReport.created_at ? new Date(openReport.created_at).toLocaleString() : '—'}</div>

        <div className="text-sm text-gray-500 mb-2">Complaint Address</div>
        <div className="mb-4">
          {openReport.location_text
            || openReport.address // fallback if location_text missing
            || (openReport.location_lat && openReport.location_lng
                ? `${Number(openReport.location_lat).toFixed(4)}, ${Number(openReport.location_lng).toFixed(4)}`
                : '—')}
        </div>

        <div className="text-sm text-gray-500 mb-2">Complainant Name</div>
        <div className="font-medium mb-3">
          {openReport.name || openReport.fullName || openReport.reporter || openReport.created_by || '—'}
        </div>

        <div className="text-sm text-gray-500 mb-2">Email</div>
        <div className="mb-3">{openReport.email || openReport.email_address || '—'}</div>

        <div className="text-sm text-gray-500 mb-2">Contact No.</div>
        <div className="mb-4">
          {openReport.contact || openReport.phone || openReport.mobile || openReport.phone_number || '—'}
        </div>

        <div className="text-sm text-gray-500 mb-2">Description</div>
        <div className="text-gray-700">{openReport.description || openReport.title || 'No description'}</div>

        {openReport.quarantine_reason && (
          <>
            <div className="text-sm text-gray-500 mt-4 mb-2">Quarantine reason</div>
            <div className="text-sm text-orange-700">{openReport.quarantine_reason}</div>
          </>
        )}
      </div>

      <div>
        {/* Show map when coords available, above the image */}
        {(() => {
          const coords = extractCoords(openReport)
          return coords ? (
            <div className="mb-4">
              <ReportMap coords={coords} />
            </div>
          ) : null
        })()}

        {openReport.quarantined ? (
          <div className="h-64 rounded-md bg-gray-50 border flex items-center justify-center text-red-600">
            Report quarantined — moderator review
          </div>
        ) : (openReport.photo_url || openReport.photo || openReport.photoUrl || openReport.file_url) ? (
          <img
            src={buildImageSrc(openReport.photo_url || openReport.photo || openReport.photoUrl || openReport.file_url)}
            alt="report"
            className="w-full rounded-md object-cover border"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          <div className="h-64 rounded-md bg-gray-50 border flex items-center justify-center text-gray-400">No image</div>
        )}
      </div>
    </div>
  ) : null}
</Modal>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded px-4 py-2 ${
            toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
