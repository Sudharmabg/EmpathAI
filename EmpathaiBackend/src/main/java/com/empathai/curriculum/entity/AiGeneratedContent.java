package com.empathai.curriculum.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_generated_content",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_task_chapter_topic",
        columnNames = {"task_type", "chapter_id", "topic"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiGeneratedContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "chapter_id", nullable = false)
    private Long chapterId;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false)
    private AiTaskType taskType;

    // NULL = chapter-level; set = topic-level
    @Column(length = 300)
    private String topic;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;    // Validated JSON string

    @Column(name = "is_approved", nullable = false)
    @Builder.Default
    private Boolean isApproved = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
