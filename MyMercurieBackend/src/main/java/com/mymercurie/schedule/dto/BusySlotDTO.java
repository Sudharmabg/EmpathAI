package com.mymercurie.schedule.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusySlotDTO {

    // "Monday" | "Tuesday" ... "Sunday" — used when recurring, or informational when one-time
    private String day;

    // "HH:MM" 24hr format
    private String startTime;

    // "HH:MM" 24hr format
    private String endTime;

    // What the student does during this time
    private String reason;

    // true/null = repeats every week on `day`. false = applies only to `date` below.
    // Boxed Boolean so missing JSON (old saved records) is treated as recurring via isEffectivelyRecurring().
    private Boolean recurring;

    // ISO "yyyy-MM-dd" — only set when recurring = false
    private String date;

    // Helper: treats null (legacy data, before this field existed) as recurring=true
    public boolean isEffectivelyRecurring() {
        return recurring == null || recurring;
    }
}