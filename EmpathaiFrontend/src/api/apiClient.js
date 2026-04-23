/**
 * Central API client.
 * Automatically injects the JWT Bearer token and handles 401 errors.
 * BASE_URL is empty so all /api calls go through Vite's proxy (port 3000 → 8081).
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// ── Token helpers ─────────────────────────────────────────────────────────────
export function getAccessToken() {
  return localStorage.getItem('access_token');
}

export function setTokens(accessToken, refreshToken) {
  localStorage.setItem('access_token', accessToken);
  if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeToRefresh(cb) {
  refreshSubscribers.push(cb);
}

function notifySubscribers(newToken) {
  refreshSubscribers.forEach(cb => cb(newToken));
  refreshSubscribers = [];
}

async function attemptRefresh() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  return data.accessToken;
}

export async function apiRequest(path, options = {}) {
  const token = getAccessToken();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (networkErr) {
    // fetch() itself threw — the backend is unreachable (ECONNREFUSED).
    // The Vite proxy converts this to a 503 JSON response, but if for any
    // reason it doesn't, we catch the raw network error here too.
    throw new Error(
      'Cannot reach the server. Make sure the backend is running:\n' +
      '  cd EmpathaiBackend-main && mvn spring-boot:run'
    );
  }

  // Vite proxy returns 503 with a JSON body when the backend is down
  if (response.status === 503) {
    throw new Error(
      'Backend server is not running. Start it with:\n' +
      '  cd EmpathaiBackend-main && mvn spring-boot:run'
    );
  }

  if (response.status === 401 && path !== '/api/auth/login') {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await attemptRefresh();
        notifySubscribers(newToken);
      } catch {
        clearTokens();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        throw new Error('Session expired. Please log in again.');
      } finally {
        isRefreshing = false;
      }
    }

    return new Promise((resolve, reject) => {
      subscribeToRefresh(async (newToken) => {
        try {
          const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
          const retryRes = await fetch(`${BASE_URL}${path}`, { ...options, headers: retryHeaders });
          resolve(retryRes);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  return response;
}

export async function apiGet(path) {
  const res = await apiRequest(path);
  if (!res.ok) await throwApiError(res);
  return res.json();
}

export async function apiPost(path, body) {
  const res = await apiRequest(path, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) await throwApiError(res);
  return res.json();
}

export async function apiPut(path, body) {
  const res = await apiRequest(path, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.ok) await throwApiError(res);
  return res.json();
}

export async function apiDelete(path) {
  const res = await apiRequest(path, { method: 'DELETE' });
  if (!res.ok) await throwApiError(res);
  return res.json().catch(() => null);
}

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