import { Navigate, useLocation } from 'react-router-dom'
import { getCurrentUser } from '../api/authApi.js'

// ProtectedRoute is unchanged in behaviour.
// getCurrentUser() reads the user profile from localStorage (no tokens there).
// The actual JWT lives in the HttpOnly cookie managed by the browser — invisible to JS.

export default function ProtectedRoute({ children, roles = [] }) {
  const user     = getCurrentUser()
  const location = useLocation()

  // No user profile in localStorage → not authenticated → redirect to home
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  // Role check (unchanged)
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}