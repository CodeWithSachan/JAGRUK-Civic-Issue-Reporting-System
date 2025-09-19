// src/components/LocationIQAutocomplete.jsx
import React, { useEffect, useRef, useState } from 'react'

const TOKEN = import.meta.env.VITE_LOCATIONIQ_KEY
const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300

export default function LocationIQAutocomplete({
  onSelect,
  placeholder = 'Search address...',
  disabled = false,
}) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [highlight, setHighlight] = useState(-1)

  const timerRef = useRef(null)
  const abortRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  /* ---------------- Cleanup ---------------- */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (abortRef.current) {
        try { abortRef.current.abort() } catch (e) {}
      }
    }
  }, [])

  // close suggestions when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target)) {
        setItems([])
        setHighlight(-1)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  // handle disabled state cleanup
  useEffect(() => {
    if (disabled) {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (abortRef.current) {
        try { abortRef.current.abort() } catch (e) {}
      }
      setItems([])
      setLoading(false)
    }
  }, [disabled])

  /* ---------------- Fetch logic ---------------- */
  async function fetchSuggestions(text) {
    if (disabled) return

    if (abortRef.current) {
      try { abortRef.current.abort() } catch (e) {}
      abortRef.current = null
    }

    if (!TOKEN) {
      setError('Missing LocationIQ API key.')
      setItems([])
      setLoading(false)
      return
    }

    if (!text || text.length < MIN_QUERY_LENGTH) {
      setItems([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    const url = `https://us1.locationiq.com/v1/autocomplete.php?key=${encodeURIComponent(
      TOKEN
    )}&q=${encodeURIComponent(text)}&limit=6&format=json`

    try {
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} ${txt}`)
      }
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
      setHighlight(-1)
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('LocationIQ autocomplete error', err)
        setError('Could not load suggestions')
        setItems([])
      }
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  function scheduleFetch(text) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(text), DEBOUNCE_MS)
  }

  function onChange(e) {
    const v = String(e.target.value || '')
    setQ(v)
    setError(null)
    if (v.length >= MIN_QUERY_LENGTH) scheduleFetch(v)
    else {
      if (timerRef.current) clearTimeout(timerRef.current)
      setItems([])
    }
  }

  /* ---------------- Lat/Lng parser ---------------- */
  function parseLatLng(it) {
    if (!it) return [null, null]
    const latCandidates = [it.lat, it.latitude, it.location_lat]
    const lonCandidates = [it.lon, it.longitude, it.lng, it.location_lng]

    for (let i = 0; i < Math.max(latCandidates.length, lonCandidates.length); i++) {
      const la = Number(latCandidates[i])
      const lo = Number(lonCandidates[i])
      if (isFinite(la) && isFinite(lo)) return [la, lo]
    }

    if (it.center) {
      const la = Number(it.center.lat)
      const lo = Number(it.center.lon)
      if (isFinite(la) && isFinite(lo)) return [la, lo]
    }

    return [null, null]
  }

  function doSelect(it) {
    if (!it) return
    const [lat, lon] = parseLatLng(it)
    const address = it.display_name || it.name || ''
    onSelect?.({ address, lat, lng: lon, raw: it })
    setQ(address)
    setItems([])
    setHighlight(-1)
  }

  /* ---------------- Keyboard UX ---------------- */
  function onKeyDown(e) {
    if (items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(items.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(-1, h - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlight >= 0 && highlight < items.length) {
        doSelect(items[highlight])
      } else if (items.length > 0) {
        doSelect(items[0]) // default to first item
      }
    } else if (e.key === 'Escape') {
      setItems([])
      setHighlight(-1)
    }
  }

  // keep highlight visible
  useEffect(() => {
    if (highlight < 0) return
    const container = listRef.current
    const itemEl = container?.querySelector(`[data-idx="${highlight}"]`)
    if (itemEl && container) {
      itemEl.scrollIntoView({ block: 'nearest' })
    }
  }, [highlight])

  /* ---------------- Render ---------------- */
  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input with clear button */}
      <div className="flex items-center relative">
        <input
          ref={inputRef}
          value={q}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-controls="loc-suggestions"
          aria-expanded={items.length > 0}
          aria-activedescendant={highlight >= 0 ? `loc-item-${highlight}` : undefined}
          className="w-full px-3 py-2 rounded-lg border bg-gray-50 focus:ring-2 focus:ring-blue-400"
          disabled={disabled}
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              setItems([])
              setHighlight(-1)
            }}
            className="absolute right-2 text-gray-400 hover:text-gray-600"
            aria-label="Clear input"
          >
            ✕
          </button>
        )}
      </div>

      {/* Suggestions */}
      {items.length > 0 && (
        <div
          id="loc-suggestions"
          ref={listRef}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-60 overflow-auto"
        >
          {items.map((it, idx) => {
            const key = it.place_id ?? it.osm_id ?? idx
            const isActive = idx === highlight

            // Build nicer display: main name + smaller address
            const primary = it.address?.road || it.name || it.display_name?.split(',')[0]
            const secondary = [
              it.address?.city,
              it.address?.state,
              it.address?.postcode,
              it.address?.country,
            ]
              .filter(Boolean)
              .join(', ')

            return (
              <div
                key={key}
                id={`loc-item-${idx}`}
                data-idx={idx}
                role="option"
                aria-selected={isActive}
                onClick={() => doSelect(it)}
                onMouseEnter={() => setHighlight(idx)}
                className={`p-2 cursor-pointer text-sm ${
                  isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{primary}</div>
                {secondary && <div className="text-xs text-gray-500">{secondary}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Status / helper text */}
      <div className="mt-1 text-xs text-gray-500 h-4" role="status" aria-live="polite">
        {loading
          ? 'Loading suggestions…'
          : error
          ? <span className="text-red-600">{error}</span>
          : q.length > 0 && q.length < MIN_QUERY_LENGTH
          ? `Type ${MIN_QUERY_LENGTH}+ characters`
          : null}
      </div>
    </div>
  )
}
