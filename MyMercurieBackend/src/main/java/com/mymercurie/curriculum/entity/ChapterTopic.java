package com.mymercurie.curriculum.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chapter_topics")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChapterTopic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "chapter_id", nullable = false)
    private Long chapterId;

    @Column(name = "topic_name", nullable = false, length = 300)
    private String topicName;

    @Column(name = "parent_id")
    private Long parentId;          // null = top-level topic

    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "raw_content", columnDefinition = "TEXT")
    private String rawContent;      // optional — filled in later

    @Column(name = "created_by", length = 100)
    private String createdBy;

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
