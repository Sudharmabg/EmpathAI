import { apiGet, apiPost } from '../api/apiClient';

/**
 * Chat Buddy Service
 * Communicates with the Spring Boot chat controller → Python LLM.
 *
 * POST /api/chat/message   { message, imageBase64?, imageMimeType? }
 *   → { id, role, content, detectedMode, createdAt }
 *
 * GET  /api/chat/sessions
 *   → [{ id, weekStart, createdAt }]
 *
 * GET  /api/chat/session/:id
 *   → { id, weekStart, createdAt, messages: [...] }
 *
 * GET  /api/chat/usage
 *   → { used, limit, remaining }
 */

/**
 * Convert a File object to a base64 string (data stripped, raw base64 only).
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // result is "data:image/png;base64,XXXX..." — strip the prefix
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
   * @param {string} message - Text message
   * @param {File|null} imageFile - Optional image file to send
   */
  sendMessage: async (message, imageFile = null) => {
    const payload = { message }

    if (imageFile) {
      const base64 = await fileToBase64(imageFile)
      payload.imageBase64 = base64
      payload.imageMimeType = imageFile.type  // e.g. "image/png"
    }

    return apiPost('/api/chat/message', payload)
  },

  /** All sessions for the current student — no message bodies */
  getSessions: () => apiGet('/api/chat/sessions'),

  /** Full message history for a single session */
  getSessionHistory: (sessionId) => apiGet(`/api/chat/session/${sessionId}`),

  /** Today's usage stats */
  getUsage: () => apiGet('/api/chat/usage'),
}

export default chatService