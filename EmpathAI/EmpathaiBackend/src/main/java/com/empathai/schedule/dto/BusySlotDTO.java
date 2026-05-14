package com.empathai.schedule.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusySlotDTO {

    // "Monday" | "Tuesday" ... "Sunday"
    private String day;

    // "HH:MM" 24hr format
    private String startTime;

    // "HH:MM" 24hr format
    private String endTime;

    // What the student does during this time
    // e.g. "Football practice", "Tuition", "Family time"
    private String reason;
}