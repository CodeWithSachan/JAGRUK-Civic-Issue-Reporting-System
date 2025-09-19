// src/layouts/Shell.jsx
import React from 'react'
import Header from '../components/Header'

export default function Shell({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Global Header */}
      <Header />

      {/* Main content
          pt-20 ensures the sticky header doesn't overlap content.
          If you change header height, adjust pt-20 accordingly. */}
      <main
        role="main"
        className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 pt-20"
      >
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t text-sm text-gray-500 py-4 text-center">
        © {new Date().getFullYear()} CivicReport · Municipal Issue Tracking
      </footer>
    </div>
  )
}
