package com.mymercurie.schedule.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchoolTimingRequest {
    private Long schoolId;
    private String className;
    private String dayOfWeek;
    private String startTime;
    private String endTime;
}