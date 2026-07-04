package com.mymercurie.schedule.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "exam_dates", indexes = {
        @Index(name = "idx_exam_dates_school", columnList = "school_id"),
        @Index(name = "idx_exam_dates_class", columnList = "class_name")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamDate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    @Column(name = "class_name", nullable = false)
    private String className;

    @Column(name = "subject_name", nullable = false)
    private String subjectName;

    @Column(name = "exam_date", nullable = false)
    private LocalDate examDate;
}