import { useState, useEffect } from 'react'

// ─── API calls (inline, no authApi dependency — this page is fully public) ───

const API_BASE = 'http://localhost:8081'

async function validateToken(token) {
    const res = await fetch(`${API_BASE}/api/auth/validate-token?token=${token}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Invalid or expired link')
    return data
}

async function submitSetPassword(token, password, confirmPassword) {
    const res = await fetch(`${API_BASE}/api/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Failed to set password')
    return data
}

// ─── Password strength checker ────────────────────────────────────────────────

function getStrength(password) {
    if (!password) return { score: 0, label: '', color: '' }
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-400' }
    if (score === 2) return { score, label: 'Fair', color: 'bg-yellow-400' }
    if (score === 3) return { score, label: 'Good', color: 'bg-blue-400' }
    return { score, label: 'Strong', color: 'bg-green-500' }
}

// ─── Eye icon (show/hide password) ───────────────────────────────────────────

function EyeIcon({ open }) {
    return open ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
           -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
           a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
           M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29
           M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
           a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SetPassword() {
    // Read token from URL: /set-password?token=xxx
    const token = new URLSearchParams(window.location.search).get('token')

    // Page states: 'loading' | 'form' | 'success' | 'error'
    const [pageState, setPageState] = useState('loading')
    const [studentName, setStudentName] = useState('')
    const [studentEmail, setStudentEmail] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState('')

    const strength = getStrength(password)

    // ── On mount: validate the token before showing the form ──
    useEffect(() => {
        if (!token) {
            setErrorMessage('No setup link found. Please check your email and try again.')
            setPageState('error')
            return
        }

        validateToken(token)
            .then(data => {
                setStudentName(data.name || '')
                setStudentEmail(data.email || '')
                setPageState('form')
            })
            .catch(err => {
                setErrorMessage(err.message)
                setPageState('error')
            })
    }, [token])

    // ── Form submit ──
    const handleSubmit = async () => {
        setFormError('')

        if (!password) return setFormError('Please enter a password.')
        if (password.length < 8) return setFormError('Password must be at least 8 characters.')
        if (password !== confirmPassword) return setFormError('Passwords do not match.')
        if (strength.score < 2) return setFormError('Please choose a stronger password.')

        setSubmitting(true)
        try {
            await submitSetPassword(token, password, confirmPassword)
            setPageState('success')
        } catch (err) {
            setFormError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    // ── LOADING ──
    if (pageState === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">Verifying your link…</p>
                </div>
            </div>
        )
    }

    // ── ERROR (invalid / expired / already used token) ──
    if (pageState === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4
                   c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Link Invalid or Expired</h2>
                    <p className="text-gray-500 text-sm mb-6">{errorMessage}</p>
                    <p className="text-xs text-gray-400">
                        Please contact your school admin to resend the invitation email.
                    </p>
                </div>
            </div>
        )
    }

    // ── SUCCESS ──
    if (pageState === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Set!</h2>
                    <p className="text-gray-500 text-sm mb-6">
                        Your password has been saved successfully. You can now log in to the EmpathAI student portal.
                    </p>
                    <button
                        onClick={() => {
                            localStorage.clear()   // wipe any saved admin session
                            window.location.href = '/'
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold
             py-3 px-6 rounded-xl transition-colors duration-200"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        )
    }

    // ── FORM ──
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6
                   a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Set Your Password</h1>
                    {studentName && (
                        <p className="text-gray-500 text-sm mt-1">
                            Welcome, <span className="font-semibold text-purple-700">{studentName}</span>!
                        </p>
                    )}
                    {studentEmail && (
                        <p className="text-xs text-gray-400 mt-1">{studentEmail}</p>
                    )}
                </div>

                <div className="space-y-5">

                    {/* Password field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-11 text-sm
                           focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <EyeIcon open={showPassword} />
                            </button>
                        </div>

                        {/* Strength bar */}
                        {password && (
                            <div className="mt-2">
                                <div className="flex gap-1 mb-1">
                                    {[1, 2, 3, 4].map(i => (
                                        <div
                                            key={i}
                                            className={`h-1.5 flex-1 rounded-full transition-all duration-300
                        ${i <= strength.score ? strength.color : 'bg-gray-200'}`}
                                        />
                                    ))}
                                </div>
                                <p className={`text-xs font-medium
                  ${strength.score <= 1 ? 'text-red-500' :
                                        strength.score === 2 ? 'text-yellow-500' :
                                            strength.score === 3 ? 'text-blue-500' : 'text-green-600'}`}>
                                    {strength.label}
                                </p>
                            </div>
                        )}

                        <p className="text-xs text-gray-400 mt-1">
                            At least 8 characters. Mix uppercase, numbers, and symbols for a stronger password.
                        </p>
                    </div>

                    {/* Confirm Password field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter your password"
                                className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm
                            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                            ${confirmPassword && password !== confirmPassword
                                        ? 'border-red-400 bg-red-50'
                                        : confirmPassword && password === confirmPassword
                                            ? 'border-green-400 bg-green-50'
                                            : 'border-gray-300'}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <EyeIcon open={showConfirm} />
                            </button>
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                        )}
                        {confirmPassword && password === confirmPassword && (
                            <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
                        )}
                    </div>

                    {/* Form-level error */}
                    {formError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414
                     L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0
                     001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-red-700">{formError}</p>
                        </div>
                    )}

                    {/* Submit button */}
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed
                       text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200
                       flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                Setting Password…
                            </>
                        ) : (
                            'Set My Password'
                        )}
                    </button>
                </div>

                <p className="text-center text-xs text-gray-400 mt-6">
                    EmpathAI — Student Wellness Platform
                </p>
            </div>
        </div>
    )
}
