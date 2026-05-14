import { apiPost, apiGet, setTokens, clearTokens } from './apiClient.js';

/**
 * Log in with email + password.
 * Stores tokens and user info in localStorage.
 * Returns the user object: { id, name, email, role, school }
 */
export async function login(email, password) {
  const data = await apiPost('/api/auth/login', { email, password });
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
    SUPER_ADMIN: 'super_admin',
    SCHOOL_ADMIN: 'school_admin',
    PSYCHOLOGIST: 'psychologist',
    CONTENT_ADMIN: 'content_admin',
    STUDENT: 'student'
  };
  return map[backendRole] || backendRole?.toLowerCase() || '';
}

/**
 * Check if the stored user is an admin (any non-student role).
 */
export function isAdminRole(role) {
  return [
    'super_admin', 'school_admin', 'psychologist', 'content_admin',
    'SUPER_ADMIN', 'SCHOOL_ADMIN', 'PSYCHOLOGIST', 'CONTENT_ADMIN'
  ].includes(role);
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD SETUP (Email invite flow — MFA)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the one-time token from the email invite link.
 * Called on mount of /set-password page before showing the form.
 *
 * GET /api/auth/validate-token?token=xxx
 * Returns: { valid: true, name: "John", email: "john@school.com" }
 * Throws if token is invalid, expired, or already used.
 */
export async function validateSetupToken(token) {
  return await apiGet(`/api/auth/validate-token?token=${token}`);
}

/**
 * Submit the student's new password using their setup token.
 * Called on form submit from /set-password page.
 *
 * POST /api/auth/set-password
 * Body: { token, password, confirmPassword }
 * Returns: { message: "Password set successfully. You can now log in." }
 * Throws if passwords don't match, token invalid, or password too weak.
 */
export async function setStudentPassword(token, password, confirmPassword) {
  return await apiPost('/api/auth/set-password', { token, password, confirmPassword });
}
