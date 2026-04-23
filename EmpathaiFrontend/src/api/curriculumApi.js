/**
 * Curriculum API
 * Uses apiClient so JWT Bearer token is automatically injected.
 */
import { apiGet, apiPost, apiPut, apiRequest } from './apiClient.js'

const BASE = '/api/curriculum'

function currentUser() {
    try {
        const u = localStorage.getItem('user')
        return u ? JSON.parse(u).name || 'Admin_User' : 'Admin_User'
    } catch { return 'Admin_User' }
}

/**
 * Normalise a student's className to match how the admin stores classLevel.
 * Examples:
 *   "Class5th Standard"  → "5th Standard"
 *   "Class 5th Standard" → "5th Standard"
 *   "5th Standard"       → "5th Standard"  (unchanged)
 *   "class5"             → "5"
 */
function normaliseClassLevel(className) {
    if (!className) return className
    return className
        .replace(/^class\s*/i, '')
        .trim()
}

// ── SYLLABUS ──────────────────────────────────────────────────────────────────

export const getAllSyllabi = () =>
    apiGet(`${BASE}/syllabi`)

export const getSyllabiByClass = (classLevel) =>
    apiGet(`${BASE}/syllabi/class/${encodeURIComponent(normaliseClassLevel(classLevel))}`)

export const createSyllabus = (subject, classLevel) =>
    apiPost(`${BASE}/syllabi`, { subject, classLevel, createdBy: currentUser(), modifiedBy: currentUser() })

export const updateSyllabus = (id, subject, classLevel) =>
    apiPut(`${BASE}/syllabi/${id}`, { subject, classLevel, modifiedBy: currentUser() })

export const deleteSyllabus = async (id) => {
    const res = await apiRequest(`${BASE}/syllabi/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete syllabus')
}

// ── MODULES ───────────────────────────────────────────────────────────────────

export const createModule = (syllabusId, title) =>
    apiPost(`${BASE}/modules`, { syllabusId, title, createdBy: currentUser(), modifiedBy: currentUser() })

export const updateModule = (id, syllabusId, title) =>
    apiPut(`${BASE}/modules/${id}`, { syllabusId, title, modifiedBy: currentUser() })

export const deleteModule = async (id) => {
    const res = await apiRequest(`${BASE}/modules/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete module')
}

// ── SUBTOPICS (multipart) ─────────────────────────────────────────────────────

function buildSubTopicForm(moduleId, data, extra = {}) {
    const f = new FormData()
    f.append('moduleId', moduleId)
    f.append('title', data.title)
    if (data.videoUrl) f.append('videoUrl', data.videoUrl)
    if (data.summary) f.append('summary', data.summary)
    if (data.learningObjectives) f.append('learningObjectives', data.learningObjectives)
    if (data.summaryImage) f.append('summaryImage', data.summaryImage)
    if (data.orderIndex != null) f.append('orderIndex', data.orderIndex)
    Object.entries(extra).forEach(([k, v]) => f.append(k, v))
    return f
}

export const createSubTopic = async (moduleId, data) => {
    const res = await apiRequest(`${BASE}/subtopics`, {
        method: 'POST',
        body: buildSubTopicForm(moduleId, data, { createdBy: currentUser(), modifiedBy: currentUser() }),
        headers: {}
    })
    if (!res.ok) throw new Error('Failed to create subtopic')
    return res.json()
}

export const updateSubTopic = async (id, moduleId, data) => {
    const res = await apiRequest(`${BASE}/subtopics/${id}`, {
        method: 'PUT',
        body: buildSubTopicForm(moduleId, data, { modifiedBy: currentUser() }),
        headers: {}
    })
    if (!res.ok) throw new Error('Failed to update subtopic')
    return res.json()
}

export const deleteSubTopic = async (id) => {
    const res = await apiRequest(`${BASE}/subtopics/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete subtopic')
}

// ── QUIZ (multipart) ──────────────────────────────────────────────────────────

function buildQuizForm(subTopicId, q, extra = {}) {
    const f = new FormData()
    f.append('subTopicId', subTopicId)
    f.append('questionText', q.question)
    f.append('optionA', q.options[0] || '')
    f.append('optionB', q.options[1] || '')
    f.append('optionC', q.options[2] || '')
    f.append('optionD', q.options[3] || '')
    f.append('correctAnswer', String(q.correctAnswer))
    f.append('explanation', q.explanation || '')
    if (q.questionImage) f.append('questionImage', q.questionImage)
    Object.entries(extra).forEach(([k, v]) => f.append(k, v))
    return f
}

export const createQuizQuestion = async (subTopicId, q) => {
    const res = await apiRequest(`${BASE}/quiz`, {
        method: 'POST',
        body: buildQuizForm(subTopicId, q, { createdBy: currentUser(), modifiedBy: currentUser() }),
        headers: {}
    })
    if (!res.ok) throw new Error('Failed to create quiz question')
    return res.json()
}

export const updateQuizQuestion = async (id, subTopicId, q) => {
    const res = await apiRequest(`${BASE}/quiz/${id}`, {
        method: 'PUT',
        body: buildQuizForm(subTopicId, q, { modifiedBy: currentUser() }),
        headers: {}
    })
    if (!res.ok) throw new Error('Failed to update quiz question')
    return res.json()
}

export const deleteQuizQuestion = async (id) => {
    const res = await apiRequest(`${BASE}/quiz/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete quiz question')
}

// ── SYNC QUIZ ─────────────────────────────────────────────────────────────────

export const syncQuizQuestions = async (subTopicId, frontendQuestions, backendQuestions) => {
    const keptIds = frontendQuestions.filter(q => q.backendId != null).map(q => q.backendId)
    for (const bq of backendQuestions) {
        if (!keptIds.includes(bq.id)) await deleteQuizQuestion(bq.id)
    }
    for (const q of frontendQuestions) {
        if (q.backendId != null) await updateQuizQuestion(q.backendId, subTopicId, q)
        else await createQuizQuestion(subTopicId, q)
    }
}