import { apiPost, apiGet, clearTokens } from './apiClient.js';

/**
 * Log in with email + password.
 *
 * The backend now sets the JWT as an HttpOnly cookie — it is NOT in the
 * response body anymore. We only store the safe user-profile object in
 * localStorage (no secrets there).
 *
 * Returns the user object: { id, name, email, role, school, ... }
 */
export async function login(email, password) {
  // credentials:'include' is set automatically by apiClient so the cookie is received
  const data = await apiPost('/api/auth/login', { email, password });

  // Store only the user profile (no token) for getCurrentUser() reads
  if (data.user) localStorage.setItem('user', JSON.stringify(data.user));

  return data.user;
}

/**
 * Log out: tell the backend to clear the HttpOnly cookie, then wipe
 * the local user profile.
 */
export async function logout() {
  try {
    // Backend sets Max-Age=0 on the jwt cookie, effectively deleting it
    await apiPost('/api/auth/logout', {});
  } catch {
    // Even if the network call fails, clear the local state
  } finally {
    clearTokens(); // removes localStorage 'user' key
  }
}

/**
 * Get the currently stored user profile (from localStorage, not from server).
 * The JWT itself is in the HttpOnly cookie and is never readable here.
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
 * Map backend role enum → frontend role string used in App.jsx
 */
export function mapRole(backendRole) {
  const map = {
    SUPER_ADMIN:   'super_admin',
    SCHOOL_ADMIN:  'school_admin',
    PSYCHOLOGIST:  'psychologist',
    CONTENT_ADMIN: 'content_admin',
    STUDENT:       'student',
  };
  return map[backendRole] || backendRole?.toLowerCase() || '';
}

/**
 * Check if the stored user is an admin (any non-student role).
 */
export function isAdminRole(role) {
  return [
    'super_admin', 'school_admin', 'psychologist', 'content_admin',
    'SUPER_ADMIN',  'SCHOOL_ADMIN',  'PSYCHOLOGIST',  'CONTENT_ADMIN',
  ].includes(role);
}

// ── Password setup (Email invite flow) ───────────────────────────────────────

/**
 * Validate the one-time token from the email invite link.
 * GET /api/auth/validate-token?token=xxx
 */
export async function validateSetupToken(token) {
  return await apiGet(`/api/auth/validate-token?token=${token}`);
}

/**
 * Submit the student's new password using their setup token.
 * POST /api/auth/set-password
 */
export async function setStudentPassword(token, password, confirmPassword) {
  return await apiPost('/api/auth/set-password', { token, password, confirmPassword });
}