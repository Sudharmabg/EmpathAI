// ============================================================
//  Assessmentmanagement.js  –  centralised API helper
//  All requests automatically include the JWT stored in
//  localStorage under "access_token" or "token".
// ============================================================

const BASE = 'http://localhost:8080/api'

/* ── Auth helper ──────────────────────────────────────────── */
function getAuthHeaders () {
  const token =
    localStorage.getItem('access_token') ||
    localStorage.getItem('token') ||
    ''
    console.log('Token being sent:', token)
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

async function handleResponse (res) {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP error: ${res.status} – ${text}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

/* ── Groups ───────────────────────────────────────────────── */
export async function fetchGroups () {
  const res = await fetch(`${BASE}/groups`, { headers: getAuthHeaders() })
  return handleResponse(res)
}

/** Fetch groups that belong to a specific class (for student portal) */
export async function fetchGroupsByClass (className) {
  const res = await fetch(
    `${BASE}/groups/class/${encodeURIComponent(className)}`,
    { headers: getAuthHeaders() }
  )
  return handleResponse(res)
}

export async function createGroup (data) {
  const res = await fetch(`${BASE}/groups`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  })
  return handleResponse(res)
}

export async function deleteGroup (id) {
  const res = await fetch(`${BASE}/groups/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  return handleResponse(res)
}

/* ── Questions ────────────────────────────────────────────── */
export async function fetchQuestions (page = 0, size = 50) {
  const res = await fetch(
    `${BASE}/questions?page=${page}&size=${size}`,
    { headers: getAuthHeaders() }
  )
  return handleResponse(res)
}

/**
 * Fetch questions for a student by their className.
 * The backend finds all groups whose className matches,
 * then returns questions whose groupMap contains any of those group names.
 */
export async function fetchQuestionsByClass (className) {
  const res = await fetch(
    `${BASE}/questions/class/${encodeURIComponent(className)}`,
    { headers: getAuthHeaders() }
  )
  return handleResponse(res)
}

export async function createQuestion (data) {
  const res = await fetch(`${BASE}/questions`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  })
  return handleResponse(res)
}

export async function updateQuestion (id, data) {
  const res = await fetch(`${BASE}/questions/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  })
  return handleResponse(res)
}

export async function deleteQuestion (id) {
  const res = await fetch(`${BASE}/questions/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  return handleResponse(res)
}

/* ── Responses ────────────────────────────────────────────── */
export async function fetchResponses (page = 0, size = 200) {
  const res = await fetch(
    `${BASE}/responses?page=${page}&size=${size}`,
    { headers: getAuthHeaders() }
  )
  return handleResponse(res)
}

export async function fetchResponseSheet (groupName) {
  const res = await fetch(
    `${BASE}/responses/sheet/${encodeURIComponent(groupName)}`,
    { headers: getAuthHeaders() }
  )
  return handleResponse(res)
}

export async function createResponse (data) {
  const res = await fetch(`${BASE}/responses`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  })
  return handleResponse(res)
}

/* ── Analytics ────────────────────────────────────────────── */
export async function fetchAnalyticsSummary (filter = 'ALL') {
  const res = await fetch(
    `${BASE}/analytics/summary?filter=${filter}`,
    { headers: getAuthHeaders() }
  )
  return handleResponse(res)
}

export async function fetchGroupAnalytics (groupName, filter = 'ALL') {
  const res = await fetch(
    `${BASE}/analytics/group/${encodeURIComponent(groupName)}?filter=${filter}`,
    { headers: getAuthHeaders() }
  )
  return handleResponse(res)
}