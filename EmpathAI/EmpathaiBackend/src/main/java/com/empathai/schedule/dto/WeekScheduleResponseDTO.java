package com.empathai.schedule.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeekScheduleResponseDTO {

    // day → list of generated tasks
    // e.g. { "Monday": [...], "Tuesday": [...] }
    private Map<String, List<TaskResponse>> weekSchedule;

    // Any warnings generated during week planning
    private List<String> weekWarnings;

    // Total study minutes scheduled across the week
    private int totalStudyMinutes;

    // Number of days that have at least one task
    private int activeDays;
}