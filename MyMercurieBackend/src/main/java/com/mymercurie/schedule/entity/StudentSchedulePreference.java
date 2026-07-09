package com.mymercurie.schedule.entity;

import com.mymercurie.user.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "student_schedule_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentSchedulePreference extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false, unique = true)
    private Long studentId;

    // "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT"
    @Column(name = "preferred_study_time", nullable = false, length = 20)
    private String preferredStudyTime;

    // JSON array string — busy slots per day
    @Column(name = "busy_slots", columnDefinition = "TEXT")
    private String busySlots;

    @Column(name = "last_relax_activity")
    private String lastRelaxActivity;

    @Builder.Default
    @Column(name = "onboarding_complete", nullable = false)
    private Boolean onboardingComplete = false;

    // ═══════════════════════════════════════════════════════════════════════════
    // NEW FIELDS — Study Goals
    // ═══════════════════════════════════════════════════════════════════════════

    // JSON array string — e.g. ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]
    @Column(name = "preferred_study_days", columnDefinition = "TEXT")
    private String preferredStudyDays;

    @Builder.Default
    @Column(name = "daily_study_target_hours", nullable = false)
    private Integer dailyStudyTargetHours = 4;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "study_intensity", nullable = false, length = 20)
    private StudyIntensity studyIntensity = StudyIntensity.MODERATE;
}