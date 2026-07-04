package com.mymercurie.schedule.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class TaskResponse {
    private Long id;
    private Long studentId;
    private String dayOfWeek;
    private String title;
    private String startTime;
    private String endTime;
    private String notes;
    private boolean completed;
    private String detectedType;
    private List<String> warnings;

    // ✅ XP earned when this task was completed (0 if unchecked or not completed)
    private int xpEarned;
}