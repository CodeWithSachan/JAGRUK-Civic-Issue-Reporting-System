// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ReportMap from '../components/ReportMap'
import { fetchReports, absolutePhotoUrl } from '../utils/api'
import { useLanguage } from '../context/LanguageContext'

/**
 * SafeThumb
 * - small component to resolve arbitrary raw photo shapes into a usable URL via absolutePhotoUrl()
 * - shows a tiny SVG placeholder when image not available or fails to load
 */
function SafeThumb({ raw, alt = 'thumbnail', className = '' }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    const resolved = raw ? absolutePhotoUrl(raw) : null
    setSrc(resolved)
  }, [raw])

  const placeholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">
      <rect width="100%" height="100%" fill="#f8fafc"/>
      <g fill="#e6eef8"><rect x="12" y="12" width="72" height="56" rx="8"/></g>
    </svg>
  `)

  return (
    <img
      src={src || placeholder}
      alt={alt}
      className={className || 'w-full h-full object-cover'}
      onError={(e) => {
        // prevent infinite loop attempting to set the same src again
        if (!e.currentTarget.dataset.fallback) {
          e.currentTarget.dataset.fallback = '1'
          e.currentTarget.src = placeholder
        }
      }}
    />
  )
}

export default function Home() {
  const { t = (k, d) => d || k } = useLanguage()

  const [reports, setReports] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchReports()
      .then((data) => {
        if (!mounted) return
        const arr = Array.isArray(data) ? data : (data?.reports || [])
        setReports(arr)
      })
      .catch((err) => {
        console.error('fetchReports error', err)
        if (mounted) setError('Unable to load reports')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  // compute stats
  const stats = useMemo(() => {
    if (!Array.isArray(reports)) {
      return { total: 0, resolved: 0, progress: 0, pending: 0 }
    }
    const total = reports.length
    let resolved = 0, progress = 0, pending = 0
    for (const r of reports) {
      const s = String(r.status || r.state || '').toLowerCase()
      if (s.includes('resolv')) resolved++
      else if (s.includes('progress') || s.includes('in progress')) progress++
      else if (s.includes('pending') || s.includes('submitted')) pending++
      else pending++
    }
    return { total, resolved, progress, pending }
  }, [reports])

  // normalize recent items and extract coords
  const normalizedReports = useMemo(() => {
    if (!Array.isArray(reports)) return []
    return reports.map((r) => {
      const latVal = r.lat ?? r.location_lat ?? (typeof r.location === 'string' ? r.location.split(',')[0] : undefined)
      const lngVal = r.lng ?? r.location_lng ?? (typeof r.location === 'string' ? r.location.split(',')[1] : undefined)
      const lat = Number(latVal)
      const lng = Number(lngVal)

      // Normalize photos into a single representative raw value (string or null)
      let photosRaw = null
      if (Array.isArray(r.photo) && r.photo.length) photosRaw = r.photo[0]
      else if (typeof r.photo === 'string' && r.photo.trim()) photosRaw = r.photo
      else if (Array.isArray(r.photos) && r.photos.length) photosRaw = r.photos[0]
      else if (typeof r.photos === 'string' && r.photos.trim()) photosRaw = r.photos
      else if (r.image) photosRaw = r.image
      else if (r.thumbnail) photosRaw = r.thumbnail
      else if (Array.isArray(r.images) && r.images.length && typeof r.images[0] === 'string') photosRaw = r.images[0]
      else if (r.files && Array.isArray(r.files) && r.files.length && r.files[0].url) photosRaw = r.files[0].url
      else if (r.photo_url) photosRaw = r.photo_url
      else if (r.photoUrl) photosRaw = r.photoUrl

      return {
        raw: r,
        id: r.id ?? r._id ?? Math.random().toString(36).slice(2, 9),
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        title: r.title || r.type || (r.description || '').slice(0, 40),
        snippet: (r.description || r.comment || '').slice(0, 120),
        status: r.status || r.state || 'Submitted',
        address: r.address || r.location || r.place || '',
        photosRaw,
        rawDate: r.date || r.created_at || r.createdAt || null,
      }
    })
  }, [reports])

  // preview markers (with coords)
  const previewMarkers = useMemo(
    () => normalizedReports.filter((r) => r.lat != null && r.lng != null).slice(0, 6),
    [normalizedReports]
  )
  const previewCoords = previewMarkers.length ? [previewMarkers[0].lat, previewMarkers[0].lng] : null

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero */}
      <section className="text-center mb-12">
  <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
    JAGRUK
  </h1>
  <p className="text-lg md:text-xl text-gray-800 mt-2">
    Janta App for Grievance Reporting &amp; User Knowledge
  </p>
  <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
    CivicReport connects citizens with local government to identify, track, and
    resolve municipal issues quickly and transparently.
  </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Link to="/report" className="btn btn-primary">
            <span className="inline-block">Report an Issue</span>
            <span aria-hidden> →</span>
          </Link>
          <Link to="/map" className="btn btn-ghost">
            Explore Map
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-10">
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold">{loading ? '…' : stats.total}</div>
          <div className="text-sm text-gray-500 mt-2">Total Reports</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-green-600">{loading ? '…' : stats.resolved}</div>
          <div className="text-sm text-gray-500 mt-2">Resolved</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-teal-600">{loading ? '…' : stats.progress}</div>
          <div className="text-sm text-gray-500 mt-2">In Progress</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-yellow-600">{loading ? '…' : stats.pending}</div>
          <div className="text-sm text-gray-500 mt-2">Pending</div>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-center">How CivicReport Works</h2>
        <p className="text-center text-gray-600 mb-6 max-w-3xl mx-auto">Our platform makes it easy for citizens to report issues and for municipal staff to track and resolve them efficiently.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded bg-gray-50 flex items-center justify-center">📝</div>
              <div>
                <div className="font-semibold">Report Issues</div>
                <p className="text-sm text-gray-600 mt-2">Easily report municipal problems like potholes, broken streetlights, and more with photo evidence and location tagging.</p>
                <div className="mt-4">
                  <Link to="/report" className="btn btn-primary text-sm">Start Reporting</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded bg-gray-50 flex items-center justify-center">🗺️</div>
              <div>
                <div className="font-semibold">Interactive Map</div>
                <p className="text-sm text-gray-600 mt-2">View all reported issues on an interactive map to see what's happening in your neighborhood and community.</p>
                <div className="mt-4">
                  <Link to="/map" className="btn btn-ghost text-sm">View Map</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded bg-gray-50 flex items-center justify-center">🛡️</div>
              <div>
                <div className="font-semibold">Admin Dashboard</div>
                <p className="text-sm text-gray-600 mt-2">Municipal staff can track, manage, and update the status of all reported issues through a comprehensive dashboard.</p>
                <div className="mt-4">
                  <Link to="/admin" className="btn btn-primary text-sm">Admin Access</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why choose */}
      <section className="mb-12">
        <div className="card p-6 bg-gray-50">
          <h3 className="text-lg font-semibold text-center mb-4">Why Choose CivicReport?</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="rounded-full w-12 h-12 mx-auto bg-white flex items-center justify-center">📱</div>
              <div className="font-semibold mt-3">Mobile-First</div>
              <div className="text-sm text-gray-600 mt-1">Report issues on-the-go with our mobile-optimized interface</div>
            </div>
            <div>
              <div className="rounded-full w-12 h-12 mx-auto bg-white flex items-center justify-center">📍</div>
              <div className="font-semibold mt-3">Location-Based</div>
              <div className="text-sm text-gray-600 mt-1">Automatic location tagging for precise issue identification</div>
            </div>
            <div>
              <div className="rounded-full w-12 h-12 mx-auto bg-white flex items-center justify-center">📊</div>
              <div className="font-semibold mt-3">Real-Time Tracking</div>
              <div className="text-sm text-gray-600 mt-1">Track the progress of your reports from submission to resolution</div>
            </div>
            <div>
              <div className="rounded-full w-12 h-12 mx-auto bg-white flex items-center justify-center">🤝</div>
              <div className="font-semibold mt-3">Community-Driven</div>
              <div className="text-sm text-gray-600 mt-1">Build stronger communities through civic engagement</div>
            </div>
          </div>
        </div>
      </section>

      {/* Map preview + Recent reports */}
      <section className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-semibold">Recent Reports Map</h4>
            <div className="text-sm text-gray-500">{loading ? 'Loading…' : `${reports?.length ?? 0} total`}</div>
          </div>

          <div style={{ minHeight: 300 }}>
            <ReportMap
              coords={previewCoords}
              zoom={previewCoords ? 10 : 3}
              style={{ height: 300, width: '100%' }}
            />
          </div>
        </div>

        <div className="card p-4">
          <h4 className="font-semibold mb-3">Recent Community Reports</h4>

          <div className="visible-reports-scroll" style={{ maxHeight: 420 }}>
            {loading && <div className="text-sm text-gray-500">Loading…</div>}
            {error && <div className="text-sm text-red-500">{error}</div>}
            {!loading && !normalizedReports.length && <div className="text-sm text-gray-500">No reports yet</div>}

            {(!loading && normalizedReports.length > 0) && (
              <ul className="space-y-3">
                {normalizedReports.slice(0, 8).map((r) => {
                  const rawPhoto = r.photosRaw // already normalized above
                  return (
                    <li key={r.id} className="report-card flex gap-3 items-start">
                      <div className="thumb w-16 h-12 bg-gray-100 rounded overflow-hidden">
                        <SafeThumb raw={rawPhoto} alt={r.title || 'report thumbnail'} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold line-clamp-2">{r.title}</div>
                          <div className={`ml-auto status ${(r.status || '').toLowerCase()}`} style={{ textTransform: 'capitalize' }}>
                            {r.status || 'Submitted'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{(r.address || r.snippet || '').slice(0,90)}</div>
                        <div className="text-xs text-gray-400 mt-2">{r.rawDate ? new Date(r.rawDate).toLocaleString() : ''}</div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="mt-12 card-strong p-8" style={{ background: '#060617', color: 'white', borderRadius: 18 }}>
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-gray-300 mb-6">Ready to Make a Difference?</h3>
          <p className="text-gray-300 mb-6">Join thousands of citizens working together to improve our communities</p>
          <Link to="/report" className="inline-block btn btn-primary">Report Your First Issue →</Link>
        </div>
      </section>
    </main>
  )
}
