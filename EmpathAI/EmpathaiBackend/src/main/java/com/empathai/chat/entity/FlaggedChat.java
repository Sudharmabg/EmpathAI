package com.empathai.chat.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "flagged_chats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlaggedChat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The chat session this flag originated from */
    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    /** The student who sent the concerning message */
    @Column(name = "student_id", nullable = false)
    private Long studentId;

    /** The exact message that triggered the flag (truncated to 1000 chars for storage) */
    @Column(name = "last_message", nullable = false, length = 1000)
    private String lastMessage;

    /** Human-readable reason, e.g. "Suicidal ideation / Self-harm" */
    @Column(name = "flag_reason", nullable = false, length = 255)
    private String flagReason;

    /** AI-assessed sentiment label, e.g. "Highly Concerned" */
    @Column(name = "sentiment", nullable = false, length = 100)
    private String sentiment;

    /** Enum: CRITICAL / HIGH / MEDIUM */
    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private Severity severity;

    /** Enum: PENDING / ASSIGNED / RESOLVED */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private FlagStatus status = FlagStatus.PENDING;

    /** ID of the psychologist assigned to this case (nullable until assigned) */
    @Column(name = "assigned_psychologist_id")
    private Long assignedPsychologistId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}