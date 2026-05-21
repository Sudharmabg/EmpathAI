import { apiGet, apiPost } from '../api/apiClient';

/**
 * Chat Buddy Service
 *
 * POST /api/chat/message   { message, imageBase64?, imageMimeType? }
 *   → { id, role, content, detectedMode, createdAt }
 *
 * POST /api/chat/log       { userMessage, assistantMessage, source }
 *   → 200 OK (no body) — logs Schedule Assistant turn without calling LLM
 *
 * GET  /api/chat/sessions
 *   → [{ id, weekStart, createdAt, source }]
 *
 * GET  /api/chat/session/:id
 *   → { id, weekStart, createdAt, source, messages: [...] }
 *
 * GET  /api/chat/usage
 *   → { used, limit, remaining }
 */

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const chatService = {
  /**
   * Send a student message with optional image attachment.
   * Goes through the Python LangGraph pipeline.
   */
  sendMessage: async (message, imagesOrFile = []) => {
    const payload = { message }

    if (Array.isArray(imagesOrFile)) {
      payload.images = imagesOrFile
    } else if (imagesOrFile instanceof File) {
      const base64 = await fileToBase64(imagesOrFile)
      payload.imageBase64   = base64
      payload.imageMimeType = imagesOrFile.type
    }

    return apiPost('/api/chat/message', payload)
  },

  /**
   * Log a Schedule Assistant conversation turn directly to the DB.
   * Does NOT call the Python LLM — just stores the messages.
   */
  logScheduleMessage: (userMessage, assistantMessage) =>
    apiPost('/api/chat/log', {
      userMessage,
      assistantMessage,
      source: 'SCHEDULE',
    }),

  /** All sessions for the current student — no message bodies */
  getSessions: () => apiGet('/api/chat/sessions'),

  /** Full message history for a single session */
  getSessionHistory: (sessionId) => apiGet(`/api/chat/session/${sessionId}`),

  /** Today's usage stats */
  getUsage: () => apiGet('/api/chat/usage'),
}

export default chatService