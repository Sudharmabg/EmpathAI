import { Navigate, useLocation } from 'react-router-dom'
import { getCurrentUser } from '../api/authApi.js'

const ADMIN_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'PSYCHOLOGIST', 'CONTENT_ADMIN', 'TEACHER']

export default function ProtectedRoute({ children, roles = [] }) {
    const user = getCurrentUser()
    const location = useLocation()

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />
    }

    return children
}