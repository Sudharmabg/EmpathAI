package com.mymercurie.curriculum.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Stores images uploaded for a chapter's image bank.
 * Binary image data stored directly in DB (same pattern as SubTopic.summaryImage).
 */
@Entity
@Table(name = "chapter_images")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChapterImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "chapter_id")
    private Long chapterId;

    @Column(name = "concept_name", nullable = false, length = 255)
    private String conceptName;

    @Lob
    @Column(name = "image_data", nullable = false)
    private byte[] imageData;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @Column(name = "uploaded_at")
    @Builder.Default
    private LocalDateTime uploadedAt = LocalDateTime.now();
}
