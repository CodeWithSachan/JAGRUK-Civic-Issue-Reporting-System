// src/utils/api.js

/* ---------------- Base URL helpers ---------------- */
export const API_BASE =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.VITE_API_BASE
    ? String(import.meta.env.VITE_API_BASE).replace(/\/$/, "")
    : ""

export function apiUrl(path = "") {
  if (!path) return API_BASE || ""
  const p = path.startsWith("/") ? path : `/${path}`
  return API_BASE ? `${API_BASE}${p}` : p
}

/**
 * absolutePhotoUrl(photoPathOrObj)
 *
 * Accepts:
 *  - full http(s) URLs (returns unchanged)
 *  - data: URIs (returns unchanged)
 *  - relative string paths like "uploads/x.jpg" or "/uploads/x.jpg"
 *  - objects like { url: '/uploads/x.jpg' } or { filename: 'x.jpg' }
 *  - nested objects (tries to extract common keys)
 *
 * Returns a string URL or null when no usable value found.
 */
export function absolutePhotoUrl(photoPathOrObj) {
  if (!photoPathOrObj) return null

  // If it's a string, handle directly
  if (typeof photoPathOrObj === "string") {
    const s = photoPathOrObj.trim()
    if (!s) return null
    // absolute http/https
    if (/^https?:\/\//i.test(s)) return s
    // data URI
    if (/^data:/i.test(s)) return s
    // normalize relative path
    const p = s.startsWith("/") ? s : `/${s}`
    return API_BASE ? `${API_BASE}${p}` : p
  }

  // If it's an array, try first usable element
  if (Array.isArray(photoPathOrObj) && photoPathOrObj.length) {
    for (const it of photoPathOrObj) {
      const u = absolutePhotoUrl(it)
      if (u) return u
    }
  }

  // If it's an object, try common properties
  if (typeof photoPathOrObj === "object") {
    const obj = photoPathOrObj

    // direct common keys
    const directKeys = [
      "url",
      "src",
      "path",
      "file",
      "location",
      "source",
      "thumb",
      "thumbnail",
      "image",
      "imageUrl",
      "photoUrl",
      "photo_url",
      "fileName",
      "filename",
    ]

    for (const k of directKeys) {
      try {
        const val = obj[k]
        if (!val) continue
        const maybe = absolutePhotoUrl(val)
        if (maybe) return maybe
      } catch (e) {
        // ignore property access errors
      }
    }

    // some backends return nested objects like { file: { url: '/x' } }
    for (const k of Object.keys(obj)) {
      const val = obj[k]
      if (val && typeof val === "object") {
        const nested = absolutePhotoUrl(val)
        if (nested) return nested
      }
    }

    // fallback: filename + conventional /uploads location
    const filename = obj.filename || obj.fileName || obj.name || obj.key
    if (filename && typeof filename === "string") {
      const n = filename.trim()
      if (n) {
        const p = n.startsWith("/") ? n : `/uploads/${n.replace(/^\/+/, "")}`
        return API_BASE ? `${API_BASE}${p}` : p
      }
    }
  }

  // nothing usable found
  return null
}

/* ---------------- Token helpers ---------------- */
export function getAdminToken() {
  try {
    return localStorage.getItem("admin_token")
  } catch {
    return null
  }
}

export function setAdminToken(token) {
  try {
    localStorage.setItem("admin_token", token)
  } catch {
    /* ignore */
  }
}

export function clearAdminToken() {
  try {
    localStorage.removeItem("admin_token")
  } catch {
    /* ignore */
  }
}

/* ---------------- Utilities ---------------- */
function isPlainObject(val) {
  return Object.prototype.toString.call(val) === "[object Object]"
}

/* ---------------- Auth Fetch ---------------- */
/**
 * authFetch(input, init)
 * - Handles token, JSON body, FormData, error logging
 * - Clears token if server returns 401 Unauthorized
 */
export async function authFetch(input, init = {}) {
  const token = getAdminToken()

  // build URL if relative
  const url =
    typeof input === "string" && !/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(input)
      ? apiUrl(input)
      : input

  const headers = new Headers(init.headers || {})

  // Body handling
  let body = init.body
  const hasContentType = headers.has("Content-Type")

  if (body != null) {
    if (isPlainObject(body)) {
      if (!hasContentType) headers.set("Content-Type", "application/json")
      body = JSON.stringify(body)
    } else {
      const isFormData =
        (typeof FormData !== "undefined" && body instanceof FormData) ||
        (typeof URLSearchParams !== "undefined" &&
          body instanceof URLSearchParams)
      if (!isFormData && !hasContentType && typeof body === "string") {
        // leave as-is
      }
    }
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const isDev =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    Boolean(import.meta.env.DEV)

  if (isDev) {
    try {
      console.debug("[authFetch ➡️]", {
        url,
        method: init.method || "GET",
        headers: Object.fromEntries(headers.entries()),
        tokenPresent: !!token,
      })
    } catch {}
  }

  const fetchInit = {
    ...init,
    headers,
    body,
    mode: init.mode ?? (isDev && API_BASE ? "cors" : undefined),
  }

  try {
    const res = await fetch(url, fetchInit)

    if (isDev) {
      try {
        console.debug("[authFetch ⬅️]", res.status, res.statusText)
      } catch {}
    }

    if (res.status === 401) {
      clearAdminToken()
    }

    return res
  } catch (err) {
    if (isDev) {
      console.error("[authFetch] fetch error", err)
    }
    throw err
  }
}

/* ---------------- Convenience ---------------- */
/**
 * fetchJson - wrapper that returns parsed JSON or throws
 */
export async function fetchJson(input, init = {}) {
  const res = await authFetch(input, init)
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`API ${res.status}: ${txt}`)
  }
  try {
    return await res.json()
  } catch {
    return null
  }
}

/* ---------------- Higher-level helpers ---------------- */

/**
 * submitReportForm(formData)
 * - Convenience wrapper to POST FormData to /api/reports
 * - Returns the fetch Response (caller may parse JSON)
 */
export async function submitReportForm(formData) {
  if (!(formData instanceof FormData)) {
    throw new TypeError("submitReportForm expects a FormData instance")
  }
  // POST to relative path; apiUrl will prefix API_BASE if set
  const res = await authFetch("/api/reports", {
    method: "POST",
    body: formData,
  })
  return res
}

/**
 * fetchReports()
 * - fetches all reports from GET /api/reports
 * - Returns parsed JSON or throws
 */
export async function fetchReports() {
  return await fetchJson("/api/reports")
}

/**
 * reverseGeocode(lat, lng)
 * - Client-side reverse geocoding using Nominatim (OpenStreetMap)
 * - Returns { displayName, address } or null on error
 *
 * Notes:
 * - Nominatim is free but rate-limited and requires identifying your app.
 *   For production, use a paid geocoding provider or proxy via your server.
 */
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null
  try {
    const u = new URL("https://nominatim.openstreetmap.org/reverse")
    u.searchParams.set("format", "jsonv2")
    u.searchParams.set("lat", String(lat))
    u.searchParams.set("lon", String(lng))
    u.searchParams.set("zoom", "18")
    // Optionally set your contact email per Nominatim policy:
    // u.searchParams.set("email", "your-email@example.com")

    const res = await fetch(u.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null
    const json = await res.json().catch(() => null)
    if (!json) return null

    const displayName = json.display_name || null
    const address = json.address || null
    return { displayName, address }
  } catch (err) {
    // don't throw — caller can continue without reverse geocode
    // but log in dev
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
      console.warn("reverseGeocode error", err)
    }
    return null
  }
}

/* ---------------- Exports (already exported above) ---------------- */
export default {
  API_BASE,
  apiUrl,
  absolutePhotoUrl,
  getAdminToken,
  setAdminToken,
  clearAdminToken,
  authFetch,
  fetchJson,
  submitReportForm,
  fetchReports,
  reverseGeocode,
}
