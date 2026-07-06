package com.mymercurie.schedule.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class TaskResponse {
    private Long id;
    private Long studentId;
    private LocalDate date;
    private String dayOfWeek;
    private String title;
    private String startTime;
    private String endTime;
    private String notes;
    private boolean completed;
    private String detectedType;
    private List<String> warnings;
    private int xpEarned;
}