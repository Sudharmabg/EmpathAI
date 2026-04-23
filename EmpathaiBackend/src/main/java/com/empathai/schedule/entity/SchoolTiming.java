package com.empathai.schedule.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "school_timings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchoolTiming {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    // e.g. "Class 1", "Class 8", "Class 10"
    @Column(name = "class_name", nullable = false)
    private String className;

    // e.g. "Monday", "Tuesday" ... "Friday"
    @Column(name = "day_of_week", nullable = false, length = 10)
    private String dayOfWeek;

    // e.g. "08:00"
    @Column(name = "start_time", nullable = false, length = 5)
    private String startTime;

    // e.g. "14:00"
    @Column(name = "end_time", nullable = false, length = 5)
    private String endTime;
}