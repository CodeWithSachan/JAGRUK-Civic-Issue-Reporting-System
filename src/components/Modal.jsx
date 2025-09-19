// src/components/Modal.jsx
import React, { useEffect } from 'react'

/**
 * Modal
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - title: string | node (optional)
 *  - children: node
 *  - size: 'sm' | 'md' | 'lg' | 'xl' (optional, default 'md')
 *
 * Accessibility:
 *  - traps background scroll while open
 *  - closes on ESC
 *  - clicking backdrop triggers onClose
 */

const SIZE_TO_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
}

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return

    // prevent background scroll while modal is open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'Modal dialog'}
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* modal panel */}
      <div className={`relative w-full ${SIZE_TO_CLASS[size] || SIZE_TO_CLASS.md} mx-auto z-10`}>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border">
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b">
            <div className="flex-1">
              {title ? (
                typeof title === 'string' ? (
                  <h2 className="text-lg font-semibold">{title}</h2>
                ) : (
                  <div>{title}</div>
                )
              ) : null}
            </div>

            <div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="inline-flex items-center justify-center rounded hover:bg-gray-100 p-2 text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
