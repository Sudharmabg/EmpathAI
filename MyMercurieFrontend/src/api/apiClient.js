/**
 * Central API client — Cookie-based auth edition.
 *
 * Changes from the localStorage version:
 *  - No more getAccessToken / setTokens / clearTokens storing JWTs in localStorage.
 *  - Every fetch includes `credentials: 'include'` so the browser automatically
 *    sends the HttpOnly JWT cookie the backend set on login.
 *  - The X-XSRF-TOKEN header is read from the XSRF-TOKEN cookie (set by Spring's
 *    CookieCsrfTokenRepository) and forwarded on every mutating request.
 *  - On 401 the user is redirected to home; there is no client-side refresh flow
 *    because the browser manages the cookie lifecycle.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// ── CSRF helper ───────────────────────────────────────────────────────────────
// Spring sets a readable cookie called XSRF-TOKEN.
// We must echo its value in the X-XSRF-TOKEN header on every non-GET request.
function getCsrfToken() {
  const match = document.cookie.match(/(^|;)\s*XSRF-TOKEN\s*=\s*([^;]+)/);
  return match ? decodeURIComponent(match[2].trim()) : null;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
export async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isFormData = options.body instanceof FormData;

  // Build headers — no Authorization header needed; the cookie is sent automatically
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  // Attach CSRF token on every state-changing request
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-XSRF-TOKEN'] = csrf;
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',   // ← this makes the browser send & receive cookies
    });
  } catch (networkErr) {
    throw new Error(
      'Cannot reach the server. Make sure the backend is running:\n' +
      '  cd MyMercurieBackend && mvn spring-boot:run'
    );
  }

  // ── CSRF Auto-Retry ──────────────────────────────────────────────────────────
  // If a mutating request fails with 403, the backend likely rejected an old/missing CSRF token
  // but it also attached a new XSRF-TOKEN cookie to the 403 response.
  if (response.status === 403 && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const newCsrf = getCsrfToken();
    if (newCsrf && newCsrf !== headers['X-XSRF-TOKEN']) {
      // Retry exactly once with the new token
      headers['X-XSRF-TOKEN'] = newCsrf;
      try {
        response = await fetch(`${BASE_URL}${path}`, {
          ...options,
          headers,
          credentials: 'include',
        });
      } catch (networkErr) {
        // Let it fall through
      }
    }
  }

  // Vite proxy returns 503 when the backend is down
  if (response.status === 503) {
    throw new Error(
      'Backend server is not running. Start it with:\n' +
      '  cd MyMercurieBackend && mvn spring-boot:run'
    );
  }

  // 401 means the cookie is missing or expired — send user back to login
  if (response.status === 401 && path !== '/api/auth/login') {
    window.dispatchEvent(new CustomEvent('auth:logout'));
    throw new Error('Session expired. Please log in again.');
  }

  return response;
}

// ── Convenience wrappers (same API surface as before) ─────────────────────────
export async function apiGet(path) {
  const res = await apiRequest(path, { method: 'GET' });
  if (!res.ok) await throwApiError(res);
  return res.json();
}

export async function apiPost(path, body) {
  const isFormData = body instanceof FormData;
  const res = await apiRequest(path, { method: 'POST', body: isFormData ? body : JSON.stringify(body) });
  if (!res.ok) await throwApiError(res);
  return res.json();
}

export async function apiPut(path, body) {
  const isFormData = body instanceof FormData;
  const res = await apiRequest(path, { method: 'PUT', body: isFormData ? body : JSON.stringify(body) });
  if (!res.ok) await throwApiError(res);
  return res.json();
}

export async function apiDelete(path) {
  const res = await apiRequest(path, { method: 'DELETE' });
  if (!res.ok) await throwApiError(res);
  return res.json().catch(() => null);
}

// ── Error helper ──────────────────────────────────────────────────────────────
async function throwApiError(res) {
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    message = body.message || body.error || message;
    if (body.fieldErrors) {
      const fields = Object.entries(body.fieldErrors)
        .map(([f, m]) => `${f}: ${m}`)
        .join(', ');
      message = `Validation failed — ${fields}`;
    }
  } catch { /* non-JSON error body */ }
  throw new Error(message);
}

// ── Kept for backward compatibility — these are now no-ops ───────────────────
// Nothing is stored in localStorage anymore; these exist so any file that
// still imports them does not crash until it is updated.
export function getAccessToken()              { return null; }
export function setTokens()                   { /* no-op */ }
export function clearTokens()                 {
  // Only the user profile key needs clearing; tokens live in the HttpOnly cookie
  localStorage.removeItem('user');
}