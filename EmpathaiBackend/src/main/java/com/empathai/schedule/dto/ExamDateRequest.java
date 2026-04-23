package com.empathai.schedule.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamDateRequest {
    private Long schoolId;
    private String className;
    private String subjectName;
    private LocalDate examDate;
}