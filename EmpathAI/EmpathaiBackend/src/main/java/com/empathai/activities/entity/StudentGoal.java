package com.empathai.activities.entity;

import com.empathai.user.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_goals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentGoal extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "goal_text", nullable = false)
    private String goalText;

    @Column(name = "subject_tag", nullable = false)
    private String subjectTag;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @Builder.Default
    @Column(name = "is_active", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 1")
    private Boolean active = true;
}