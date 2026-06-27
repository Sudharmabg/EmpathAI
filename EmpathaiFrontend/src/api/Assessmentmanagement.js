import { apiGet, apiPost, apiPut, apiDelete } from './apiClient'

/* ── Groups ───────────────────────────────────────────────── */
export async function fetchGroups () {
  return apiGet('/api/groups')
}

/** Fetch groups that belong to a specific class (for student portal) */
export async function fetchGroupsByClass (className) {
  return apiGet(`/api/groups/class/${encodeURIComponent(className)}`)
}

export async function createGroup (data) {
  return apiPost('/api/groups', data)
}

export async function deleteGroup (id) {
  return apiDelete(`/api/groups/${id}`)
}

/* ── Questions ────────────────────────────────────────────── */
export async function fetchQuestions (page = 0, size = 50) {
  return apiGet(`/api/questions?page=${page}&size=${size}`)
}

export async function fetchQuestionsByClass (className) {
  return apiGet(`/api/questions/class/${encodeURIComponent(className)}`)
}

export async function createQuestion (data) {
  return apiPost('/api/questions', data)
}

export async function updateQuestion (id, data) {
  return apiPut(`/api/questions/${id}`, data)
}

export async function deleteQuestion (id) {
  return apiDelete(`/api/questions/${id}`)
}

/* ── Responses ────────────────────────────────────────────── */
export async function fetchResponses (page = 0, size = 200) {
  return apiGet(`/api/responses?page=${page}&size=${size}`)
}

export async function fetchResponseSheet (groupName) {
  return apiGet(`/api/responses/sheet/${encodeURIComponent(groupName)}`)
}

export async function createResponse (data) {
  return apiPost('/api/responses', data)
}

/* ── Analytics ────────────────────────────────────────────── */
export async function fetchAnalyticsSummary (filter = 'ALL') {
  return apiGet(`/api/analytics/summary?filter=${filter}`)
}

export async function fetchGroupAnalytics (groupName, filter = 'ALL') {
  return apiGet(`/api/analytics/group/${encodeURIComponent(groupName)}?filter=${filter}`)
}

export async function updateInsight (reportId, editedText) {
  return apiPut(`/api/assessment/reports/${reportId}/edit`, { editedText })
}

export async function confirmInsight (reportId) {
  return apiPut(`/api/assessment/reports/${reportId}/confirm`, {})
}