package com.empathai.schedule.dto;

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

    // ✅ ADDED: Auto-detected type from backend ("STUDY", "WELLNESS", "OTHER")
    // This was being calculated but not sent to frontend
    private String detectedType;

    // warnings from soft rules — shown on frontend but task still saved
    private List<String> warnings;
}
