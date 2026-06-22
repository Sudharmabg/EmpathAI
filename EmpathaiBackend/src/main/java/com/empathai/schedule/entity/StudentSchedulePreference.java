package com.empathai.schedule.entity;

import com.empathai.user.entity.BaseEntity;
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
    // e.g. [{"day":"Monday","startTime":"16:00","endTime":"18:00","reason":"Football practice"}]
    @Column(name = "busy_slots", columnDefinition = "TEXT")
    private String busySlots;

    @Column(name = "last_relax_activity")
    private String lastRelaxActivity;

    @Builder.Default
    @Column(name = "onboarding_complete", nullable = false)
    private Boolean onboardingComplete = false;
}