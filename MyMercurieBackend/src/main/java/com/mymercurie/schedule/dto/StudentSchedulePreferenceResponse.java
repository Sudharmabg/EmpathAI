package com.mymercurie.schedule.dto;

import lombok.*;

import java.util.List;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentSchedulePreferenceResponse {

    private Long id;
    private Long studentId;
    private String preferredStudyTime;
    private List<BusySlotDTO> busySlots;
    private Boolean onboardingComplete;
    private String lastRelaxActivity;

    // NEW fields — Study Goals
    private Set<String> preferredStudyDays;
    private Integer dailyStudyTargetHours;
    private String studyIntensity;
}