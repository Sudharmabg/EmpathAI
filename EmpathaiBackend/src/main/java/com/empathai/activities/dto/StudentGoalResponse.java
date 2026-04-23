package com.empathai.activities.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentGoalResponse {

    private Long id;
    private String goalText;
    private String subjectTag;
    private LocalDate targetDate;
    private LocalDateTime createdAt;
}