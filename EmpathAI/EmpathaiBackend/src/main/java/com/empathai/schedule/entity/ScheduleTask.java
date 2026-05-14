package com.empathai.schedule.entity;

import com.empathai.user.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "schedule_tasks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleTask extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "day_of_week", nullable = false, length = 10)
    private String dayOfWeek;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "start_time", nullable = false, length = 5)
    private String startTime;

    @Column(name = "end_time", nullable = false, length = 5)
    private String endTime;

    @Column(name = "detected_type", length = 10)
    private String detectedType;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Builder.Default
    @Column(name = "is_completed", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private boolean completed = false;     // ← Changed to primitive boolean
}