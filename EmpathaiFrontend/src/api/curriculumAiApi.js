/**
 * Curriculum AI API
 * Uses apiClient so HttpOnly JWT cookies and CSRF tokens are handled automatically.
 */
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient.js'

// ── Admin: Chapter Ingest ─────────────────────────────────────────────────────

export async function uploadChapter(data) {
  return apiPost('/api/curriculum/chapter/upload', data)
}

export async function getChapterStatus(chapterId) {
  return apiGet(`/api/curriculum/chapter/${chapterId}/status`)
}

export async function updateChapterMetadata(chapterId, data) {
  return apiPut(`/api/curriculum/chapter/${chapterId}/metadata`, data)
}

export async function publishChapter(chapterId) {
  return apiPost(`/api/curriculum/chapter/${chapterId}/publish`, {})
}

export async function getPublishedChapters(grade = null, subject = null) {
  const params = new URLSearchParams()
  if (grade)   params.append('grade', grade)
  if (subject) params.append('subject', subject)
  
  const queryStr = params.toString()
  const url = `/api/curriculum/chapter${queryStr ? '?' + queryStr : ''}`
  return apiGet(url)
}

export async function getChapter(chapterId) {
  return apiGet(`/api/curriculum/chapter/${chapterId}`)
}

// ── Admin: Archive ─────────────────────────────────────────────────────────────
export async function archiveChapter(chapterId) { return apiPost(`/api/curriculum/chapter/${chapterId}/archive`, {}); }
export async function restoreChapter(chapterId) { return apiPost(`/api/curriculum/chapter/${chapterId}/restore`, {}); }
export async function getArchivedChapters() { return apiGet('/api/curriculum/chapter/archived'); }

// ── Admin: Topics ──────────────────────────────────────────────────────────────
export async function getChapterTopics(chapterId) { return apiGet(`/api/curriculum/chapter/${chapterId}/topics`); }
export async function addChapterTopic(chapterId, data) { return apiPost(`/api/curriculum/chapter/${chapterId}/topics`, data); }
export async function updateChapterTopic(topicId, data) { return apiPut(`/api/curriculum/chapter/topics/${topicId}`, data); }
export async function deleteChapterTopic(topicId) { return apiDelete(`/api/curriculum/chapter/topics/${topicId}`); }

// ── Admin: AI Content Management ───────────────────────────────────────────────
export async function generateToolContent(data) { return apiPost('/api/ai/content/generate', data); }
export async function getChapterAiContent(chapterId) { return apiGet(`/api/ai/content/chapter/${chapterId}`); }
export async function getChapterCoverage(chapterId) { return apiGet(`/api/ai/content/chapter/${chapterId}`); } // alias for coverage badge
export async function getPendingAiContent() { return apiGet('/api/ai/content/pending'); }
export async function approveAiContent(id, data) { return apiPut(`/api/ai/content/${id}/approve`, data); }
export async function editAiContent(id, data) { return apiPut(`/api/ai/content/${id}/edit`, data); }
export async function deleteAiContent(id) { return apiDelete(`/api/ai/content/${id}`); }
export async function createAiContent(data) { return apiPost('/api/ai/content/create', data); }
export async function regenerateContent(id) { return apiPost(`/api/ai/content/${id}/regenerate`, {}); }

// ── Student: AI Tools ─────────────────────────────────────────────────────────

export async function processAiRequest({ task, chapterId, topic, grade, subject, chapter }) {
  return apiPost('/api/ai/process', { task, chapterId, topic, grade, subject, chapter })
}
