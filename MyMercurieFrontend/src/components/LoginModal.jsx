import { useState } from 'react'
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { login } from '../api/authApi.js'
import ReactGA from 'react-ga4'

export default function LoginModal({ isOpen, onClose, onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  // ── Helper: Detect Browser Name ──────────────────────
  const getBrowserName = () => {
    const ua = navigator.userAgent
    if (ua.includes('Edg'))                              return 'Microsoft Edge'
    if (ua.includes('OPR') || ua.includes('Opera'))     return 'Opera'
    if (ua.includes('Chrome') && !ua.includes('Edg'))   return 'Chrome'
    if (ua.includes('Firefox'))                          return 'Firefox'
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
    if (ua.includes('MSIE') || ua.includes('Trident'))  return 'Internet Explorer'
    return 'Unknown Browser'
  }

  // ── Helper: Detect Browser Version ───────────────────
  const getBrowserVersion = () => {
    const ua = navigator.userAgent
    let match =
      ua.match(/Edg\/([\d.]+)/)      ||
      ua.match(/OPR\/([\d.]+)/)      ||
      ua.match(/Chrome\/([\d.]+)/)   ||
      ua.match(/Firefox\/([\d.]+)/)  ||
      ua.match(/Version\/([\d.]+).*Safari/)
    return match ? match[1] : 'Unknown Version'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)

      const computedAge = (() => {
        if (user.age != null) return user.age
        if (user.dateOfBirth) {
          try {
            const dob   = new Date(user.dateOfBirth)
            const today = new Date()
            let age     = today.getFullYear() - dob.getFullYear()
            const m     = today.getMonth() - dob.getMonth()
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
            return age > 0 ? age : null
          } catch { return null }
        }
        return null
      })()

      const normalized = {
        id:          user.id,
        name:        user.name,
        firstName:   user.name?.split(' ')[0] || user.name,
        lastName:    user.name?.split(' ').slice(1).join(' ') || '',
        email:       user.email,
        role:        user.role,
        school:      user.school      || null,
        className:   user.className   || null,
        section:     user.section     || null,
        rollNo:      user.rollNo      || null,
        schoolId:    user.schoolId    || null,
        gender:      user.gender      ?? null,
        age:         computedAge,
        dateOfBirth: user.dateOfBirth ?? null,
        parentName:  user.parentName  ?? null,
      }

      onLogin(normalized)

      // ── Save login timestamp for duration tracking ──
      localStorage.setItem('login_timestamp', Date.now())

      // ── GA4: Track login time (your teammate's code) ──
      const now = new Date()
      ReactGA.event('user_login_time', {
        login_hour:        now.getHours(),
        login_minute:      now.getMinutes(),
        login_time_string: now.toLocaleTimeString('en-IN', {
          hour:   '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        login_date: now.toLocaleDateString('en-IN'),
        user_role:  normalized.role
      })

      // ── GA4: Track browser info (YOUR task) ──────────
      ReactGA.event('user_browser_info', {
        browser_name:    getBrowserName(),
        browser_version: getBrowserVersion(),
        user_agent:      navigator.userAgent,
        platform:        navigator.platform,
        user_role:       normalized.role,
        user_email:      normalized.email
      })

      onClose()
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-primary/20 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md relative overflow-hidden border border-white">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -z-0"></div>

        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-primary transition-colors z-10 p-2 hover:bg-gray-50 rounded-full"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <div className="text-center mb-10 relative z-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20 rotate-3">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-lora font-bold text-dark-navy mb-2 tracking-tight">Welcome Back</h2>
          <p className="text-gray-500 font-medium">Continue your emotional journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">Account Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
              placeholder="name@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">Secure Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all font-medium text-gray-700 placeholder:text-gray-300"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-bold py-3 px-4 rounded-xl text-center border border-red-100 animate-fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary !rounded-2xl !py-4 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : (
              <>
                Start Access
                <SparklesIcon className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 p-5 bg-gray-50 rounded-2xl border border-gray-100 relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 text-center">Default Admin</p>
          <div className="bg-white p-3 rounded-xl border border-gray-100 text-xs text-center">
            <p className="font-bold text-primary">admin@mymercurie.com</p>
            <p className="text-gray-500 font-medium mt-1">MyMercurie@2025!</p>
            <p className="text-[10px] text-gray-400 mt-1">Change this password after first login</p>
          </div>
        </div>
      </div>
    </div>
  )
}