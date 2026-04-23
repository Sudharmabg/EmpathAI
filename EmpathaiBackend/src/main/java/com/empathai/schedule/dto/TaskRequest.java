package com.empathai.schedule.dto;

import lombok.Data;

@Data
public class TaskRequest {
    private Long studentId;
    private String dayOfWeek;   // "Monday", "Tuesday" ... "Sunday"
    private String title;
    private String startTime;   // "HH:MM" 24hr format
    private String endTime;     // "HH:MM" 24hr format
    private String notes;
    private Long excludeTaskId; // used on edit — exclude this task from overlap/duplicate checks
}
