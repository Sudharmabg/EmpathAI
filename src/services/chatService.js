import { apiGet, apiPost } from '../api/apiClient';

/**
 * Chat Buddy Service
 * Communicates with the Spring Boot chat controller handles Student AI interactions.
 */
const chatService = {
  getSessions: () => {
    return apiGet('/api/chat/sessions');
  },

  getSessionHistory: (sessionId) => {
    return apiGet(`/api/chat/session/${sessionId}`);
  },

  getUsage: () => {
    return apiGet('/api/chat/usage');
  },

  sendMessage: (message) => {
    return apiPost('/api/chat/message', { message });
  }
};

export default chatService;
