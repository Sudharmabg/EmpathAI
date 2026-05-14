package com.empathai.schedule.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "exam_dates")
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