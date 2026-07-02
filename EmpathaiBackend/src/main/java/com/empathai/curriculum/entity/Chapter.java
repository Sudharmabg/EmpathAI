package com.empathai.curriculum.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
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

    @Column(name = "chapter_number")
    private Integer chapterNumber;

    @Column(name = "raw_content", columnDefinition = "TEXT", nullable = false)
    private String rawContent;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false)
    @Builder.Default
    private ProcessingStatus processingStatus = ProcessingStatus.PENDING;

    // AI-generated metadata stored as JSON strings
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    private String topics;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    private String subtopics;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    private String concepts;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "learning_objectives", columnDefinition = "JSONB")
    private String learningObjectives;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "blooms_levels", columnDefinition = "JSONB")
    private String bloomsLevels;

    @Column(name = "difficulty_level", length = 20)
    private String difficultyLevel;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    private String keywords;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    private String definitions;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    private String formulae;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "common_misconceptions", columnDefinition = "JSONB")
    private String commonMisconceptions;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    private String prerequisites;

    @JdbcTypeCode(SqlTypes.JSON)
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

    @Column(name = "archived_by", length = 100)
    private String archivedBy;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

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
