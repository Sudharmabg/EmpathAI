package com.empathai.schedule.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "schedule_class_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // e.g. "Class 1-2", "Class 3-4", "Class 5-6", "Class 7-8", "Class 9-10", "Class 11-12"
    @Column(name = "class_group", nullable = false, unique = true)
    private String classGroup;

    // max total study minutes on a weekday
    @Column(name = "weekday_cap_mins", nullable = false)
    private int weekdayCapMins;

    // max total study minutes on a weekend
    @Column(name = "weekend_cap_mins", nullable = false)
    private int weekendCapMins;

    // max duration of a single study session
    @Column(name = "session_max_mins", nullable = false)
    private int sessionMaxMins;

    // maps grade strings like "4th Standard", "Class 8" etc. stored as comma-separated patterns
    @Column(name = "grade_patterns", length = 500)
    private String gradePatterns;
}
