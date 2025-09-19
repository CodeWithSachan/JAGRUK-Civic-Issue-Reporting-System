// // src/App.jsx
// import React from 'react'
// import { Routes, Route } from 'react-router-dom'
// import Shell from './layouts/Shell'

// // Pages
// import Home from './pages/Home'
// import ReportPage from './pages/ReportPage'
// import MapView from './pages/MapView'
// import MapTest from './pages/MapTest'
// import AdminDashboard from './pages/AdminDashboard'
// import AdminLogin from './pages/AdminLogin'

// export default function App() {
//   return (
//     <Shell>
//       <Routes>
//         {/* Home (single canonical homepage) */}
//         <Route index element={<Home />} />
//         <Route path="/" element={<Home />} />

//         {/* Separate reporting page */}
//         <Route path="/report" element={<ReportPage />} />

//         {/* Map views */}
//         <Route path="/map" element={<MapView />} />
//         <Route path="/maptest" element={<MapTest />} />

//         {/* Admin pages */}
//         <Route path="/admin" element={<AdminDashboard />} />
//         <Route path="/admin-login" element={<AdminLogin />} />

//         {/* Fallback */}
//         <Route
//           path="*"
//           element={
//             <div className="text-center text-gray-500 mt-20">
//               <h2 className="text-2xl font-semibold mb-2">404 — Page Not Found</h2>
//               <p>Sorry, the page you’re looking for doesn’t exist.</p>
//             </div>
//           }
//         />
//       </Routes>
//     </Shell>
//   )
// }
// src/App.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Shell from './layouts/Shell'

// Pages
import Home from './pages/Home'
import ReportPage from './pages/ReportPage'
import MapView from './pages/MapView'
import MapTest from './pages/MapTest'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'

export default function App() {
  return (
    <Shell>
      <Routes>
        {/* Single canonical homepage */}
        <Route path="/" element={<Home />} />

        {/* Reporting page */}
        <Route path="/report" element={<ReportPage />} />

        {/* Map views */}
        <Route path="/map" element={<MapView />} />
        <Route path="/maptest" element={<MapTest />} />

        {/* Admin pages */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Fallback */}
        <Route
          path="*"
          element={
            <div className="text-center text-gray-500 mt-20">
              <h2 className="text-2xl font-semibold mb-2">404 — Page Not Found</h2>
              <p>Sorry, the page you’re looking for doesn’t exist.</p>
            </div>
          }
        />
      </Routes>
    </Shell>
  )
}
