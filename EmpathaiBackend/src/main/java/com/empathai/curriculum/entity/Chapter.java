package com.empathai.curriculum.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chapters")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Chapter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String board = "CBSE";

    @Column(nullable = false, length = 30)
    private String grade;

    @Column(nullable = false, length = 100)
    private String subject;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(name = "raw_content", columnDefinition = "TEXT", nullable = false)
    private String rawContent;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false)
    @Builder.Default
    private ProcessingStatus processingStatus = ProcessingStatus.PENDING;

    // AI-generated metadata stored as JSON strings
    @Column(columnDefinition = "JSONB")
    private String topics;

    @Column(columnDefinition = "JSONB")
    private String subtopics;

    @Column(columnDefinition = "JSONB")
    private String concepts;

    @Column(name = "learning_objectives", columnDefinition = "JSONB")
    private String learningObjectives;

    @Column(name = "blooms_levels", columnDefinition = "JSONB")
    private String bloomsLevels;

    @Column(name = "difficulty_level", length = 20)
    private String difficultyLevel;

    @Column(columnDefinition = "JSONB")
    private String keywords;

    @Column(columnDefinition = "JSONB")
    private String definitions;

    @Column(columnDefinition = "JSONB")
    private String formulae;

    @Column(name = "common_misconceptions", columnDefinition = "JSONB")
    private String commonMisconceptions;

    @Column(columnDefinition = "JSONB")
    private String prerequisites;

    @Column(name = "next_concepts", columnDefinition = "JSONB")
    private String nextConcepts;

    @Column(name = "estimated_reading_time")
    private Integer estimatedReadingTime;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "published_by", length = 100)
    private String publishedBy;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

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
