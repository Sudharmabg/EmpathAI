package com.empathai.schedule.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskSuggestion {
    private String title;
    private String subjectName;
    private String reasonLabel;   // shown on frontend e.g. "Exam in 3 days", "Matches your goal"
    private int    estimatedMinutes;
    private int    score;         // internal ranking score, not shown on frontend
    private String taskType;      // "STUDY" | "WELLNESS" | "OTHER" — used by frontend for badge colour
}