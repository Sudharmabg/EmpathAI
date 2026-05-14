package com.empathai.activities.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentGoalRequest {

    private Long studentId;
    private String goalText;
    private String subjectTag;
    private LocalDate targetDate;
}