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
    private long openFlaggedChats;

    private java.util.List<ScheduleStat> scheduleStats;
    private java.util.Map<String, Long> moodStats; // Keep this for now just in case
    private java.util.List<DailyMoodStat> dailyMoods;
    private SleepStat sleepStats;
    private InterventionStat interventionStats;

    @Getter
    @Builder
    public static class DailyMoodStat {
        private String date; // "YYYY-MM-DD"
        private String predominantMood;
    }

    @Getter
    @Builder
    public static class ScheduleStat {
        private String date; // "YYYY-MM-DD"
        private long created;
        private long completed;
    }

    @Getter
    @Builder
    public static class SleepStat {
        private double averageHours;
    }

    @Getter
    @Builder
    public static class InterventionStat {
        private long totalCount;
        private java.util.Map<String, Long> countByType;
    }
}