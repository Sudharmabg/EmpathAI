package com.mymercurie.schedule.entity;

import com.mymercurie.user.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "schedule_tasks", indexes = {
        @Index(name = "idx_schedule_tasks_student", columnList = "student_id"),
        @Index(name = "idx_schedule_tasks_date", columnList = "task_date")
})
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

    @Column(name = "task_date", nullable = false)
    private LocalDate taskDate;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "detected_type", length = 20)
    private String detectedType;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Builder.Default
    @Column(name = "is_completed", nullable = false)
    private boolean completed = false;

    @Transient
    public String getDayOfWeek() {
        return taskDate != null
                ? taskDate.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH)
                : null;
    }
}