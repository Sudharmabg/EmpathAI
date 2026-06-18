package com.empathai.chat.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "role", nullable = false, length = 50)
    private String role; // "user" or "assistant"

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "detected_mode", length = 50)
    private String detectedMode; // "curriculum" or "mental_health"

    // ── Image persistence ──────────────────────────────────────────────────────
    // Stored as TEXT to hold base64-encoded image data
    @Column(name = "image_base64", columnDefinition = "TEXT")
    private String imageBase64;

    @Column(name = "image_mime_type", length = 50)
    private String imageMimeType; // e.g. "image/png", "image/jpeg"
    // ──────────────────────────────────────────────────────────────────────────

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Builder.Default
    @Column(name = "flagged", nullable = false)
    private Boolean flagged = false;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}