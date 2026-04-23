package com.empathai.schedule.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleRecommendationResponse {

    // Blocked school time slots for today's day — frontend greys these out
    private List<SchoolTimingResponse> blockedWindows;

    // Upcoming exams for this student with days remaining
    private List<ExamDateResponse> upcomingExams;

    // Ranked suggested tasks (top 10)
    private List<TaskSuggestion> suggestions;
}