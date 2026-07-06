package com.mymercurie.schedule.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class TaskRequest {
    private Long studentId;
    private LocalDate date;
    private String title;
    private String startTime;
    private String endTime;
    private String notes;
    private String detectedType;
    private Long excludeTaskId;
}