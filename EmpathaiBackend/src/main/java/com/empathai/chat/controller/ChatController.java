package com.empathai.chat.controller;

import com.empathai.chat.dto.ChatMessageRequest;
import com.empathai.chat.dto.ChatMessageResponse;
import com.empathai.chat.dto.ChatSessionResponse;
import com.empathai.chat.dto.ChatUsageResponse;
import com.empathai.chat.service.ChatService;
import com.empathai.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);

    private final ChatService chatService;

    /**
     * Send a message and get AI reply.
     * POST /api/chat/message
     */
    @PostMapping("/message")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @AuthenticationPrincipal User currentUser,
            @RequestBody ChatMessageRequest request) {
        logger.info("sendMessage started for userId={}", currentUser.getId());
        try {
            ChatMessageResponse response = chatService.sendMessage(currentUser.getId(), request.getMessage());
            ResponseEntity<ChatMessageResponse> result = ResponseEntity.ok(response);
            logger.info("sendMessage completed successfully for userId={}", currentUser.getId());
            return result;
        } catch (Exception e) {
            logger.error("sendMessage failed for userId={}: {}", currentUser.getId(), e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Get all sessions for the current student (list, no messages).
     * GET /api/chat/sessions
     */
    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSessionResponse>> getSessions(
            @AuthenticationPrincipal User currentUser) {
        logger.info("getSessions started for userId={}", currentUser.getId());
        try {
            ResponseEntity<List<ChatSessionResponse>> result = ResponseEntity.ok(chatService.getSessions(currentUser.getId()));
            logger.info("getSessions completed successfully for userId={}", currentUser.getId());
            return result;
        } catch (Exception e) {
            logger.error("getSessions failed for userId={}: {}", currentUser.getId(), e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Get full message history for a specific session.
     * GET /api/chat/session/{id}
     */
    @GetMapping("/session/{id}")
    public ResponseEntity<ChatSessionResponse> getSession(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        logger.info("getSession started for sessionId={}, userId={}", id, currentUser.getId());
        try {
            ResponseEntity<ChatSessionResponse> result = ResponseEntity.ok(chatService.getSessionMessages(id, currentUser.getId()));
            logger.info("getSession completed successfully for sessionId={}, userId={}", id, currentUser.getId());
            return result;
        } catch (Exception e) {
            logger.error("getSession failed for sessionId={}, userId={}: {}", id, currentUser.getId(), e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Get today's usage stats.
     * GET /api/chat/usage
     */
    @GetMapping("/usage")
    public ResponseEntity<ChatUsageResponse> getUsage(
            @AuthenticationPrincipal User currentUser) {
        logger.info("getUsage started for userId={}", currentUser.getId());
        try {
            ResponseEntity<ChatUsageResponse> result = ResponseEntity.ok(chatService.getUsage(currentUser.getId()));
            logger.info("getUsage completed successfully for userId={}", currentUser.getId());
            return result;
        } catch (Exception e) {
            logger.error("getUsage failed for userId={}: {}", currentUser.getId(), e.getMessage(), e);
            throw e;
        }
    }
}