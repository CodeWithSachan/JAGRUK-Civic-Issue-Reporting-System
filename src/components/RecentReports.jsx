// src/components/RecentReports.jsx
import React, { useEffect, useState, useCallback } from 'react'

function StatusBadge({ status = '' }) {
  const s = String(status || '').toLowerCase()
  const mapping = {
    submitted: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    inprogress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-green-100 text-green-800',
    default: 'bg-gray-100 text-gray-800',
  }
  const cls = mapping[s] ?? mapping.default
  const label = s ? s.replace(/_/g, ' ') : 'unknown'
  return (
    <span
      className={`inline-block px-3 py-1 rounded-md text-sm font-medium ${cls}`}
      aria-label={`status: ${label}`}
    >
      {label}
    </span>
  )
}

/**
 * RecentReports
 *
 * Props:
 *  - limit: number of items to show (default 5)
 *  - inline: render inline (no outer card)
 *  - renderExtra: optional function(report) => ReactNode — renders extra UI inside each item (e.g. View button)
 */
export default function RecentReports({ limit = 5, inline = false, renderExtra = null }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Nicely shorten long addresses (e.g. show "Karol Bagh, Delhi")
  function prettyAddress(addr, maxParts = 2) {
    if (!addr || typeof addr !== 'string') return null
    const parts = addr.split(',').map((s) => s.trim()).filter(Boolean)
    return parts.slice(0, maxParts).join(', ')
  }

  const loadReports = useCallback(
    async (signal) => {
      setLoading(true)
      setError(null)
      try {
const res = await fetch(apiUrl(`/api/public/reports?limit=${limit}`), { signal })
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
        const json = await res.json()
        // Accept both array and { data: [...] } shapes
        const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : []

        // Normalize a few coordinate key names onto location_lat/location_lng when possible
        const normalized = arr.map((r) => {
          const lat =
            r.location_lat ??
            r.lat ??
            r.latitude ??
            (typeof r.location === 'string' && r.location.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
              ? Number(r.location.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)[1])
              : null)
          const lng =
            r.location_lng ??
            r.lng ??
            r.longitude ??
            (typeof r.location === 'string' && r.location.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
              ? Number(r.location.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)[2])
              : null)
          return {
            ...r,
            location_lat: lat != null ? lat : r.location_lat ?? null,
            location_lng: lng != null ? lng : r.location_lng ?? null,
          }
        })

        // Sort newest first
        const sorted = normalized
          .slice()
          .sort((a, b) => {
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0
            return tb - ta
          })

        setItems(sorted)
      } catch (e) {
        if (e.name === 'AbortError') return
        console.error('RecentReports load error', e)
        setItems([])
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    },
    [limit]
  )

  useEffect(() => {
    const ac = new AbortController()
    loadReports(ac.signal)
    return () => ac.abort()
  }, [loadReports])

  const renderImage = (r) => {
    const src = r.photo_url || r.photo || r.photoUrl || ''
    if (!src) {
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
          No image
        </div>
      )
    }
    return (
<img
  src={absolutePhotoUrl(r.photo_url)}
  alt={r.type ? `${r.type} thumbnail` : 'report thumbnail'}
  className="object-cover w-full h-full"
  onError={(e) => {
    try {
      e.currentTarget.onerror = null
      e.currentTarget.src = ''
      e.currentTarget.style.background = '#f3f4f6'
    } catch (err) {}
  }}
/>


  const listContent = (
    <>
      {loading ? (
        <div className="text-gray-500" role="status" aria-live="polite">
          Loading recent reports…
        </div>
      ) : error ? (
        <div className="text-red-500" role="alert" aria-live="assertive">
          Error: {error}
        </div>
      ) : items.length === 0 ? (
        <div className="text-gray-500">No recent reports.</div>
      ) : (
        <div className="space-y-4">
          {items.map((r, idx) => {
            const key = r.id ?? `report-${idx}`
            const typeLabel = (r.type || 'Issue').toString().replace(/_/g, ' ')

            const rawAddr = r.address || r.location_text || r.location
            const pretty = prettyAddress(rawAddr)
            const locationLabel =
              pretty ||
              rawAddr ||
              (r.location_lat != null && r.location_lng != null
                ? `${Number(r.location_lat).toFixed(4)}, ${Number(r.location_lng).toFixed(4)}`
                : 'Unknown')

            const dateLabel = r.created_at
              ? new Date(r.created_at).toLocaleString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''
            return (
              <div
                key={key}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-md bg-white flex items-center justify-center overflow-hidden border">
                    {renderImage(r)}
                  </div>

                  <div>
                    <div className="font-medium text-lg">{typeLabel}</div>
                    <div className="text-sm text-gray-500 mt-1">{locationLabel}</div>

                    {/* render extra content below the location (e.g. View on map button) */}
                    {typeof renderExtra === 'function' ? (
                      <div className="mt-2">{renderExtra(r)}</div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-xs text-gray-400">{dateLabel}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )

  if (inline) return <div>{listContent}</div>

  return (
    <section className="mt-8 bg-white rounded-2xl p-6 border shadow-sm" aria-live="polite">
      <h3 className="text-2xl font-semibold mb-4">Recent Community Reports</h3>
      {listContent}
    </section>
  )
}
<RecentReports
  renderExtra={(r) => (
    <button
      className="text-sm px-3 py-1 rounded border bg-white"
      onClick={() => setOpenReport(r)} // your modal handler
    >
      View on map
    </button>
  )}
/>
