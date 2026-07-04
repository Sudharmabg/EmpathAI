package com.mymercurie.wellness.entity;

import com.mymercurie.user.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "sleep_entries", indexes = {
        @Index(name = "idx_sleep_student", columnList = "student_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SleepEntry extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "bedtime", nullable = false)
    @JsonFormat(pattern = "HH:mm")
    private LocalTime bedtime;

    @Column(name = "wake_time", nullable = false)
    @JsonFormat(pattern = "HH:mm")
    private LocalTime wakeTime;

    @Column(name = "quality", nullable = false, length = 20)
    private String quality;

    @Column(name = "logged_at", nullable = false)
    private LocalDateTime loggedAt;

    @PrePersist
    public void prePersist() {
        if (loggedAt == null) loggedAt = LocalDateTime.now();
    }
}