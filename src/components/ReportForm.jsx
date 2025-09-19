// src/components/ReportForm.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react'
import LocationIQAutocomplete from './LocationIQAutocomplete'
import { useLanguage } from '../context/LanguageContext'

// react-leaflet (ensure react-leaflet & leaflet are installed)
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

// small helpers
function generateCaptcha() {
  return Math.floor(1000 + Math.random() * 9000)
}
const MAX_IMAGE_COUNT = 5
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB per image

// Reverse geocoding toggle (set to false to disable)
const ENABLE_REVERSE_GEOCODING = true

// Default map center (Jharkhand-ish)
const DEFAULT_CENTER = [23.6102, 85.2799]
const DEFAULT_ZOOM = 12

// (If you need to ensure icons are loaded in some environments,
// you may import icon assets in ReportMap.jsx — no require() here.)

/**
 * Debounce hook for callbacks
 */
function useDebouncedCallback(fn, delay = 600) {
  const timer = useRef(null)
  return useCallback(
    (...args) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => fn(...args), delay)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delay]
  )
}

/* ---------------- MapPicker (auto-fly + marker) ---------------- */

/**
 * MapPicker props:
 *  - lat, lng: current coordinates (numbers | null)
 *  - onChange({ lat, lng }) -> called when user moves marker / clicks
 *  - centerOverride: optional [lat,lng] to which the map will fly
 */
function MapPicker({ lat, lng, onChange, centerOverride }) {
  const [pos, setPos] = useState(lat != null && lng != null ? [lat, lng] : null)
  const markerRef = useRef(null)

  // sync local pos with props when they change externally
  useEffect(() => {
    if (lat != null && lng != null) {
      setPos([Number(lat), Number(lng)])
    }
  }, [lat, lng])

  // map click handler to place marker
  function ClickHandler() {
    useMapEvents({
      click(e) {
        const { lat: a, lng: b } = e.latlng
        setPos([a, b])
        onChange?.({ lat: a, lng: b })
      },
    })
    return null
  }

  // child that reads the map instance and flies to centerOverride when it changes
  function FlyToCenter({ target }) {
    const map = useMap()
    const lastRef = useRef(null)

    useEffect(() => {
      if (!target || !Array.isArray(target) || target.length !== 2) return
      const [tlat, tlng] = [Number(target[0]), Number(target[1])]
      if (!isFinite(tlat) || !isFinite(tlng)) return

      const key = `${tlat.toFixed(6)}:${tlng.toFixed(6)}`
      if (lastRef.current === key) return
      lastRef.current = key

      try {
        map.flyTo([tlat, tlng], 15, { duration: 1.0 })
        // after a short delay open the marker popup (if marker present)
        setTimeout(() => {
          if (markerRef.current && markerRef.current.openPopup) {
            try { markerRef.current.openPopup() } catch (e) {}
          }
        }, 600)
      } catch (e) {
        // fallback
        try { map.setView([tlat, tlng], 15) } catch (e2) {}
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, map])

    return null
  }

  const initialCenter = centerOverride || pos || DEFAULT_CENTER

  return (
    <div className="mt-3 h-64 md:h-80 rounded-lg overflow-hidden border relative">
      <MapContainer center={initialCenter} zoom={pos ? 15 : 5} className="h-full w-full">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickHandler />

        {pos && (
          <Marker
            position={pos}
            draggable
            ref={markerRef}
            eventHandlers={{
              dragend(e) {
                const { lat: a, lng: b } = e.target.getLatLng()
                setPos([a, b])
                onChange?.({ lat: a, lng: b })
              },
            }}
          >
            <Popup>
              <div className="text-sm">
                {`Position: ${Number(pos[0]).toFixed(6)}, ${Number(pos[1]).toFixed(6)}`}
                <div className="text-xs text-gray-500 mt-1">Drag to adjust precise location</div>
              </div>
            </Popup>
          </Marker>
        )}

        <FlyToCenter target={centerOverride} />
      </MapContainer>
    </div>
  )
}

/* -------------------- Main ReportForm -------------------- */

export default function ReportForm({ onAddReport }) {
  const { t } = useLanguage()

  // captcha + UI state
  const [captcha, setCaptcha] = useState(generateCaptcha())
  const [statusMsg, setStatusMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // image handling
  const [images, setImages] = useState([]) // { file, url }
  const imageInputRef = useRef(null)

  // voice recording
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [recordingState, setRecordingState] = useState('idle') // idle | recording | recorded
  const [voiceBlob, setVoiceBlob] = useState(null)
  const audioRef = useRef(null)
  const recordedChunksRef = useRef([])

  // form fields
  const [formData, setFormData] = useState({
    contact: '',
    name: '',
    complaintType: '',
    location: '',
    address: '',
    comment: '',
    email: '',
    captchaInput: '',
    lat: null,
    lng: null,
  })

  // center used to control MapPicker flying
  const [mapCenter, setMapCenter] = useState(null)

  // cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((i) => URL.revokeObjectURL(i.url))
      if (voiceBlob) URL.revokeObjectURL(voiceBlob.url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setField = (k, v) => {
    setFormData((s) => ({ ...s, [k]: v }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setField(name, value)
  }

  /* ---------------- Location helpers ---------------- */

  // reverse geocode (optional)
  const reverseGeocode = useCallback(async (latitude, longitude) => {
    if (!ENABLE_REVERSE_GEOCODING) return
    if (latitude == null || longitude == null) return
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse')
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('lat', String(latitude))
      url.searchParams.set('lon', String(longitude))
      url.searchParams.set('zoom', '18')
      // url.searchParams.set('email', 'your-email@example.com')

      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
      if (!res.ok) return
      const data = await res.json()
      const display = data?.display_name
      const address = display || data?.address?.road || data?.address?.village || data?.address?.city || ''
      if (display) {
        setFormData((s) => ({
          ...s,
          location: display,
          address: s.address ? s.address : address || s.address,
        }))
        setStatusMsg(t('locationResolved', 'Location resolved from coordinates'))
      }
    } catch (err) {
      console.warn('reverseGeocode error', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const debouncedReverse = useDebouncedCallback((lat, lng) => {
    reverseGeocode(lat, lng)
  }, 700)

  // Called by LocationIQAutocomplete when user picks a place
  // expected: { address, lat, lng }
  const onPlaceSelected = ({ address, lat, lng }) => {
    setFormData((s) => ({
      ...s,
      location: address || s.location,
      address: s.address ? s.address : address || s.address,
      lat: lat ?? s.lat,
      lng: lng ?? s.lng,
    }))
    setStatusMsg(t('locationSelected', 'Location selected'))

    if (lat != null && lng != null) {
      setMapCenter([Number(lat), Number(lng)])
    }
  }

  // Try to capture coords with browser geolocation
  const captureLocation = () => {
    if (!navigator.geolocation) {
      setStatusMsg(t('geolocationNotSupported', 'Geolocation not supported in this browser.'))
      return
    }
    setStatusMsg(t('requestingLocation', 'Requesting device location — allow permission if prompted.'))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setFormData((s) => ({
          ...s,
          location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          lat,
          lng,
        }))
        setMapCenter([lat, lng])
        setStatusMsg(t('locationCaptured', 'Device location captured.'))
      },
      (err) => {
        console.warn('geolocation error', err)
        setStatusMsg(t('unableGetLocation', 'Unable to get device location.'))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ensures lat/lng are present (tries once automatically)
  const ensureLocation = () =>
    new Promise((resolve) => {
      if (formData.lat != null && formData.lng != null) return resolve(true)
      if (!navigator.geolocation) return resolve(false)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setFormData((s) => ({
            ...s,
            location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            lat,
            lng,
          }))
          setMapCenter([lat, lng])
          setStatusMsg(t('locationCaptured', 'Device location captured'))
          resolve(true)
        },
        () => resolve(false),
        { enableHighAccuracy: true, timeout: 8000 }
      )
    })

  // Called when marker is moved or map clicked
  const handleMapPositionChange = ({ lat, lng }) => {
    setFormData((s) => ({ ...s, lat: Number(lat), lng: Number(lng) }))
    setMapCenter([Number(lat), Number(lng)])
    if (ENABLE_REVERSE_GEOCODING) debouncedReverse(Number(lat), Number(lng))
  }

  /* ---------------- Image upload (multi) ---------------- */

  function handleFilesSelected(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (images.length + files.length > MAX_IMAGE_COUNT) {
      setStatusMsg(t('maxImagesMsg', `You can upload up to ${MAX_IMAGE_COUNT} images.`))
      return
    }

    const toAdd = []
    for (const f of files) {
      if (f.size > MAX_IMAGE_BYTES) {
        setStatusMsg(t('fileTooLarge', `File ${f.name} is too large (max 5 MB).`))
        continue
      }
      const url = URL.createObjectURL(f)
      toAdd.push({ file: f, url })
    }
    if (toAdd.length > 0) {
      setImages((s) => [...s, ...toAdd])
      setStatusMsg(t('imagesAdded', `${toAdd.length} image(s) added.`))
    }
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  function removeImageAt(index) {
    setImages((prev) => {
      const next = [...prev]
      const removed = next.splice(index, 1)[0]
      if (removed && removed.url) URL.revokeObjectURL(removed.url)
      return next
    })
  }

  /* ---------------- Voice recorder ---------------- */

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatusMsg(t('audioNotSupported', 'Audio recording not supported in this browser.'))
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const opts = {}
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : undefined
      if (mime) opts.mimeType = mime

      const mr = new MediaRecorder(stream, opts)
      recordedChunksRef.current = []
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) recordedChunksRef.current.push(ev.data)
      }
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recordedChunksRef.current[0]?.type || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setVoiceBlob((prev) => {
          if (prev) URL.revokeObjectURL(prev.url)
          return { blob, url }
        })
        setRecordingState('recorded')
        try {
          stream.getTracks().forEach((t) => t.stop())
        } catch (e) {}
      }
      mr.start()
      setMediaRecorder(mr)
      setRecordingState('recording')
      setStatusMsg(t('recording', 'Recording… stop when finished.'))
    } catch (err) {
      console.error('startRecording error', err)
      setStatusMsg(t('recordingError', 'Unable to start recording (permission denied or error).'))
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      try {
        mediaRecorder.stop()
      } catch (e) {
        console.warn('stopRecording', e)
      }
    }
  }

  const removeVoiceNote = () => {
    if (voiceBlob) {
      try {
        URL.revokeObjectURL(voiceBlob.url)
      } catch (e) {}
      setVoiceBlob(null)
      setRecordingState('idle')
      setStatusMsg(t('voiceRemoved', 'Voice note removed'))
    }
  }

  /* ---------------- Submission ---------------- */

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    // required fields
    if (!formData.contact || !formData.name || !formData.complaintType || !formData.comment) {
      setStatusMsg(t('fillRequired', 'Please fill required fields: Contact, Name, Complaint type, Comment.'))
      return
    }

    if (String(formData.captchaInput).trim() !== String(captcha)) {
      setStatusMsg(t('invalidCaptcha', 'Invalid captcha. Enter the number shown.'))
      return
    }

    setStatusMsg(t('preparingSubmission', 'Preparing submission…'))
    // try to ensure coords are present (non-blocking)
    await ensureLocation()

    // Build FormData preserving your original field names for backend compatibility
    const fd = new FormData()

    // attach multiple images using same key 'photo'
    for (const f of images) {
      fd.append('photo', f.file)
    }

    // voice note (optional)
    if (voiceBlob && voiceBlob.blob) {
      fd.append('voice_note', voiceBlob.blob, 'voice_note.webm')
    }

    // core fields
    fd.append('contact', formData.contact)
    fd.append('name', formData.name)
    fd.append('type', formData.complaintType)
    fd.append('description', formData.comment)

    // optional fields
    fd.append('address', formData.address || '')
    fd.append('email', formData.email || '')

    // human-readable location fields
    fd.append('location_text', formData.location || '')
    fd.append('location', formData.location || '')

    // coordinates (if available)
    if (formData.lat != null && formData.lng != null) {
      fd.append('lat', String(formData.lat))
      fd.append('lng', String(formData.lng))
      fd.append('location_lat', String(formData.lat))
      fd.append('location_lng', String(formData.lng))
    }

    setSubmitting(true)
    setStatusMsg(t('submitting', 'Submitting report…'))

    try {
      const res = await fetch('/api/reports', { method: 'POST', body: fd })
      if (res.ok) {
        let serverReport = null
        try {
          serverReport = await res.json()
        } catch (err) {
          serverReport = null
        }

        setStatusMsg(t('submittedThanks', 'Report submitted — thank you!'))
        const reportToAdd =
          serverReport && (serverReport.id || serverReport.title)
            ? serverReport
            : {
                title: formData.complaintType || (formData.comment || '').slice(0, 30),
                coords:
                  formData.lat != null && formData.lng != null
                    ? `${Number(formData.lat).toFixed(6)}, ${Number(formData.lng).toFixed(6)}`
                    : formData.location || '',
                status: 'submitted',
                date: new Date().toLocaleString(),
              }

        onAddReport?.(reportToAdd)

        // reset local state
        setFormData({
          contact: '',
          name: '',
          complaintType: '',
          location: '',
          comment: '',
          email: '',
          address: '',
          captchaInput: '',
          lat: null,
          lng: null,
        })
        // revoke preview urls
        images.forEach((i) => URL.revokeObjectURL(i.url))
        setImages([])
        if (voiceBlob) {
          try {
            URL.revokeObjectURL(voiceBlob.url)
          } catch (e) {}
          setVoiceBlob(null)
          setRecordingState('idle')
        }
        setCaptcha(generateCaptcha())
      } else {
        const ttxt = await res.text().catch(() => '')
        console.error('server submit failed', res.status, ttxt)
        setStatusMsg(t('serverError', 'Submission failed — server error. Please try again later.'))
      }
    } catch (err) {
      console.error('network error', err)
      setStatusMsg(t('networkError', 'Network error — check your connection.'))
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------------- Render ---------------- */

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-live="polite">
      {/* Contact & Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">{t('contactNo', 'Contact No.')} *</span>
          <input
            name="contact"
            value={formData.contact}
            onChange={handleInputChange}
            required
            placeholder={t('contactPlaceholder', 'Enter Contact Number')}
            inputMode="tel"
            pattern="[\d\s+-]{6,20}"
            title={t('phoneTitle', 'Enter a valid phone number')}
            disabled={submitting}
            className="mt-1 w-full px-3 py-2 rounded-lg border bg-gray-50"
            aria-label={t('contactNo', 'Contact No.')}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">{t('complainantName', 'Complainant Name')} *</span>
          <input
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            placeholder={t('namePlaceholder', 'Enter Complainant Name')}
            disabled={submitting}
            className="mt-1 w-full px-3 py-2 rounded-lg border bg-gray-50"
            aria-label={t('complainantName', 'Complainant Name')}
          />
        </label>
      </div>

      {/* Category */}
      <label className="block">
        <span className="text-sm font-medium text-gray-700">{t('complaintRelated', 'Complaint (Related to)')} *</span>
        <select
          name="complaintType"
          value={formData.complaintType}
          onChange={handleInputChange}
          required
          disabled={submitting}
          className="mt-1 w-full px-3 py-2 rounded-lg border bg-gray-50"
          aria-label={t('complaintRelated', 'Complaint (Related to)')}
        >
          <option value="">{t('selectPlaceholder', '-- Select --')}</option>
          <option value="pothole">{t('pothole', 'Pothole')}</option>
          <option value="streetlight">{t('streetlight', 'Streetlight')}</option>
          <option value="trash">{t('trash', 'Trash')}</option>
          <option value="graffiti">{t('graffiti', 'Graffiti')}</option>
          <option value="water_leakage">{t('waterLeakage', 'Water leakage')}</option>
          <option value="other">{t('other', 'Other')}</option>
        </select>
      </label>

      {/* Location autocomplete + capture */}
      <label className="block">
        <span className="text-sm font-medium text-gray-700">{t('complaintLocation', 'Complaint Location')} *</span>
        <div className="flex gap-2 mt-1">
          <div className="flex-1 autocomplete-wrapper">
            <LocationIQAutocomplete onSelect={onPlaceSelected} disabled={submitting} />
          </div>

          <button
            type="button"
            onClick={captureLocation}
            disabled={submitting}
            aria-label={t('captureLocation', 'Capture current location')}
            className="px-3 py-2 border rounded-lg bg-white"
            title={t('useDeviceLocation', 'Use device location')}
          >
            📍
          </button>
        </div>

        {/* editable fields for chosen location + address */}
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder={t('selectedPlace', 'Selected place (you can edit)')}
            disabled={submitting}
            className="mt-1 w-full px-3 py-2 rounded-lg border bg-white text-sm"
            aria-label={t('selectedPlace', 'Selected place')}
          />
          <input
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder={t('addressOptional', 'Address (optional)')}
            disabled={submitting}
            className="mt-1 w-full px-3 py-2 rounded-lg border bg-white text-sm"
            aria-label={t('addressOptional', 'Address (optional)')}
          />
        </div>

        {/* Map picker (click to place, drag to adjust) */}
        <MapPicker
          lat={formData.lat}
          lng={formData.lng}
          onChange={handleMapPositionChange}
          centerOverride={mapCenter}
        />

        {formData.lat != null && formData.lng != null && (
          <div className="text-xs text-gray-500 mt-2" aria-hidden>
            {t('latLabel', 'Lat')}: {Number(formData.lat).toFixed(6)}, {t('lngLabel', 'Lng')}: {Number(formData.lng).toFixed(6)}
          </div>
        )}
      </label>

      {/* Comment */}
      <label className="block">
        <span className="text-sm font-medium text-gray-700">{t('complaintComment', 'Complaint / Comment')} *</span>
        <textarea
          name="comment"
          value={formData.comment}
          onChange={handleInputChange}
          maxLength={1000}
          required
          placeholder={t('commentPlaceholder', 'Enter Complaint Details')}
          disabled={submitting}
          className="mt-1 w-full h-36 px-3 py-2 rounded-lg border bg-gray-50"
          aria-label={t('complaintComment', 'Complaint / Comment')}
        />
        <div className="text-xs text-gray-500 text-right" aria-hidden>
          {1000 - (formData.comment?.length || 0)} {t('charsRemaining', 'characters remaining')}.
        </div>
      </label>

      {/* Email & optional address */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">{t('emailOptional', 'Email (Optional)')}</span>
          <input
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder={t('emailPlaceholder', 'Enter Email ID')}
            type="email"
            disabled={submitting}
            className="mt-1 w-full px-3 py-2 rounded-lg border bg-gray-50"
            aria-label={t('emailOptional', 'Email (Optional)')}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">{t('addressOptional', 'Address (Optional)')}</span>
          <input
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder={t('addressPlaceholder', 'Enter Address')}
            disabled={submitting}
            className="mt-1 w-full px-3 py-2 rounded-lg border bg-gray-50"
            aria-label={t('addressOptional', 'Address (Optional)')}
          />
        </label>
      </div>

      {/* Multi-image upload */}
      <label className="block">
        <span className="text-sm font-medium text-gray-700">{t('imageIfAny', 'Images (optional)')}</span>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
          disabled={submitting}
          className="mt-2 w-full border-dashed border-2 border-gray-200 p-4 rounded-lg"
          aria-label={t('uploadImages', 'Upload images')}
        />
        <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-3">
          {images.map((it, idx) => (
            <div key={it.url} className="relative border rounded p-1 bg-white">
              <img src={it.url} alt={`preview-${idx}`} className="h-20 w-full object-cover rounded" />
              <button
                type="button"
                onClick={() => removeImageAt(idx)}
                className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-xs border shadow"
                aria-label={t('removeImage', 'Remove image')}
                title={t('removeImage', 'Remove image')}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          {t('imageGuidance', `Up to ${MAX_IMAGE_COUNT} images. Max 5 MB each.`)}
        </div>
      </label>

      {/* Voice note recorder */}
      <div className="block">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700">{t('voiceNote', 'Voice note (optional)')}</span>
            <div className="text-xs text-gray-500">{t('voiceNoteHelper', 'Record a short description (useful for non-typed reports)')}</div>
          </div>

          <div className="flex items-center gap-2">
            {recordingState === 'idle' && (
              <button
                type="button"
                onClick={startRecording}
                disabled={submitting}
                className="px-3 py-2 rounded border bg-white text-sm"
                aria-label={t('startRecording', 'Start recording voice note')}
              >
                🎤 {t('record', 'Record')}
              </button>
            )}
            {recordingState === 'recording' && (
              <button
                type="button"
                onClick={stopRecording}
                disabled={submitting}
                className="px-3 py-2 rounded border bg-red-50 text-sm text-red-700"
                aria-label={t('stopRecording', 'Stop recording')}
              >
                ⏹ {t('stop', 'Stop')}
              </button>
            )}
            {recordingState === 'recorded' && (
              <>
                <audio ref={audioRef} src={voiceBlob?.url} controls className="mr-2" />
                <button
                  type="button"
                  onClick={removeVoiceNote}
                  disabled={submitting}
                  className="px-3 py-2 rounded border bg-white text-sm text-red-600"
                  aria-label={t('removeVoice', 'Remove voice note')}
                >
                  ✕ {t('remove', 'Remove')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Captcha + submit */}
      <div className="grid grid-cols-3 gap-4 items-end">
        <label className="col-span-2 block">
          <span className="text-sm font-medium text-gray-700">{t('captcha', 'Captcha')} *</span>
          <input
            name="captchaInput"
            value={formData.captchaInput}
            onChange={(e) => setField('captchaInput', e.target.value)}
            required
            placeholder={t('captchaPlaceholder', 'Enter Captcha Here')}
            disabled={submitting}
            className="mt-1 w-full px-3 py-2 rounded-lg border bg-gray-50"
            aria-label={t('captcha', 'Captcha')}
          />
        </label>

        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold select-all" aria-hidden>
            {captcha}
          </div>
          <button
            type="button"
            onClick={() => {
              setCaptcha(generateCaptcha())
              setStatusMsg('')
            }}
            className="px-2 py-1 border rounded-lg"
            disabled={submitting}
            aria-label={t('regenCaptcha', 'Regenerate captcha')}
          >
            ↻
          </button>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full md:w-auto bg-blue-500 text-white py-3 rounded-lg disabled:opacity-60 px-8"
          aria-label={t('submit', 'Submit')}
        >
          {submitting ? t('submitting', 'Submitting…') : t('submit', 'Submit')}
        </button>
        {statusMsg && (
          <div className="mt-3 text-sm text-gray-600" role="status" aria-live="polite">
            {statusMsg}
          </div>
        )}
      </div>
    </form>
  )
}
