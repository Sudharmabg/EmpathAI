package com.empathai.schedule.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentSchedulePreferenceRequest {

    private Long studentId;

    // "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT"
    private String preferredStudyTime;

    // List of busy slots the student has marked
    private List<BusySlotDTO> busySlots;

    private String lastRelaxActivity;
}