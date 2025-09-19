// src/components/ReportMap.jsx
import React, { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMap, Popup, ScaleControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Vite-friendly imports for the default Leaflet icon assets
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Initialize default icon once (safe even if called multiple times)
;(function initLeafletDefaultIcon() {
  try {
    if (!L.Icon.Default.prototype.options.iconUrl || L.Icon.Default.prototype.options.iconUrl === '') {
      L.Icon.Default.mergeOptions({
        iconRetinaUrl,
        iconUrl,
        shadowUrl,
      })
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('ReportMap: failed to initialize leaflet default icon', err)
  }
})()

/* -----------------------
   Utility: colored div icon
   ----------------------- */
function createStatusDivIcon(color = '#1f6feb') {
  return L.divIcon({
    className: 'civic-marker',
    html: `<div style="
      width:18px;height:18px;border-radius:10px;
      background:${color};box-shadow:0 3px 8px rgba(12,18,35,0.18);
      border: 2px solid white;
      "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  })
}

/* map controls helper (set view & invalidate) */
function SetViewAndResize({ coords, zoom = 15 }) {
  const map = useMap()
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (!coords) return
    try {
      const lat = Number(coords[0]), lng = Number(coords[1])
      if (!isFinite(lat) || !isFinite(lng)) return
      map.setView([lat, lng], zoom)
      // small delay helps when map is inside a modal or animated container
      timeoutRef.current = setTimeout(() => {
        try { map.invalidateSize() } catch (e) { /* ignore */ }
      }, 200)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('ReportMap: SetViewAndResize error', e)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [coords, map, zoom])

  return null
}

/* Fit map to bounds when given multiple markers */
function FitBoundsOnMarkers({ markers }) {
  const map = useMap()
  useEffect(() => {
    if (!markers || markers.length === 0) return
    const valid = markers
      .map((m) => {
        const lat = Number(m.lat), lng = Number(m.lng)
        return isFinite(lat) && isFinite(lng) ? [lat, lng] : null
      })
      .filter(Boolean)
    if (valid.length === 0) return
    try {
      const bounds = L.latLngBounds(valid)
      map.fitBounds(bounds.pad(0.12))
      setTimeout(() => map.invalidateSize(), 250)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('ReportMap: fitBounds error', e)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers])
  return null
}

/* Simple floating controls (Locate / Fit / Reset) */
function MapFloatingControls({ mapRef, markers }) {
  const map = useMap()

  const handleLocate = () => {
    if (!navigator.geolocation) {
      try { alert('Geolocation not supported in your browser') } catch (e) {}
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 15)
      },
      () => {
        try { alert('Unable to fetch current location') } catch (e) {}
      },
      { enableHighAccuracy: true }
    )
  }

  const handleFit = () => {
    if (!markers || markers.length === 0) return
    const valid = markers
      .map((m) => {
        const lat = Number(m.lat), lng = Number(m.lng)
        return isFinite(lat) && isFinite(lng) ? [lat, lng] : null
      })
      .filter(Boolean)
    if (valid.length === 0) return
    try {
      const bounds = L.latLngBounds(valid)
      map.fitBounds(bounds.pad(0.12))
    } catch (e) {
      // noop
    }
  }

  const handleReset = () => {
    map.setView([20, 0], 3)
  }

  return (
    <div className="map-floating-controls" style={{ position: 'absolute', right: 12, top: 12, zIndex: 1300 }}>
      <button
        type="button"
        title="Locate"
        onClick={handleLocate}
        className="map-control-btn"
        aria-label="Locate me"
      >
        📍
      </button>
      <button
        type="button"
        title="Fit"
        onClick={handleFit}
        className="map-control-btn"
        aria-label="Fit to markers"
      >
        ⤢
      </button>
      <button
        type="button"
        title="Reset"
        onClick={handleReset}
        className="map-control-btn"
        aria-label="Reset map"
      >
        ⟳
      </button>
    </div>
  )
}

/**
 * ReportMap
 *
 * Props:
 *  - coords: [lat, lng] (legacy single marker)
 *  - markers: array of { lat, lng, title, snippet, img, status }   // optional
 *  - zoom: default zoom for single marker
 *  - style: inline style object for MapContainer
 *  - onMarkerClick: (marker) => void
 */
export default function ReportMap({
  coords,
  markers = null,
  zoom = 15,
  style = { height: 360, width: '100%' },
  onMarkerClick,
}) {
  const center = useMemo(() => {
    if (coords && coords.length === 2 && isFinite(Number(coords[0])) && isFinite(Number(coords[1]))) {
      return [Number(coords[0]), Number(coords[1])]
    }
    // fallback center (India)
    return [23.6102, 85.2799]
  }, [coords])

  // derive markers list: if markers prop given use it, else fallback to coords
  const markerList = useMemo(() => {
    if (Array.isArray(markers) && markers.length > 0) return markers
    if (coords && coords.length === 2 && isFinite(Number(coords[0])) && isFinite(Number(coords[1]))) {
      return [{ lat: Number(coords[0]), lng: Number(coords[1]), title: 'Report location' }]
    }
    return []
  }, [markers, coords])

  // marker color mapping by status (fallbacks)
  const statusColor = (s) => {
    if (!s) return '#1f6feb'
    const key = String(s).toLowerCase()
    if (key.includes('resolv')) return '#059669'     // green
    if (key.includes('progress')) return '#0ea5a3'   // teal
    if (key.includes('submit') || key.includes('high')) return '#ef4444' // red
    if (key.includes('acknow')) return '#3b82f6'     // blue
    if (key.includes('quarant')) return '#f97316'   // orange
    return '#1f6feb'
  }

  const mapRef = useRef(null)

  return (
    <div className="rounded-md overflow-hidden relative border" style={{ minHeight: style.height }}>
      <MapContainer
        center={center}
        zoom={markerList.length ? zoom : 3}
        style={style}
        whenCreated={(map) => { mapRef.current = map }}
        scrollWheelZoom={false}
        attributionControl={true}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ScaleControl position="bottomleft" />
        {/* Floating controls */}
        <MapFloatingControls mapRef={mapRef} markers={markerList} />

        {/* Markers */}
        {markerList.map((m, idx) => {
          const lat = Number(m.lat)
          const lng = Number(m.lng)
          if (!isFinite(lat) || !isFinite(lng)) return null
          const color = statusColor(m.status)
          const icon = createStatusDivIcon(color)
          return (
            <Marker
              key={`${lat}-${lng}-${idx}`}
              position={[lat, lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  onMarkerClick?.(m)
                },
              }}
            >
              <Popup>
                <div style={{ maxWidth: 240 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{m.title || m.type || 'Reported issue'}</div>
                  {m.img && (
                    <img src={m.img} alt={m.title || 'photo'} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />
                  )}
                  <div style={{ fontSize: 13, color: '#374151' }}>{m.snippet || m.description || ''}</div>
                  {m.status && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                      <strong>Status: </strong>{m.status}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Fit bounds automatically when many markers */}
        {markerList.length > 1 && <FitBoundsOnMarkers markers={markerList} />}

        {/* Support legacy set-view when single coords change */}
        {coords && <SetViewAndResize coords={coords} zoom={zoom} />}
      </MapContainer>
    </div>
  )
}
