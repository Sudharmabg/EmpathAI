package com.empathai.chat.dto;

import lombok.Data;

import java.util.List;

@Data
public class ChatMessageRequest {
    private String message;
    private List<String> images; // Base64 encoded images

    // ── Image attachment fields ────────────────────────────────────────────────
    private String imageBase64;    // Raw base64 encoded image data
    private String imageMimeType;  // e.g. "image/png", "image/jpeg"
    // ──────────────────────────────────────────────────────────────────────────

    public ChatMessageRequest() {}

    public ChatMessageRequest(String message) {
        this.message = message;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public List<String> getImages() { return images; }
    public void setImages(List<String> images) { this.images = images; }

    public String getImageBase64() { return imageBase64; }
    public void setImageBase64(String imageBase64) { this.imageBase64 = imageBase64; }

    public String getImageMimeType() { return imageMimeType; }
    public void setImageMimeType(String imageMimeType) { this.imageMimeType = imageMimeType; }
}