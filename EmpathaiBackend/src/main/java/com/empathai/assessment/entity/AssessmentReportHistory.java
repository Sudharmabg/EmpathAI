package com.empathai.assessment.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "assessment_report_history", indexes = {
        @Index(name = "idx_report_history_report", columnList = "report_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssessmentReportHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "report_id", nullable = false)
    private Long reportId;

    @Column(name = "summary_text", columnDefinition = "TEXT")
    private String summaryText;

    @Column(name = "edited_by", length = 255)
    private String editedBy;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @Column(name = "change_type", length = 50)
    private String changeType; // 'AI_GENERATED' | 'HUMAN_EDITED' | 'CONFIRMED'
}
