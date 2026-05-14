package com.empathai.assessment.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Stores the pre-generated overall psychological report after a student
 * completes a full assessment session.
 *
 * Flow:
 *  1. Student submits all answers for a group.
 *  2. Backend does SQL lookup: questionId + optionLabel → AnswerOption row per answer.
 *  3. All interpretations are concatenated and sent in ONE LLM call.
 *  4. The LLM response (summary + bullet points) is stored here.
 *  5. On future views the cached report is returned — no repeated LLM calls.
 *
 * ChromaDB usage:
 *  After the report is saved, the student's full answer profile (metadata +
 *  interpreted text) is embedded and stored in ChromaDB for psychologist/teacher
 *  semantic search ("students struggling with emotional regulation").
 */
@Entity
@Table(
        name = "assessment_reports",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_student_group_report",
                columnNames = {"student_id", "group_id", "session_date"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id")
    private String studentId;   // email or UUID from frontend

    @Column(name = "student_name")
    private String studentName;

    @Column(name = "group_id")
    private Long groupId;

    @Column(name = "group_name")
    private String groupName;

    @Column(name = "class_name")
    private String className;

    @Column(name = "session_date")
    private java.time.LocalDate sessionDate;

    @Column(name = "answers_json", columnDefinition = "TEXT")
    private String answersJson;

    @Column(name = "summary_text", columnDefinition = "TEXT")
    private String summaryText;

    @Column(name = "bullet_points", columnDefinition = "TEXT")
    private String bulletPoints;


    @Builder.Default
    @Column(name = "chroma_synced")
    private Boolean chromaSynced = false;

    @Column(name = "chroma_doc_id", length = 200)
    private String chromaDocId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (sessionDate == null) sessionDate = java.time.LocalDate.now();
    }
}