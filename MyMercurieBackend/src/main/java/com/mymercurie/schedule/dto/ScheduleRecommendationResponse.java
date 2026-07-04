package com.mymercurie.schedule.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleRecommendationResponse {

    // School blocked windows — frontend shows as orange "School Hours" blocks
    private List<SchoolTimingResponse> blockedWindows;

    // Upcoming exams for this student with days remaining
    private List<ExamDateResponse> upcomingExams;

    // Ranked suggested tasks (top 8)
    private List<TaskSuggestion> suggestions;

    // Student's preferred study time from onboarding
    // "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT" | null if not set
    private String preferredStudyTime;

    // Student's busy slots for this specific day only
    // Shown as red "Busy" blocks on the timeline with proper reason label
    private List<BusySlotDTO> busySlots;
}