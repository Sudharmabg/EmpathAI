package com.empathai.schedule.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamDateResponse {
    private Long id;
    private String className;        // ← ADD THIS LINE
    private String subjectName;
    private LocalDate examDate;
    private long daysRemaining;
    private String urgency; // "URGENT" (<= 7 days), "UPCOMING" (<= 14 days), "NORMAL"
}