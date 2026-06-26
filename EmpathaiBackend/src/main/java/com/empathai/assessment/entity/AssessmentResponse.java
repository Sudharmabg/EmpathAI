package com.empathai.assessment.entity;

import jakarta.persistence.*;
import lombok.*;
import com.empathai.user.entity.Student;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_responses", indexes = {
        @Index(name = "idx_student_responses_student", columnList = "student_id"),
        @Index(name = "idx_student_responses_group", columnList = "group_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id")
    private Long studentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", insertable = false, updatable = false)
    private Student student;

    @Column(name = "question_id")
    private Long questionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", insertable = false, updatable = false)
    private AssessmentQuestion question;

    @Column(name = "response_value")
    private String responseValue;

    @Column(name = "emotion")
    private String emotion;

    @Column(name = "group_id")
    private Long groupId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", insertable = false, updatable = false)
    private AssessmentGroup group;

    @Column(name = "submitted_at", updatable = false)
    private LocalDateTime submittedAt;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
    }
}