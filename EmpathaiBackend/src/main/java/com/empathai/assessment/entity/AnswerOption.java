package com.empathai.assessment.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;


@Entity
@Table(
        name = "answer_options",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_answer_option_index",
                columnNames = {"question_id", "option_index"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnswerOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Builder.Default
    @Column(name = "option_index", nullable = false)
    private Integer optionIndex = 0;

    @Column(name = "option_label", nullable = false, length = 500)
    private String optionLabel;

    @Column(name = "range_value", length = 50)
    private String rangeValue;

    @Column(name = "overall_meaning", length = 500)
    private String overallMeaning;

    @Column(name = "interpretation", columnDefinition = "TEXT")
    private String interpretation;

    @Column(name = "tag", length = 100)
    private String tag;

    @Column(name = "cached_bullets", columnDefinition = "TEXT")
    private String cachedBullets;

    @Column(name = "bullets_generated_at")
    private LocalDateTime bulletsGeneratedAt;

    @Builder.Default
    @Column(name = "bullets_status", length = 50)
    private String bulletsStatus = "PENDING";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();

    }
}