package com.empathai.schedule.service;

import com.empathai.schedule.dto.*;

public interface IWeekScheduleService {

    // Save or update student's onboarding preferences
    StudentSchedulePreferenceResponse savePreferences(
            StudentSchedulePreferenceRequest request);

    // Get student's saved preferences
    StudentSchedulePreferenceResponse getPreferences(Long studentId);

    // Check if student has completed onboarding
    boolean hasCompletedOnboarding(Long studentId);

    // Generate full-week schedule using preferences + existing rule engine
    WeekScheduleResponseDTO generateWeekSchedule(WeekScheduleRequestDTO request);
}