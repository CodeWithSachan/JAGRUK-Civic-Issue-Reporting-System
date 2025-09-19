// src/pages/MapView.jsx
// Enhanced MapView with hover tooltips, satellite toggle, export CSV, debounced search, and mobile drawer.
// No additional npm packages required.

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Tooltip,
  useMapEvent,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Vite-friendly Leaflet images
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

;(function initLeafletIcons() {
  try {
    L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl })
  } catch (e) {
    // ignore
  }
})()

/* ---------- helpers ---------- */

const STATUS_TO_COLOR = {
  high_priority: '#ef4444',
  submitted: '#f59e0b',
  acknowledged: '#60a5fa',
  in_progress: '#3b82f6',
  resolved: '#10b981',
  your_location: '#6366f1',
}

function statusLabelFromKey(key) {
  if (!key) return 'Unknown'
  const k = String(key).toLowerCase()
  switch (k) {
    case 'high_priority':
      return 'High Priority'
    case 'submitted':
      return 'Submitted'
    case 'acknowledged':
      return 'Acknowledged'
    case 'in_progress':
      return 'In Progress'
    case 'resolved':
      return 'Resolved'
    case 'your_location':
      return 'Your Location'
    default:
      return k.replace(/_/g, ' ')
  }
}

function buildPhotoUrl(src) {
  if (!src) return null
  if (/^https?:\/\//i.test(src)) return src
  if (typeof window === 'undefined') return src
  return src.startsWith('/') ? `${window.location.origin}${src}` : `${window.location.origin}/${src}`
}

function parseCoords(r) {
  if (!r) return [null, null]
  const latCandidates = [r.location_lat, r.locationLatitude, r.locationLat, r.lat, r.latitude, r.coords?.lat]
  const lngCandidates = [r.location_lng, r.locationLongitude, r.locationLng, r.lng, r.longitude, r.coords?.lng]
  for (let i = 0; i < Math.max(latCandidates.length, lngCandidates.length); i++) {
    const la = latCandidates[i]; const lo = lngCandidates[i]
    const nla = la != null ? Number(la) : null
    const nlo = lo != null ? Number(lo) : null
    if (isFinite(nla) && isFinite(nlo)) return [nla, nlo]
  }
  const possibleStrings = [r.location, r.location_text, r.coords, r.coordsString, r.coords_str]
  for (const s of possibleStrings) {
    if (!s) continue
    const str = typeof s === 'string' ? s : String(s)
    const m = str.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
    if (m) return [parseFloat(m[1]), parseFloat(m[2])]
  }
  return [null, null]
}

/* SVG marker icon (colored) */
function coloredSvgIcon(color = '#2563eb', label = '') {
  const labelSvg = label ? `<text x="14" y="18" text-anchor="middle" font-size="11" font-family="sans-serif" font-weight="600" fill="white">${label}</text>` : ''
  // Add a subtle white back circle for contrast (works well on imagery)
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42" fill="none">
      <circle cx="14" cy="12" r="10" fill="white" opacity="0.85"/>
      <path d="M14 0C8.5 0 4 4.5 4 10c0 7.5 10 22 10 22s10-14.5 10-22c0-5.5-4.5-10-10-10z" fill="${color}"/>
      <circle cx="14" cy="12" r="4.2" fill="white" opacity="0.92"/>
      ${labelSvg}
    </svg>
  `)
  const url = `data:image/svg+xml;charset=utf-8,${svg}`
  return L.icon({
    iconUrl: url,
    iconRetinaUrl: url,
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -40],
    shadowUrl,
    shadowSize: [41, 41],
    shadowAnchor: [14, 41],
  })
}

/* simple cluster div icon */
function clusterDivIcon(count, color = '#2563eb') {
  const size = Math.min(64, 34 + Math.round(Math.log(Math.max(1, count)) * 10))
  const html = `
    <div style="
      display:flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};color:white;font-weight:700;
      box-shadow:0 4px 10px rgba(0,0,0,0.12);
      border:3px solid rgba(255,255,255,0.9);
      font-size:${Math.max(12, Math.round(size/3))}px;
    ">
      ${count}
    </div>
  `
  return L.divIcon({ html, className: 'custom-cluster-icon', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })
}

/* Fit bounds helper */
function FitToBoundsOnLoad({ mapRef, points }) {
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const pts = (points || []).filter(Boolean)
    if (!pts.length) return
    try {
      const bounds = L.latLngBounds(pts)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
    } catch (e) {}
  }, [mapRef, points])
  return null
}

/* map event wrapper */
function MapEvents({ onZoom }) {
  useMapEvent('zoomend', (e) => { if (onZoom) onZoom(e.target.getZoom()) })
  return null
}

/* small debounce hook */
function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

/* CSV export helper */
function exportCsv(records = []) {
  if (!records || records.length === 0) return
  const fields = ['id', 'title', 'status', 'created_at', 'location_text', 'location_lat', 'location_lng', 'address']
  const rows = [fields.join(',')]
  for (const r of records) {
    const vals = fields.map((f) => {
      const v = r[f] ?? ''
      return `"${String(v).replace(/"/g, '""')}"`
    })
    rows.push(vals.join(','))
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `civic_reports_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/* ---------- main component ---------- */

export default function MapView() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [userPos, setUserPos] = useState(null)
  const [zoom, setZoom] = useState(10)
  const [clusterEnabled, setClusterEnabled] = useState(true)
  const [densityEnabled, setDensityEnabled] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [q, setQ] = useState('')
  const debouncedQ = useDebounced(q, 250)
  const [selectedReportId, setSelectedReportId] = useState(null)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [satelliteEnabled, setSatelliteEnabled] = useState(false)

  const mapRef = useRef(null)
  const markersRef = useRef(new Map())
  const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) ? import.meta.env.VITE_API_BASE : ''

  useEffect(() => {
    let mounted = true
    const ac = new AbortController()
    async function load() {
      setLoading(true); setError(null)
      try {
        const res = await fetch(`${API_BASE || ''}/api/public/reports`, { signal: ac.signal })
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        const data = await res.json()
        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
        const normalized = arr.map((r) => {
          const [lat, lng] = parseCoords(r)
          return {
            ...r,
            location_lat: lat ?? (r.location_lat ?? null),
            location_lng: lng ?? (r.location_lng ?? null),
            created_at: r.created_at ?? r.createdAt ?? r.date ?? null,
            type: (r.type || r.category || r.issue_type || 'other').toString(),
            status: (r.status || r.priority || 'submitted').toString().toLowerCase(),
          }
        })
        const withCoords = normalized.filter((r) => isFinite(Number(r.location_lat)) && isFinite(Number(r.location_lng)))
        if (mounted) setReports(withCoords)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err)
          if (mounted) setError(err.message || 'Failed to load')
          if (mounted) setReports([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false; ac.abort() }
  }, [API_BASE])

  // user geolocation (non-blocking)
  useEffect(() => {
    if (!navigator.geolocation) return
    let mounted = true
    navigator.geolocation.getCurrentPosition((pos) => {
      if (!mounted) return
      setUserPos([pos.coords.latitude, pos.coords.longitude])
    }, () => {}, { enableHighAccuracy: true })
    return () => { mounted = false }
  }, [])

  // derived
  const categories = useMemo(() => Array.from(new Set(reports.map((r) => (r.type || 'other').toString().toLowerCase()).filter(Boolean))), [reports])
  const totalCount = reports.length
  const pendingCount = reports.filter((r) => (r.status || '').toLowerCase() === 'submitted' && !r.quarantined).length
  const inProgressCount = reports.filter((r) => (r.status || '').toLowerCase() === 'in_progress' && !r.quarantined).length
  const resolvedCount = reports.filter((r) => (r.status || '').toLowerCase() === 'resolved' && !r.quarantined).length

  // filter with debouncedQ
  const filteredReports = useMemo(() => {
    const qq = (debouncedQ || '').trim().toLowerCase()
    return reports.filter((r) => {
      if (statusFilter !== 'all' && (r.status || '').toLowerCase() !== statusFilter) return false
      if (categoryFilter !== 'all' && (r.type || '').toString().toLowerCase() !== categoryFilter) return false
      if (qq) {
        const hay = `${r.description || ''} ${r.title || ''} ${r.location_text || r.address || ''}`.toLowerCase()
        if (!hay.includes(qq)) return false
      }
      return true
    })
  }, [reports, statusFilter, categoryFilter, debouncedQ])

  // grid clusters
  const gridClusters = useMemo(() => {
    const decimals = Math.max(0, Math.min(5, Math.round((zoom - 6) / 2) + 1))
    const pow = Math.pow(10, decimals)
    const m = new Map()
    for (const r of filteredReports) {
      const lat = Number(r.location_lat); const lng = Number(r.location_lng)
      if (!isFinite(lat) || !isFinite(lng)) continue
      const key = `${Math.round(lat * pow) / pow}|${Math.round(lng * pow) / pow}`
      if (!m.has(key)) m.set(key, { key, latSum: 0, lngSum: 0, count: 0, items: [] })
      const bucket = m.get(key)
      bucket.latSum += lat; bucket.lngSum += lng; bucket.count += 1; bucket.items.push(r)
    }
    return Array.from(m.values()).map((b) => ({ ...b, lat: b.latSum / b.count, lng: b.lngSum / b.count }))
  }, [filteredReports, zoom])

  const fitPoints = useMemo(() => {
    const pts = filteredReports.map((r) => [Number(r.location_lat), Number(r.location_lng)])
    if (userPos) pts.push(userPos)
    return pts.filter((p) => Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1]))
  }, [filteredReports, userPos])

  const onMapCreated = (mapInst) => {
    mapRef.current = mapInst
    setZoom(mapInst.getZoom())
  }
  function onZoomChange(z) { setZoom(z) }

  const anyClustered = useMemo(() => {
    if (!clusterEnabled) return false
    return gridClusters.some((c) => c.count > 1)
  }, [gridClusters, clusterEnabled])

  const defaultCenter = [24.0, 85.0]
  const center = userPos || (filteredReports.length ? [Number(filteredReports[0].location_lat), Number(filteredReports[0].location_lng)] : defaultCenter)

  const openPopupForReport = useCallback((report) => {
    if (!report) return
    const lat = Number(report.location_lat); const lng = Number(report.location_lng)
    if (!isFinite(lat) || !isFinite(lng)) return
    if (mapRef.current) mapRef.current.setView([lat, lng], 16, { animate: true })
    setTimeout(() => {
      try {
        const m = markersRef.current.get(report.id)
        if (m && typeof m.openPopup === 'function') m.openPopup()
      } catch (e) {}
    }, 300)
    setSelectedReportId(report.id)
  }, [])

  const onClusterClick = useCallback((cluster) => {
    if (!mapRef.current) return
    const newZoom = Math.min(18, Math.max(6, zoom + 2))
    try { mapRef.current.setView([cluster.lat, cluster.lng], newZoom, { animate: true }) } catch (e) {}
  }, [zoom])

  // Render helpers
  function renderMarker(r) {
    const lat = Number(r.location_lat); const lng = Number(r.location_lng)
    if (!isFinite(lat) || !isFinite(lng)) return null
    const color = STATUS_TO_COLOR[r.status] || STATUS_TO_COLOR.submitted
    const statusLetter = (r.status && r.status[0]?.toUpperCase()) || ''
    const icon = coloredSvgIcon(color, statusLetter)

    return (
      <Marker
        key={r.id || `${lat}-${lng}-${r.created_at}`}
        position={[lat, lng]}
        icon={icon}
        ref={(m) => {
          try {
            if (m && r.id) markersRef.current.set(r.id, m)
            else if (r.id) markersRef.current.delete(r.id)
          } catch (e) {}
        }}
        eventHandlers={{ click: () => setSelectedReportId(r.id) }}
      >
        {/* Hover tooltip preview */}
        <Tooltip direction="top" offset={[0, -10]} opacity={0.95} className="text-sm">
          <div style={{ minWidth: 140, maxWidth: 260 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{(r.title || r.type || 'Issue')}</div>
            <div style={{ fontSize: 12, color: '#444' }}>{statusLabelFromKey(r.status)}</div>
            {r.photo_url ? (
              <img
                src={buildPhotoUrl(r.photo_url)}
                alt=""
                style={{ width: '100%', height: 64, objectFit: 'cover', borderRadius: 6, marginTop: 6 }}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            ) : null}
          </div>
        </Tooltip>

        <Popup>
          <div style={{ maxWidth: 320 }}>
            <div style={{ fontWeight: 700 }}>{(r.type || 'Issue').replace(/_/g, ' ')}</div>
            <div style={{ marginTop: 6, color: '#444' }}>{(r.description || r.title || 'No description')}</div>
            {r.photo_url ? (
              <img
                src={buildPhotoUrl(r.photo_url)}
                alt="rep"
                style={{ width: '100%', marginTop: 8, borderRadius: 6, objectFit: 'cover' }}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            ) : null}
            <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
              Status: <strong>{statusLabelFromKey(r.status)}</strong>
              <br />
              Reported: {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => { if (mapRef.current) mapRef.current.setView([lat, lng], 17, { animate: true }) }}
                className="px-3 py-1 rounded border bg-white text-sm"
              >
                Zoom
              </button>
            </div>
          </div>
        </Popup>
      </Marker>
    )
  }

  function renderClusterMarker(cluster) {
    const statusCounts = {}
    for (const it of cluster.items) { statusCounts[it.status] = (statusCounts[it.status] || 0) + 1 }
    const majority = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'submitted'
    const color = STATUS_TO_COLOR[majority] || '#2563eb'
    const icon = clusterDivIcon(cluster.count, color)
    return (
      <Marker
        key={`cluster-${cluster.key}`}
        position={[cluster.lat, cluster.lng]}
        icon={icon}
        eventHandlers={{ click: () => onClusterClick(cluster) }}
      >
        <Popup>
          <div style={{ maxWidth: 320 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{cluster.count} reports here</div>
            <div style={{ fontSize: 13, color: '#444' }}>
              {cluster.items.slice(0, 6).map((it) => (
                <div key={it.id || `${it.location_lat}-${it.location_lng}`} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 56, height: 44, overflow: 'hidden', borderRadius: 6, background: '#f3f4f6' }}>
                    {it.photo_url ? <img src={buildPhotoUrl(it.photo_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.currentTarget.style.display = 'none'} /> : null}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{(it.title || it.description || 'No title').slice(0, 80)}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{it.created_at ? new Date(it.created_at).toLocaleString() : ''}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button onClick={() => onClusterClick(cluster)} className="px-3 py-1 rounded border bg-white text-sm">Zoom in</button>
              <button onClick={() => { const r = cluster.items[0]; if (r) openPopupForReport(r) }} className="px-3 py-1 rounded border bg-white text-sm">Open first</button>
            </div>
          </div>
        </Popup>
      </Marker>
    )
  }

  // controls
  function handleLocateMe() {
    if (!mapRef.current) return
    if (userPos) mapRef.current.setView(userPos, 14, { animate: true })
    else if (fitPoints.length) mapRef.current.fitBounds(L.latLngBounds(fitPoints), { padding: [40, 40] })
    else mapRef.current.setView(defaultCenter, 7)
  }

  function handleFit() {
    if (!mapRef.current) return
    if (fitPoints.length) mapRef.current.fitBounds(L.latLngBounds(fitPoints), { padding: [40, 40] })
  }

  function handleToggleLayer() {
    setSatelliteEnabled((s) => !s)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* top mobile toggle for sidebar */}
        <div className="lg:hidden mb-2 flex justify-end">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-3 py-2 rounded border bg-white text-sm"
            aria-expanded={sidebarOpen}
            aria-controls="map-sidebar"
          >
            Filters & Reports
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map panel */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-4 border shadow-sm relative">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl font-semibold">Community Reports Map</h2>
                <div className="text-sm text-gray-500">Browse municipal issues — hover or click markers for details</div>
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={clusterEnabled} onChange={(e) => setClusterEnabled(e.target.checked)} />
                  <span>Cluster</span>
                </label>

                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={densityEnabled} onChange={(e) => setDensityEnabled(e.target.checked)} />
                  <span>Density</span>
                </label>

                <button onClick={handleLocateMe} className="px-3 py-2 rounded-md border bg-white text-sm">📍 Locate</button>
                <button onClick={handleFit} className="px-3 py-2 rounded-md border bg-white text-sm">Fit</button>
                <button onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setQ('') }} className="px-3 py-2 rounded-md border bg-white text-sm">Reset</button>
                <button onClick={handleToggleLayer} className="px-3 py-2 rounded-md border bg-white text-sm">{satelliteEnabled ? 'Satellite' : 'Map'}</button>
                <button onClick={() => exportCsv(filteredReports)} className="px-3 py-2 rounded-md border bg-white text-sm">Export CSV</button>
              </div>
            </div>

            <div style={{ height: 520 }} className="rounded-lg overflow-hidden border relative map-wrapper">
              {loading ? (
                <div className="h-full flex items-center justify-center text-gray-400">Loading map…</div>
              ) : error ? (
                <div className="h-full flex items-center justify-center text-red-500 flex-col">
                  <div className="text-lg font-semibold">Failed to load reports</div>
                  <div className="mt-2 text-sm">{error}</div>
                </div>
              ) : (
                <MapContainer
                  center={center}
                  zoom={zoom}
                  style={{ height: '100%', width: '100%' }}
                  whenCreated={onMapCreated}
                  zoomControl={false}
                >
                  {/* Choose tile layer based on state: default OpenStreetMap or Esri Satellite */}
                  {satelliteEnabled ? (
                    <TileLayer
                      attribution='Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                  ) : (
                    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  )}

                  <MapEvents onZoom={onZoomChange} />
                  <FitToBoundsOnLoad mapRef={mapRef} points={fitPoints} />

                  {userPos && <Circle center={userPos} radius={40} pathOptions={{ color: STATUS_TO_COLOR.your_location, fillColor: STATUS_TO_COLOR.your_location, fillOpacity: 0.12 }} />}

                  {densityEnabled && filteredReports.slice(0, 200).map((r, idx) => {
                    const lat = Number(r.location_lat); const lng = Number(r.location_lng)
                    if (!isFinite(lat) || !isFinite(lng)) return null
                    return <Circle key={`d-${r.id || idx}`} center={[lat, lng]} radius={60} pathOptions={{ color: STATUS_TO_COLOR[r.status] || '#888', fillOpacity: 0.04 }} />
                  })}

                  {anyClustered ? (
                    gridClusters.map((c) => (c.count > 1 ? renderClusterMarker(c) : renderMarker(c.items[0])))
                  ) : (
                    filteredReports.map((r) => renderMarker(r))
                  )}
                </MapContainer>
              )}

              {/* map layer badge */}
              <div style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 4000 }}>
                <div className="text-xs bg-white px-3 py-1 rounded-full shadow-sm border">{satelliteEnabled ? 'Satellite' : 'Map'}</div>
              </div>
            </div>

            {/* Stats below map */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#fffaf0' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>📊</span>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Reports</div>
                  <div className="text-2xl font-semibold">{totalCount}</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#fff0f0' }}>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>●</span>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Pending</div>
                  <div className="text-2xl font-semibold">{pendingCount}</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#eef2ff' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 700 }}>●</span>
                </div>
                <div>
                  <div className="text-sm text-gray-500">In Progress</div>
                  <div className="text-2xl font-semibold">{inProgressCount}</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#ecfdf5' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>●</span>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Resolved</div>
                  <div className="text-2xl font-semibold">{resolvedCount}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500">CivicReport • Official initiative — Govt. of Jharkhand</div>
          </div>

          {/* RIGHT: sidebar (desktop) */}
          <aside className="hidden lg:block space-y-6">
            <div className="bg-white rounded-2xl p-4 border shadow-sm w-80">
              <h3 className="font-medium mb-3">Priority Queue</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {Object.entries(STATUS_TO_COLOR).map(([key, color]) => (
                  <li key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-block w-3 h-3 mr-2 rounded-full" style={{ backgroundColor: color }} />
                      <span>{statusLabelFromKey(key)}</span>
                    </div>
                    <div className="text-xs text-gray-500">{reports.filter((r) => r.status === key).length}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-4 border shadow-sm w-80" id="map-sidebar">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">Filters</div>
                <div className="text-xs text-gray-500">{filteredReports.length} visible</div>
              </div>

              <div className="space-y-3 text-sm">
                <label className="block">
                  <div className="text-xs text-gray-600 mb-1">Search</div>
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, description, address" className="w-full rounded px-3 py-2 border bg-gray-50 text-sm" />
                </label>

                <label className="block">
                  <div className="text-xs text-gray-600 mb-1">Status</div>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded px-3 py-2 border bg-gray-50 text-sm">
                    <option value="all">All</option>
                    <option value="submitted">Submitted</option>
                    <option value="high_priority">High Priority</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-xs text-gray-600 mb-1">Category</div>
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full rounded px-3 py-2 border bg-gray-50 text-sm">
                    <option value="all">All</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>

                <div className="text-xs text-gray-500">
                  Total: <strong>{totalCount}</strong> • Pending: <strong>{pendingCount}</strong> • Resolved: <strong>{resolvedCount}</strong>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border shadow-sm w-80">
              <div className="font-medium mb-3">Visible reports</div>
              <div className="visible-reports-scroll" style={{ maxHeight: 370, overflow: 'auto' }}>
                {filteredReports.length === 0 ? (
                  <div className="text-gray-500 text-sm">No reports</div>
                ) : (
                  filteredReports.map((r) => {
                    const img = r.photo_url || r.photo || null
                    const locationSnippet = (r.location_text || r.address || '').slice(0, 120)
                    return (
                      <div
                        key={r.id || `${r.location_lat}-${r.location_lng}-${r.created_at}`}
                        className={`report-card p-3 rounded border mb-3 cursor-pointer hover:shadow-sm transition ${selectedReportId === r.id ? 'bg-gray-50' : 'bg-white'}`}
                        onClick={() => openPopupForReport(r)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPopupForReport(r) }}
                        title={(r.location_text || r.address || '')}
                        style={{ minWidth: 0 }}
                      >
                        <div className="flex items-start gap-3">
                          <div style={{ width: 74, height: 54, background: '#f3f4f6', borderRadius: 8, overflow: 'hidden', flex: '0 0 74px' }}>
                            {img ? <img src={buildPhotoUrl(img)} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.currentTarget.style.display = 'none'} /> : null}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="text-xs text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</div>
                            <div className="font-medium text-sm mt-1 truncate">{(r.title || r.description || '').slice(0, 80)}</div>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: `${(STATUS_TO_COLOR[r.status] || '#ddd')}22`, color: STATUS_TO_COLOR[r.status] || '#333' }}>{statusLabelFromKey(r.status)}</div>
                              <div className="text-xs text-gray-500 truncate ml-1" style={{ maxWidth: 120 }} title={(r.location_text || r.address || '')}>{locationSnippet}</div>
                              <button onClick={(e) => { e.stopPropagation(); openPopupForReport(r) }} className="ml-auto px-2 py-1 rounded border text-xs bg-white">🔎</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile drawer sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-11/12 max-w-sm bg-white p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="font-medium">Filters & Reports</div>
              <button onClick={() => setSidebarOpen(false)} className="px-2 py-1 rounded border">Close</button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-600 mb-1">Search</div>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, description, address" className="w-full rounded px-3 py-2 border bg-gray-50 text-sm" />
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-1">Status</div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded px-3 py-2 border bg-gray-50 text-sm">
                  <option value="all">All</option>
                  <option value="submitted">Submitted</option>
                  <option value="high_priority">High Priority</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-1">Category</div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full rounded px-3 py-2 border bg-gray-50 text-sm">
                  <option value="all">All</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <div className="font-medium mb-2">Visible reports</div>
                <div style={{ maxHeight: 320, overflow: 'auto' }}>
                  {filteredReports.map((r) => {
                    const img = r.photo_url || r.photo || null
                    const locationSnippet = (r.location_text || r.address || '').slice(0, 80)
                    return (
                      <div key={r.id} className="p-2 border rounded mb-2" onClick={() => { openPopupForReport(r); setSidebarOpen(false) }}>
                        <div className="text-sm font-medium">{(r.title || r.description || '').slice(0, 60)}</div>
                        <div className="text-xs text-gray-500">{locationSnippet}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
