package com.empathai.schedule.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchoolTimingResponse {
    private Long id;
    private String className;
    private String dayOfWeek;
    private String startTime;
    private String endTime;
}