import React, { useEffect, useState } from 'react'

export default function AutoFillToast({ message, onClose, duration = 5000 }) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const interval = 50
    const step = 100 / (duration / interval)

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(timer)
          onClose()
          return 0
        }
        return prev - step
      })
    }, interval)

    return () => clearInterval(timer)
  }, [duration, onClose])

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 20,
      background: '#111827',
      color: '#fff',
      padding: '14px 16px',
      borderRadius: 12,
      width: 300,
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      zIndex: 9999
    }}>
      {/* Close button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13 }}>{message}</span>
        <button
          onClick={onClose}
          style={{
            marginLeft: 10,
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 16
          }}
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        marginTop: 10,
        height: 4,
        background: '#374151',
        borderRadius: 4,
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: '#22c55e',
          transition: 'width 0.05s linear'
        }} />
      </div>
    </div>
  )
}
