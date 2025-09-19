// src/components/ReportCard.jsx
import React, { useState } from "react"

/* ---------- Shared status metadata ---------- */
const STATUS_TO_COLOR = {
  high_priority: "#ef4444",
  submitted: "#f59e0b",
  acknowledged: "#60a5fa",
  in_progress: "#3b82f6",
  resolved: "#10b981",
  quarantined: "#ef4444",
}

function statusLabelFromKey(key) {
  if (!key) return "Unknown"
  const k = String(key).toLowerCase()
  switch (k) {
    case "high_priority":
      return "High Priority"
    case "submitted":
      return "Submitted"
    case "acknowledged":
      return "Acknowledged"
    case "in_progress":
      return "In Progress"
    case "resolved":
      return "Resolved"
    case "quarantined":
      return "Quarantined"
    default:
      return k.replace(/_/g, " ")
  }
}

/* ---------- Badge ---------- */
export function StatusBadge({ status = "" }) {
  const s = String(status || "").toLowerCase()
  const color = STATUS_TO_COLOR[s] ?? "#e5e7eb"
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

/* ---------- Helper: build image URL ---------- */
function buildImageSrc(src) {
  if (!src) return null
  if (/^https?:\/\//i.test(src)) return src
  if (typeof window === "undefined") return src
  return src.startsWith("/")
    ? `${window.location.origin}${src}`
    : `${window.location.origin}/${src}`
}

/* ---------- Report Card ---------- */
export default function ReportCard({
  r,
  onChangeStatus,
  onView,
  onQuarantine,
  onRestore,
  onPurge,
  busy,
}) {
  const src = r.photo_url || r.photo || r.photoUrl || r.file_url || null
  const imageSrc = buildImageSrc(src)
  const [imgVisible, setImgVisible] = useState(Boolean(imageSrc))
  const quarantined = Boolean(r.quarantined)

  return (
    <div
      className={`bg-white rounded-lg p-4 border flex md:items-start gap-4 ${
        quarantined ? "opacity-70" : ""
      }`}
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-50 border flex items-center justify-center">
        {quarantined ? (
          <div className="text-xs text-orange-600 px-2 text-center">
            Report quarantined
          </div>
        ) : imageSrc && imgVisible ? (
          <img
            src={imageSrc}
            alt={r.type ? `${r.type} thumbnail` : "report thumbnail"}
            className="object-cover w-full h-full"
            onError={(e) => {
              e.currentTarget.style.display = "none"
              setImgVisible(false)
            }}
            onLoad={() => setImgVisible(true)}
          />
        ) : (
          <div className="text-xs text-gray-400 px-2 text-center">No image</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center justify-between gap-4">
          <div>
            {/* Category + Status */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {(r.type || "").replace(/_/g, " ") || "Issue"}
              </span>
              <StatusBadge status={r.status} />
              {quarantined && (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded ml-2">
                  Quarantined
                </span>
              )}
            </div>

            {/* Title / Description */}
            <div className="font-medium text-lg">
              {r.title || r.description || "No title"}
            </div>

            {/* Address + Date */}
            <div className="text-sm text-gray-500 mt-2">
              {r.address || r.location_text || "—"}{" "}
              <span className="mx-2">•</span>
              {r.created_at
                ? new Date(r.created_at).toLocaleString()
                : ""}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-3">
            {/* Status change dropdown */}
            <select
              value={r.status || "submitted"}
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

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => onView(r)}
                className="px-3 py-2 rounded border bg-white text-sm"
                disabled={busy}
              >
                👁 View
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
                    🗑️ Delete
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
