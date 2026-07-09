/**
 * Curriculum + AI API — Single source of truth for the frontend.
 *
 * Every function below is used somewhere in the app. Kept in one file so
 * imports stay clean. Uses apiClient (cookie-based auth + CSRF).
 *
 * Backend routes:
 *   /api/curriculum/*         → CurriculumController (syllabus/modules/subtopics/quiz)
 *   /api/curriculum/chapter/* → ChapterIngestController (chapters, topics, images)
 *   /api/ai/*                 → AiContentController (AI generation & moderation)
 */
import { apiGet, apiPost, apiPut, apiRequest } from './apiClient.js'

const BASE = '/api/curriculum'
const CHAPTER_BASE = '/api/curriculum/chapter'
const AI_BASE = '/api/ai'

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function currentUser() {
    try {
        const u = localStorage.getItem('user')
        return u ? JSON.parse(u).name || 'Admin_User' : 'Admin_User'
    } catch { return 'Admin_User' }
}

function normaliseClassLevel(className) {
    if (!className) return className
    return String(className).replace(/^class\s*/i, '').trim()
}

const normaliseGrade = normaliseClassLevel

// ═══════════════════════════════════════════════════════════════════════════
// SYLLABUS (admin)
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// MODULES (admin)
// ═══════════════════════════════════════════════════════════════════════════

export const createModule = (syllabusId, title) =>
    apiPost(`${BASE}/modules`, { syllabusId, title, createdBy: currentUser(), modifiedBy: currentUser() })

export const updateModule = (id, syllabusId, title) =>
    apiPut(`${BASE}/modules/${id}`, { syllabusId, title, modifiedBy: currentUser() })

export const deleteModule = async (id) => {
    const res = await apiRequest(`${BASE}/modules/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete module')
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBTOPICS (admin — multipart)
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// QUIZ QUESTIONS (admin — multipart)
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER INGEST & MANAGEMENT (admin)
// ═══════════════════════════════════════════════════════════════════════════

/** Upload a new chapter for AI ingestion. */
export const uploadChapter = (request) =>
    apiPost(`${CHAPTER_BASE}/upload`, request)

/** Get chapter processing status (poll for ingestion progress). */
export const getChapterStatus = (id) =>
    apiGet(`${CHAPTER_BASE}/${id}/status`)

/** Update chapter metadata (topics, concepts, etc.). */
export const updateChapterMetadata = (id, request) =>
    apiPut(`${CHAPTER_BASE}/${id}/metadata`, request)

/** Publish a chapter (makes it visible to students). */
export const publishChapter = (id) =>
    apiPost(`${CHAPTER_BASE}/${id}/publish`, {})

/** Archive a chapter. */
export const archiveChapter = (id) =>
    apiPost(`${CHAPTER_BASE}/${id}/archive`, {})

/** Restore an archived chapter. */
export const restoreChapter = (id) =>
    apiPost(`${CHAPTER_BASE}/${id}/restore`, {})

/** List archived chapters. */
export const getArchivedChapters = () =>
    apiGet(`${CHAPTER_BASE}/archived`)

/** Alias kept for legacy code. */
export const listArchivedChapters = getArchivedChapters

/** Get a single chapter by ID. */
export const getChapter = (id) =>
    apiGet(`${CHAPTER_BASE}/${id}`)

/** Alias. */
export const getChapterById = getChapter

/** Delete a chapter. */
export const deleteChapter = async (id) => {
    const res = await apiRequest(`${CHAPTER_BASE}/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete chapter')
}

// ── Chapter Topics ─────────────────────────────────────────────────────

export const getChapterTopics = (chapterId) =>
    apiGet(`${CHAPTER_BASE}/${chapterId}/topics`)

export const addChapterTopic = (chapterId, request) =>
    apiPost(`${CHAPTER_BASE}/${chapterId}/topics`, request)

export const updateChapterTopic = (topicId, request) =>
    apiPut(`${CHAPTER_BASE}/topics/${topicId}`, request)

export const deleteChapterTopic = async (topicId) => {
    const res = await apiRequest(`${CHAPTER_BASE}/topics/${topicId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete topic')
}

// ── Chapter Image Bank ─────────────────────────────────────────────────

export const uploadChapterImage = async (conceptName, file) => {
    const form = new FormData()
    form.append('conceptName', conceptName)
    form.append('file', file)
    const res = await apiRequest(`${CHAPTER_BASE}/image`, {
        method: 'POST',
        body: form,
        headers: {}
    })
    if (!res.ok) throw new Error('Failed to upload chapter image')
    return res.json()
}

export const getChapterImageUrl = (imageId) =>
    `${CHAPTER_BASE}/image/${imageId}`

// ═══════════════════════════════════════════════════════════════════════════
// PUBLISHED CHAPTERS (student & admin)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch published chapters — optionally filtered by grade / subject.
 * Backend: GET /api/curriculum/chapter?grade=...&subject=...
 *
 * Callable with no args (returns all published chapters) or
 * with an options object: getPublishedChapters({ grade, subject })
 */
export async function getPublishedChapters(opts = {}) {
    const { grade, subject } = opts || {}
    const params = new URLSearchParams()
    if (grade) params.append('grade', normaliseGrade(grade))
    if (subject) params.append('subject', subject)

    const query = params.toString() ? `?${params.toString()}` : ''
    const chapters = await apiGet(`${CHAPTER_BASE}${query}`)

    return (chapters || []).map(c => ({
        id: c.id,
        title: c.title,
        subject: c.subject,
        grade: c.grade,
        board: c.board,
        chapterNumber: c.chapterNumber,
        processingStatus: c.processingStatus,
        topics: Array.isArray(c.topics) ? c.topics : [],
        subtopics: Array.isArray(c.subtopics) ? c.subtopics : [],
        concepts: Array.isArray(c.concepts) ? c.concepts : [],
        learningObjectives: Array.isArray(c.learningObjectives) ? c.learningObjectives : [],
        keywords: Array.isArray(c.keywords) ? c.keywords : [],
        definitions: Array.isArray(c.definitions) ? c.definitions : [],
        formulae: Array.isArray(c.formulae) ? c.formulae : [],
        commonMisconceptions: Array.isArray(c.commonMisconceptions) ? c.commonMisconceptions : [],
        prerequisites: Array.isArray(c.prerequisites) ? c.prerequisites : [],
        bloomsLevels: Array.isArray(c.bloomsLevels) ? c.bloomsLevels : [],
        difficultyLevel: c.difficultyLevel,
        estimatedReadingTime: c.estimatedReadingTime,
        createdBy: c.createdBy,
        createdAt: c.createdAt,
        publishedBy: c.publishedBy,
        publishedAt: c.publishedAt,
        archivedBy: c.archivedBy,
        archivedAt: c.archivedAt,
    }))
}

// ═══════════════════════════════════════════════════════════════════════════
// AI STUDY TOOLS (student-facing)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch approved AI content for a chapter/topic + task type.
 * Throws on 404 (used by AiTools.jsx to check approval status).
 */
export async function getCachedAiContent(taskType, chapterId, topic = null) {
    if (!taskType || !chapterId) {
        throw new Error('taskType and chapterId are required')
    }
    const query = topic ? `?topic=${encodeURIComponent(topic)}` : ''
    return apiGet(`${AI_BASE}/content/${encodeURIComponent(taskType)}/${chapterId}${query}`)
}

/** Request AI-generated study content. */
export async function processAiRequest({ task, chapterId, topic, grade, subject, chapter }) {
    if (!task || !chapterId || !grade || !subject || !chapter) {
        throw new Error('task, chapterId, grade, subject, and chapter are required')
    }

    return apiPost(`${AI_BASE}/process`, {
        task,
        chapterId,
        topic: topic || null,
        grade: normaliseGrade(grade),
        subject,
        chapter,
    })
}

// ═══════════════════════════════════════════════════════════════════════════
// AI CONTENT MANAGEMENT (admin)
// ═══════════════════════════════════════════════════════════════════════════

/** Generate AI content manually (admin). */
export const generateToolContent = (request) =>
    apiPost(`${AI_BASE}/content/generate`, request)

/** List all AI content generated for a chapter. */
export const getChapterAiContent = (chapterId) =>
    apiGet(`${AI_BASE}/content/chapter/${chapterId}`)

/** Alias kept for legacy code. */
export const listContentForChapter = getChapterAiContent

/**
 * Coverage summary for a chapter: how many tools have approved / pending
 * content. Derived from getChapterAiContent().
 * Returns: { total, approved, pending, rejected, byTask: { SUMMARY: {...}, ...} }
 */
export const getChapterCoverage = async (chapterId) => {
    const items = await getChapterAiContent(chapterId)
    const summary = {
        total: items.length,
        approved: 0,
        pending: 0,
        rejected: 0,
        byTask: {}
    }
    for (const item of items) {
        const status = (item.approvalStatus || '').toLowerCase()
        if (status === 'approved') summary.approved++
        else if (status === 'pending') summary.pending++
        else if (status === 'rejected') summary.rejected++

        const t = item.taskType
        if (!summary.byTask[t]) summary.byTask[t] = { approved: 0, pending: 0, rejected: 0, total: 0 }
        summary.byTask[t].total++
        if (status === 'approved') summary.byTask[t].approved++
        else if (status === 'pending') summary.byTask[t].pending++
        else if (status === 'rejected') summary.byTask[t].rejected++
    }
    return summary
}

/** List AI content awaiting approval. */
export const getPendingAiContent = () =>
    apiGet(`${AI_BASE}/content/pending`)

/** Alias kept for legacy code. */
export const listPendingContent = getPendingAiContent

/**
 * Approve or reject AI content.
 * Accepts either:
 *   approveAiContent(id, { approvalStatus: 'APPROVED' })     — full request
 *   approveAiContent(id, 'APPROVED')                          — shorthand
 */
export const approveAiContent = (id, requestOrStatus) => {
    const request = typeof requestOrStatus === 'string'
        ? { approvalStatus: requestOrStatus }
        : requestOrStatus
    return apiPut(`${AI_BASE}/content/${id}/approve`, request)
}

/** Alias kept for legacy code. */
export const approveOrRejectContent = approveAiContent

/** Edit AI content. */
export const editAiContent = (id, request) =>
    apiPut(`${AI_BASE}/content/${id}/edit`, request)

/** Alias. */
export const editContent = editAiContent

/** Delete AI content. */
export const deleteAiContent = async (id) => {
    const res = await apiRequest(`${AI_BASE}/content/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete AI content')
}

/** Alias. */
export const deleteContent = deleteAiContent

/** Regenerate AI content. */
export const regenerateContent = (id) =>
    apiPost(`${AI_BASE}/content/${id}/regenerate`, {})