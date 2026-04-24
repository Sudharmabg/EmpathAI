import { apiGet, apiPost } from '../api/apiClient';

/**
 * Chat Buddy Service
 * Communicates with the Spring Boot chat controller → Python LLM.
 *
 * POST /api/chat/message   { message }
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
const chatService = {
  /** Send a student message; returns { id, role, content, detectedMode, createdAt } */
  sendMessage: (message) => apiPost('/api/chat/message', { message }),

  /** All sessions for the current student — no message bodies */
  getSessions: () => apiGet('/api/chat/sessions'),

  /** Full message history for a single session */
  getSessionHistory: (sessionId) => apiGet(`/api/chat/session/${sessionId}`),

  /** Today's usage stats */
  getUsage: () => apiGet('/api/chat/usage'),
};

export default chatService;
