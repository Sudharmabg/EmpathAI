package com.mymercurie.schedule.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WeekScheduleRequestDTO {

    private Long studentId;

    // "MORNING"   → preferred window 06:00–12:00
    // "AFTERNOON" → preferred window 12:00–17:00
    // "EVENING"   → preferred window 17:00–21:00
    // "NIGHT"     → preferred window 21:00–23:00
    private String preferredStudyTime;

    // Busy slots to exclude from scheduling
    private List<BusySlotDTO> busySlots;

    // Optional: which days to generate (defaults to full Mon–Sun if null)
    private List<String> targetDays;
}