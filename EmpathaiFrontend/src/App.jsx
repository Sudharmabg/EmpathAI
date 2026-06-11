import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'

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
import NotFound from './components/NotFound'
import ErrorBoundary from './components/ErrorBoundary'

import { getCurrentUser, logout as authLogout } from './api/authApi.js'
import { clearTokens } from './api/apiClient.js'

import ReactGA from 'react-ga4'

const ADMIN_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PSYCHOLOGIST', 'CONTENT_ADMIN', 'TEACHER']

// ── All valid student tabs ─────────────────────────────────────────────────────
const VALID_TABS = ['overview', 'chatbuddy', 'schedule', 'questionnaire', 'curriculum', 'activities']

function isAdmin(user) {
  if (!user) return false
  return ADMIN_ROLES.includes(user.role)
}

// ── Guard: renders Dashboard only for known tabs, 404 for everything else ──────
function StudentRoute({ user, onLogout }) {
  const { tab } = useParams()
  if (!VALID_TABS.includes(tab)) return <NotFound />
  return (
    <ProtectedRoute>
      <ErrorBoundary>
        <Dashboard user={user} onLogout={onLogout} />
      </ErrorBoundary>
    </ProtectedRoute>
  )
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
    navigate(isAdmin(userData) ? '/admin' : '/student/overview')
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

  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null)
      navigate('/')
    }
    window.addEventListener('auth:logout', handleAuthLogout)
    return () => window.removeEventListener('auth:logout', handleAuthLogout)
  }, [navigate])

  const handleLogin = (userData) => setUser(userData)

const handleLogout = async () => {
    // ── GA4: Track session duration in minutes ────
    const loginTime = localStorage.getItem('login_timestamp')
    if (loginTime) {
      const durationMs      = Date.now() - parseInt(loginTime)
      const durationMinutes = Math.round(durationMs / 60000)
      const durationSeconds = Math.round(durationMs / 1000)

      ReactGA.event('session_duration', {
        duration_minutes: durationMinutes,
        duration_seconds: durationSeconds,
        user_role: user?.role || 'unknown'
      })
      localStorage.removeItem('login_timestamp')
    }
    // ─────────────────────────────────────────────
    authLogout()
    clearTokens()
    setUser(null)
    navigate('/')
  }

  return (
    <Routes>
      {/* Landing */}
      <Route
        path="/"
        element={
          user
            ? <Navigate to={isAdmin(user) ? '/admin' : '/student/overview'} replace />
            : <HomePage user={user} onLogin={handleLogin} onLogout={handleLogout} />
        }
      />

      {/* Auth */}
      <Route
        path="/auth"
        element={
          <Auth
            onBackToHome={() => navigate('/')}
            onLoginSuccess={(u) => {
              handleLogin(u)
              navigate(isAdmin(u) ? '/admin' : '/student/overview')
            }}
          />
        }
      />

      {/* Student dashboard — invalid :tab shows 404 inside StudentRoute */}
      <Route
        path="/student/:tab"
        element={<StudentRoute user={user} onLogout={handleLogout} />}
      />

      {/* Old /dashboard bookmark redirect */}
      <Route path="/dashboard" element={<Navigate to="/student/overview" replace />} />

      {/* Admin panel — note the /* for nested routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute roles={ADMIN_ROLES}>
            <ErrorBoundary>
              <AdminPanel user={user} onLogout={handleLogout} />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />

      {/* Set password */}
      <Route path="/set-password" element={<SetPassword />} />

      {/* Catch-all — completely unknown paths */}
      <Route path="*" element={<NotFound />} />
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