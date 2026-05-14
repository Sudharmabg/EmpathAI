import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'

import Header from './components/pagelayout/Header'
import Hero from './components/pagelayout/Hero'
import WhyEmpathAI from './components/WhyEmpathAI'
import HowItWorks from './components/HowItWorks'
import InclusivityFocus from './components/InclusivityFocus'
import Dashboard from './components/Dashboard'
import LoginModal from './components/LoginModal'
import AdminPanel from './components/admin/AdminPanel'
import Auth from './components/Auth'
import SetPassword from './components/SetPassword'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

import { getCurrentUser, logout as authLogout } from './api/authApi.js'
import { clearTokens } from './api/apiClient.js'
import useTimeTracker from './api/useTimeTracker'

const ADMIN_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PSYCHOLOGIST', 'CONTENT_ADMIN', 'TEACHER']

function isAdmin(user) {
  if (!user) return false
  return ADMIN_ROLES.includes(user.role)
}

// ─── Home page (landing) ──────────────────────────────────────────────────────
function HomePage({ user, onLogin, onLogout }) {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('active')
      })
    }, { threshold: 0.1 })
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const handleLogin = (userData) => {
    onLogin(userData)
    setShowLoginModal(false)
    navigate(isAdmin(userData) ? '/admin' : '/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <Header />
      <main>
        <Hero onStartJourney={() => setShowLoginModal(true)} />
        <div className="reveal"><WhyEmpathAI /></div>
        <div className="reveal"><HowItWorks /></div>
        <div className="reveal"><InclusivityFocus /></div>
      </main>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </div>
  )
}

// ─── App shell ────────────────────────────────────────────────────────────────
function AppShell() {
  const [user, setUser] = useState(() => getCurrentUser())
  const navigate = useNavigate()

  // ── Single time tracking instance for the entire app ──────────────────────
  const studentId = user && !isAdmin(user) ? user.id : null
  useTimeTracker(studentId)

  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null)
      navigate('/')
    }
    window.addEventListener('auth:logout', handleAuthLogout)
    return () => window.removeEventListener('auth:logout', handleAuthLogout)
  }, [navigate])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = async () => {
    authLogout()
    clearTokens()
    setUser(null)
    navigate('/')
  }

  return (
    <Routes>
      {/* Landing page — redirect to dashboard/admin if already logged in */}
      <Route
        path="/"
        element={
          user
            ? <Navigate to={isAdmin(user) ? '/admin' : '/dashboard'} replace />
            : <HomePage user={user} onLogin={handleLogin} onLogout={handleLogout} />
        }
      />

      {/* Auth page */}
      <Route
        path="/auth"
        element={
          <Auth
            onBackToHome={() => navigate('/')}
            onLoginSuccess={(u) => {
              handleLogin(u)
              navigate(isAdmin(u) ? '/admin' : '/dashboard')
            }}
          />
        }
      />

      {/* Student dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ErrorBoundary>
              <Dashboard user={user} onLogout={handleLogout} />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />

      {/* Admin panel */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={ADMIN_ROLES}>
            <ErrorBoundary>
              <AdminPanel user={user} onLogout={handleLogout} />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />

      {/* Set password (public) */}
      <Route path="/set-password" element={<SetPassword />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}