package com.empathai.chat.dto;

import lombok.Data;

@Data
public class ChatMessageRequest {
    private String message;
    private java.util.List<String> images; // Base64 encoded images

    // ── Image attachment fields ─────────────────────
    private String imageBase64;           // Raw base64 encoded image data (upstream)
    private String imageMimeType;         // e.g. "image/png", "image/jpeg" (upstream)

    public ChatMessageRequest() {}

    public ChatMessageRequest(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public java.util.List<String> getImages() {
        return images;
    }

    public void setImages(java.util.List<String> images) {
        this.images = images;
    }
}
