package com.empathai.schedule.dto;

import lombok.*;

import java.util.List;

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
}