import { useState, useEffect } from 'react'
import Header from './components/pagelayout/Header'
import Hero from './components/pagelayout/Hero'
import WhyEmpathAI from './components/WhyEmpathAI'
import HowItWorks from './components/HowItWorks'
import InclusivityFocus from './components/InclusivityFocus'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import LoginModal from './components/LoginModal'
import AdminPanel from './components/admin/AdminPanel'
import { getCurrentUser, logout as authLogout, isAdminRole } from './api/authApi.js'
import { clearTokens } from './api/apiClient.js'

// Backend role enums that should route to the admin panel
const ADMIN_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PSYCHOLOGIST', 'CONTENT_ADMIN']

function isAdmin(user) {
  if (!user) return false
  return ADMIN_ROLES.includes(user.role)
}

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [user, setUser] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    // Restore authenticated session from localStorage
    const savedUser = getCurrentUser()
    if (savedUser) {
      setUser(savedUser)
      setCurrentPage(isAdmin(savedUser) ? 'admin' : 'dashboard')
    }

    // Listen for session expiry events emitted by apiClient
    const handleAuthLogout = () => {
      setUser(null)
      setCurrentPage('home')
    }
    window.addEventListener('auth:logout', handleAuthLogout)

    // Scroll reveal animation
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active')
        }
      })
    }, { threshold: 0.1 })

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))

    return () => {
      observer.disconnect()
      window.removeEventListener('auth:logout', handleAuthLogout)
    }
  }, [currentPage])

  const navigateToAuth = () => {
    setShowLoginModal(true)
  }

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    setCurrentPage(isAdmin(userData) ? 'admin' : 'dashboard')
    setShowLoginModal(false)
  }

  const navigateToHome = () => {
    setCurrentPage('home')
  }

  const navigateToDashboard = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    setCurrentPage(isAdmin(userData) ? 'admin' : 'dashboard')
  }

  const handleLogout = () => {
    authLogout()         // clears tokens
    clearTokens()
    setUser(null)
    setCurrentPage('home')
  }

  if (currentPage === 'auth') {
    return <Auth onBackToHome={navigateToHome} onLoginSuccess={navigateToDashboard} />
  }

  if (currentPage === 'admin' && user) {
    return <AdminPanel user={user} onLogout={handleLogout} />
  }

  if (currentPage === 'dashboard' && user) {
    return <Dashboard user={user} onLogout={handleLogout} />
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <Header />
      <main>
        <Hero onStartJourney={navigateToAuth} />
        <div className="reveal">
          <WhyEmpathAI />
        </div>
        <div className="reveal">
          <HowItWorks />
        </div>
        <div className="reveal">
          <InclusivityFocus />
        </div>
      </main>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </div>
  )
}

export default App