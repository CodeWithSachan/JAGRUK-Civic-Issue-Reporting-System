// src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// components (extracted)
import ReportCard from '../components/ReportCard'
import Modal from '../components/Modal'

// language
import { useLanguage } from '../context/LanguageContext'

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

import { authFetch, getAdminToken, clearAdminToken } from '../utils/api'

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

function StatCard({ title, value, sub = null }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function buildImageSrc(src) {
  if (!src) return null
  if (/^https?:\/\//i.test(src)) return src
  if (typeof window === 'undefined') return src
  return src.startsWith('/') ? `${window.location.origin}${src}` : `${window.location.origin}/${src}`
}

/* --------------------- coords extractor + ReportMap --------------------- */

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

  // location string like "12.3456, 78.9012" or "12,78"
  if (typeof report.location === 'string') {
    const m = report.location.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
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

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { t } = useLanguage()

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

  // pagination & bulk selection
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)
  const [selectedIds, setSelectedIds] = useState(new Set())

  // LOGOUT: remove token locally and attempt server-side logout (best-effort)
  const handleLogout = useCallback(async () => {
    if (!confirm(t('confirmSignOut', 'Sign out from admin?'))) return
    setLogoutLoading(true)
    try {
      try {
        const token = getAdminToken()
        if (token) {
          await authFetch('/api/admin/logout', { method: 'POST' })
        }
      } catch (e) {
        console.warn('Logout request failed', e)
      }

      try { clearAdminToken() } catch (e) {}
      setToast({ type: 'success', text: t('signedOut', 'Signed out') })
      navigate('/admin-login', { replace: true })
    } finally {
      setLogoutLoading(false)
      setTimeout(() => setToast(null), 1800)
    }
  }, [navigate, t])

  // auth guard: redirect to /admin-login if no token
  useEffect(() => {
    const ok = Boolean(getAdminToken())
    if (!ok) navigate('/admin-login', { replace: true })
  }, [navigate])

  // load reports (use authFetch so token header is included)
  useEffect(() => {
    const ac = new AbortController()
    let mounted = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await authFetch('/api/reports', { signal: ac.signal, method: 'GET' })
        if (res.status === 401) {
          clearAdminToken()
          navigate('/admin-login', { replace: true })
          return
        }
        if (!res.ok) {
          throw new Error(`Server ${res.status}`)
        }

        const text = await res.text().catch(() => '')
        let data
        try { data = text ? JSON.parse(text) : [] } catch (err) { data = [] }

        const normalized = (Array.isArray(data) ? data : []).map((r, idx) => {
          const rawStatus = (r.status || r.priority || '').toString().trim()
          const normStatus = rawStatus ? rawStatus.toLowerCase().replace(/\s+/g, '_') : 'submitted'

          const latCandidates = r.lat ?? r.latitude ?? r.location_lat ?? r.locationLat ?? r.location_latitude ?? r.locationLatitude ?? r.locationLat
          const lngCandidates = r.lng ?? r.longitude ?? r.location_lng ?? r.locationLng ?? r.location_longitude ?? r.locationLongitude ?? r.locationLng

          const parsedLat = latCandidates != null ? Number(latCandidates) : (r.location ? (() => {
            const m = String(r.location).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
            return m ? Number(m[1]) : null
          })() : null)

          const parsedLng = lngCandidates != null ? Number(lngCandidates) : (r.location ? (() => {
            const m = String(r.location).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
            return m ? Number(m[2]) : null
          })() : null)

          const idValue = r.id ?? r._id ?? r.uuid ?? `tmp-${idx}`

          return {
            ...r,
            created_at: r.created_at || r.createdAt || r.date || null,
            quarantined: !!r.quarantined,
            id: idValue,
            status: normStatus,
            location_lat: parsedLat != null && !Number.isNaN(parsedLat) ? parsedLat : r.location_lat ?? r.locationLat ?? null,
            location_lng: parsedLng != null && !Number.isNaN(parsedLng) ? parsedLng : r.location_lng ?? r.locationLng ?? null,
          }
        })
        if (mounted) setReports(normalized)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('admin load error', err)
          if (mounted) setError(err.message || t('failedToLoad', 'Failed to load'))
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
  }, [navigate, t])

  // derived stats
  const totalActive = reports.filter((r) => !r.quarantined).length
  const pending = reports.filter((r) => !r.quarantined && ['submitted', 'acknowledged'].includes(r.status)).length
  const inProgress = reports.filter((r) => !r.quarantined && r.status === 'in_progress').length
  const resolved = reports.filter((r) => !r.quarantined && r.status === 'resolved').length
  const quarantineCount = reports.filter((r) => r.quarantined).length

  const normalizedCategoryOptions = useMemo(() => {
    return Array.from(new Set(reports.map((r) => (r.type || '').toString().trim().toLowerCase()).filter(Boolean)))
  }, [reports])

  // category breakdown (top 6)
  const categoryBreakdown = useMemo(() => {
    const m = {}
    for (const r of reports) {
      const k = (r.type || 'other').toString().toLowerCase()
      m[k] = (m[k] || 0) + 1
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [reports])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return reports.filter((r) => {
      // quarantine filter
      if (showQuarantine) {
        if (!r.quarantined) return false
      } else {
        if (r.quarantined) return false
      }

      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (categoryFilter !== 'all' && (r.type || '').toString().toLowerCase() !== categoryFilter) return false
      if (!qq) return true
      const hay = `${r.description || ''} ${r.title || ''} ${r.address || ''} ${r.id || ''}`.toLowerCase()
      return hay.includes(qq)
    })
  }, [reports, q, statusFilter, categoryFilter, showQuarantine])

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [totalPages, page])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const showToast = useCallback((tObj) => {
    setToast(tObj)
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

  /* ---------- Optimistic actions (bulk-aware) ---------- */

  const changeStatus = useCallback(async (id, status) => {
    if (!id) return
    markBusy(id, true)
    let prev = null
    setReports((rs) => {
      prev = rs
      return rs.map((x) => (x.id === id ? { ...x, status } : x))
    })
    try {
      const res = await authFetch(`/api/reports/${id}`, {
        method: 'PATCH',
        body: { status },
      })
      if (res.status === 401) {
        clearAdminToken()
        navigate('/admin-login', { replace: true })
        return
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Server ${res.status}`)
      }
      showToast({ type: 'success', text: t('statusUpdated', 'Status updated') })
    } catch (err) {
      setReports(prev || [])
      showToast({ type: 'error', text: t('failedUpdateStatus', 'Failed to update status') })
      console.error('changeStatus error', err)
    } finally {
      markBusy(id, false)
    }
  }, [markBusy, showToast, navigate, t])

  const quarantineReport = useCallback(async (id, reasonOverride = null) => {
    if (!id) return
    const reason = reasonOverride ?? prompt(t('quarantineReasonPrompt', 'Reason for quarantining (optional):'), 'flagged by admin')
    if (reason === null) return
    if (!confirm(t('confirmQuarantine', 'Quarantine this report?'))) return
    markBusy(id, true)
    let prev = null
    setReports((rs) => {
      prev = rs
      return rs.map((x) => (x.id === id ? { ...x, quarantined: true, quarantine_reason: reason } : x))
    })
    try {
      const res = await authFetch(`/api/reports/${id}`, {
        method: 'PATCH',
        body: { quarantined: true, quarantine_reason: reason },
      })
      if (res.status === 401) {
        clearAdminToken()
        navigate('/admin-login', { replace: true })
        return
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Server ${res.status}`)
      }
      showToast({ type: 'success', text: t('reportQuarantined', 'Report quarantined') })
    } catch (err) {
      setReports(prev || [])
      showToast({ type: 'error', text: t('failedQuarantine', 'Failed to quarantine report') })
      console.error('quarantineReport error', err)
    } finally {
      markBusy(id, false)
    }
  }, [markBusy, showToast, navigate, t])

  const restoreReport = useCallback(async (id) => {
    if (!id) return
    if (!confirm(t('confirmRestore', 'Restore this report to public view?'))) return
    markBusy(id, true)
    let prev = null
    setReports((rs) => {
      prev = rs
      return rs.map((x) => (x.id === id ? { ...x, quarantined: false, quarantine_reason: null } : x))
    })
    try {
      const res = await authFetch(`/api/reports/${id}`, {
        method: 'PATCH',
        body: { quarantined: false },
      })
      if (res.status === 401) {
        clearAdminToken()
        navigate('/admin-login', { replace: true })
        return
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Server ${res.status}`)
      }
      showToast({ type: 'success', text: t('reportRestored', 'Report restored') })
    } catch (err) {
      setReports(prev || [])
      showToast({ type: 'error', text: t('failedRestore', 'Failed to restore report') })
      console.error('restoreReport error', err)
    } finally {
      markBusy(id, false)
    }
  }, [markBusy, showToast, navigate, t])

  const purgeReport = useCallback(async (id) => {
    if (!id) return
    if (!confirm(t('confirmDelete', 'Permanently delete this report? This cannot be undone.'))) return
    markBusy(id, true)
    let prev = null
    setReports((rs) => {
      prev = rs
      return rs.filter((x) => x.id !== id)
    })
    try {
      const res = await authFetch(`/api/reports/${id}`, {
        method: 'DELETE',
      })
      if (res.status === 401) {
        clearAdminToken()
        navigate('/admin-login', { replace: true })
        return
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Server ${res.status}`)
      }
      showToast({ type: 'success', text: t('reportDeleted', 'Report deleted permanently') })
    } catch (err) {
      setReports(prev || [])
      showToast({ type: 'error', text: t('failedDelete', 'Failed to delete report') })
      console.error('purgeReport error', err)
    } finally {
      markBusy(id, false)
    }
  }, [markBusy, showToast, navigate, t])

  // bulk helper actions (operate sequentially)
  const performBulk = useCallback(async (ids = [], action) => {
    if (!ids || ids.length === 0) return
    const confirmed = confirm(t('confirmBulk', `Are you sure you want to ${action} ${ids.length} selected reports?`))
    if (!confirmed) return
    for (const id of ids) {
      if (action === 'restore') await restoreReport(id)
      if (action === 'delete') await purgeReport(id)
      if (action === 'quarantine') await quarantineReport(id, 'bulk: admin action')
    }
    setSelectedIds(new Set())
  }, [restoreReport, purgeReport, quarantineReport, t])

  // debug: log the report object when opening view so you can inspect keys in browser console
  const handleView = useCallback((r) => {
    console.log('openReport payload', r)
    setOpenReport(r)
  }, [])

  /* ---------- selection helpers ---------- */
  const toggleSelect = useCallback((id) => {
    setSelectedIds((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllOnPage = useCallback(() => {
    const ids = paged.map((p) => p.id)
    setSelectedIds((s) => {
      const next = new Set(s)
      let all = true
      for (const id of ids) if (!next.has(id)) { all = false; break }
      if (all) {
        for (const id of ids) next.delete(id)
      } else {
        for (const id of ids) next.add(id)
      }
      return next
    })
  }, [paged])

  /* ---------- simple CSV export (client-side) ---------- */
  const exportCSV = useCallback(() => {
    const data = filtered.map((r) => ({
      id: r.id,
      status: r.status,
      quarantined: r.quarantined ? 'yes' : 'no',
      type: r.type || '',
      title: (r.title || r.description || '').replace(/\n/g, ' '),
      address: r.address || r.location_text || '',
      created_at: r.created_at || '',
      reporter: r.name || r.reporter || '',
      contact: r.phone || r.contact || r.mobile || '',
    }))

    const keys = ['id', 'status', 'quarantined', 'type', 'title', 'address', 'created_at', 'reporter', 'contact']
    const csv = [
      keys.join(','),
      ...data.map((row) => keys.map((k) => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reports-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast({ type: 'success', text: t('csvExported', 'CSV exported') })
  }, [filtered, showToast, t])

  /* ---------- Render ---------- */
  return (
    <div className="space-y-8">
      {/* Header with Logout */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-extrabold">{t('administrativeDashboard', 'Administrative Dashboard')}</h1>
            <div className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">{t('officialIndia', 'Official • Govt of India')}</div>
          </div>
          <p className="text-gray-500 mt-2">{t('manageModerate', 'Manage and moderate reported issues')}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50"
            aria-label={t('exportCsv', 'Export CSV of filtered reports')}
          >
            {t('exportCsv', 'Export CSV')}
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
            disabled={logoutLoading}
            aria-label={t('logout', 'Logout')}
          >
            {logoutLoading ? t('loggingOut', 'Logging out…') : t('logout', 'Logout')}
          </button>
        </div>
      </div>

      {/* top stat cards + category breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard title={t('activeReports', 'Active Reports')} value={totalActive} sub={t('visibleToPublic', 'Visible to public')} />
          <StatCard title={t('pending', 'Pending')} value={pending} sub={t('pendingHint', 'Submitted / Acknowledged')} />
          <StatCard title={t('inProgress', 'In Progress')} value={inProgress} sub={t('inProgressHint', 'Assigned / Working')} />
          <StatCard title={t('resolved', 'Resolved')} value={resolved} sub={t('resolvedHint', 'Closed issues')} />
        </div>

        <div className="md:col-span-2 bg-white rounded-2xl p-4 border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">{t('quarantine', 'Quarantine')}</div>
              <div className="text-2xl font-semibold mt-2">{quarantineCount}</div>
            </div>
            <div>
              <button
                onClick={() => setShowQuarantine((s) => !s)}
                className="px-3 py-2 rounded-lg bg-gray-50 border text-sm"
              >
                {showQuarantine ? t('showActive', 'Show Active') : t('showQuarantine', 'Show Quarantine')}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">{t('topCategories', 'Top categories')}</div>
            <div className="flex flex-wrap gap-2">
              {categoryBreakdown.length === 0 ? (
                <div className="text-xs text-gray-400">{t('noData', 'No data')}</div>
              ) : (
                categoryBreakdown.map(([name, count]) => (
                  <div key={name} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {name} • {count}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* main panel: filters + list + bulk actions */}
      <div className="bg-white rounded-2xl p-6 border shadow-sm">
        <div className="mb-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
          <input
            placeholder={showQuarantine ? t('searchQuarantine', 'Search quarantine...') : t('searchReports', 'Search reports...')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 rounded-lg px-4 py-3 bg-gray-50 border"
          />

          <div className="flex gap-3 ml-auto items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg px-3 py-2 bg-gray-50 border"
            >
              <option value="all">{t('allStatus', 'All Status')}</option>
              <option value="submitted">{t('submitted', 'Submitted')}</option>
              <option value="high_priority">{t('highPriority', 'High Priority')}</option>
              <option value="acknowledged">{t('acknowledged', 'Acknowledged')}</option>
              <option value="in_progress">{t('inProgress', 'In Progress')}</option>
              <option value="resolved">{t('resolved', 'Resolved')}</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg px-3 py-2 bg-gray-50 border"
            >
              <option value="all">{t('allCategories', 'All Categories')}</option>
              {normalizedCategoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
              className="rounded-lg px-3 py-2 bg-gray-50 border"
              title={t('resultsPerPage', 'Results per page')}
            >
              <option value={6}>6 / page</option>
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
            </select>
          </div>
        </div>

        {/* Bulk actions */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={selectAllOnPage}
            className="px-3 py-2 rounded border bg-white text-sm"
          >
            {t('toggleSelectPage', 'Toggle select page')}
          </button>

          <button
            disabled={selectedIds.size === 0}
            onClick={() => performBulk(Array.from(selectedIds), 'restore')}
            className="px-3 py-2 rounded border bg-white text-sm"
          >
            ♻️ {t('restoreSelected', 'Restore selected')} ({selectedIds.size})
          </button>

          <button
            disabled={selectedIds.size === 0}
            onClick={() => performBulk(Array.from(selectedIds), 'quarantine')}
            className="px-3 py-2 rounded border bg-white text-sm"
          >
            🚫 {t('quarantineSelected', 'Quarantine selected')}
          </button>

          <button
            disabled={selectedIds.size === 0}
            onClick={() => performBulk(Array.from(selectedIds), 'delete')}
            className="px-3 py-2 rounded border bg-white text-sm text-red-600"
          >
            🗑️ {t('deleteSelected', 'Delete selected')}
          </button>

          <div className="ml-auto text-sm text-gray-500">
            {t('showingResults', 'Showing')} <strong>{filtered.length}</strong> {t('results', 'results')} • {t('pageLabel', 'Page')} {page}/{totalPages}
          </div>
        </div>

        {loading ? (
          <div className="text-gray-500">{t('loadingReports', 'Loading reports…')}</div>
        ) : error ? (
          <div className="text-red-500">{t('errorPrefix', 'Error')}: {error}</div>
        ) : (
          <div className="space-y-4">
            {filtered.length === 0 && <div className="text-gray-500">{t('noMatch', 'No reports match your filters.')}</div>}

            {paged.map((r, idx) => {
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
                  selected={selectedIds.has(r.id)}
                  onSelect={toggleSelect}
                />
              )
            })}
          </div>
        )}

        {/* pagination controls */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 rounded border bg-white"
              disabled={page === 1}
            >
              {t('prev', 'Prev')}
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-2 rounded border bg-white"
              disabled={page === totalPages}
            >
              {t('next', 'Next')}
            </button>
          </div>

          <div className="text-sm text-gray-500">{t('pageOf', 'Page')} {page} {t('of', 'of')} {totalPages}</div>
        </div>
      </div>

      {/* Report detail modal */}
      <Modal open={!!openReport} onClose={() => setOpenReport(null)} title={`${t('reportNumber', 'Report')} #${openReport?.id || ''}`}>
        {openReport ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-500 mb-2">{t('category', 'Category')}</div>
              <div className="font-medium mb-4">{openReport.type || '—'}</div>

              <div className="text-sm text-gray-500 mb-2">{t('status', 'Status')}</div>
              <div className="mb-4"><StatusBadge status={openReport.status} /></div>

              <div className="text-sm text-gray-500 mb-2">{t('reported', 'Reported')}</div>
              <div className="mb-4">{openReport.created_at ? new Date(openReport.created_at).toLocaleString() : '—'}</div>

              <div className="text-sm text-gray-500 mb-2">{t('complaintAddress', 'Complaint Address')}</div>
              <div className="mb-4">
                {openReport.location_text
                  || openReport.address
                  || (openReport.location_lat && openReport.location_lng
                      ? `${Number(openReport.location_lat).toFixed(4)}, ${Number(openReport.location_lng).toFixed(4)}`
                      : '—')}
              </div>

              <div className="text-sm text-gray-500 mb-2">{t('complainantName', 'Complainant Name')}</div>
              <div className="font-medium mb-3">
                {openReport.name || openReport.fullName || openReport.reporter || openReport.created_by || '—'}
              </div>

              <div className="text-sm text-gray-500 mb-2">{t('email', 'Email')}</div>
              <div className="mb-3">{openReport.email || openReport.email_address || '—'}</div>

              <div className="text-sm text-gray-500 mb-2">{t('contactNo', 'Contact No.')}</div>
              <div className="mb-4">
                {openReport.contact || openReport.phone || openReport.mobile || openReport.phone_number || '—'}
              </div>

              <div className="text-sm text-gray-500 mb-2">{t('description', 'Description')}</div>
              <div className="text-gray-700">{openReport.description || openReport.title || t('noDescription', 'No description')}</div>

              {openReport.quarantine_reason && (
                <>
                  <div className="text-sm text-gray-500 mt-4 mb-2">{t('quarantineReason', 'Quarantine reason')}</div>
                  <div className="text-sm text-orange-700">{openReport.quarantine_reason}</div>
                </>
              )}
            </div>

            <div>
              {/* Show map when coords available */}
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
                  {t('reportQuarantinedModerator', 'Report quarantined — moderator review')}
                </div>
              ) : (openReport.photo_url || openReport.photo || openReport.photoUrl || openReport.file_url) ? (
                <img
                  src={buildImageSrc(openReport.photo_url || openReport.photo || openReport.photoUrl || openReport.file_url)}
                  alt="report"
                  className="w-full rounded-md object-cover border"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <div className="h-64 rounded-md bg-gray-50 border flex items-center justify-center text-gray-400">{t('noImage', 'No image')}</div>
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
