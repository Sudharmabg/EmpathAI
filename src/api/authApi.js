import { apiPost, setTokens, clearTokens } from './apiClient.js';

/**
 * Log in with email + password.
 * Stores tokens and user info in localStorage.
 * Returns the user object: { id, name, email, role, school }
 */
export async function login(email, password) {
  const data = await apiPost('/api/auth/login', { email, password });
  // Unified logic for backend's 'token' field
  setTokens(data.token, data.refreshToken);
  if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  return data.user;
}

/**
 * Log out: wipe tokens and stored user.
 */
export function logout() {
  clearTokens();
}

/**
 * Get the currently stored user (from localStorage, not from server).
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Map backend role enum to frontend role string used in App.jsx
 */
export function mapRole(backendRole) {
  const map = {
    SUPER_ADMIN:    'super_admin',
    SCHOOL_ADMIN:   'school_admin',
    PSYCHOLOGIST:   'psychologist',
    CONTENT_ADMIN:  'content_admin',
    STUDENT:        'student'
  };
  return map[backendRole] || backendRole?.toLowerCase() || '';
}

/**
 * Check if the stored user is an admin (any non-student role).
 */
export function isAdminRole(role) {
  return ['super_admin', 'school_admin', 'psychologist', 'content_admin', 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'PSYCHOLOGIST', 'CONTENT_ADMIN'].includes(role);
}
