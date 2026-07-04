package com.mymercurie.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ChatMessageResponse {
    private Long id;
    private String role;
    private String content;
    private String detectedMode;
    private LocalDateTime createdAt;

    // ── Image fields — returned when history is loaded so image re-renders ────
    private String imageBase64;
    private String imageMimeType;
    // ──────────────────────────────────────────────────────────────────────────
}