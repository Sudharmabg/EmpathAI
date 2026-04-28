package com.empathai.analytics.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AnalyticsDashboardResponse {
    private long totalStudents;
    private long totalAssessments;
    private long totalPsychologists;
    private long totalSchools;
}