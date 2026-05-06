package com.empathai.chat.dto;

import lombok.Data;

@Data
public class ChatMessageRequest {
    private String message;

    // ── Image attachment fields (null when no image sent) ─────────────────────
    private String imageBase64;    // Raw base64 encoded image data
    private String imageMimeType;  // e.g. "image/png", "image/jpeg"
}