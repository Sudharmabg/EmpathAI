package com.empathai.schedule.controller;

import com.empathai.user.dto.common.ApiResponse;
import com.empathai.schedule.dto.*;
import com.empathai.schedule.service.IWeekScheduleService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
public class WeekScheduleController {

    private static final Logger logger =
            LoggerFactory.getLogger(WeekScheduleController.class);

    private final IWeekScheduleService weekScheduleService;

    // ── Save onboarding preferences ───────────────────────────────────────────
    @PostMapping("/preferences")
    public ResponseEntity<ApiResponse<StudentSchedulePreferenceResponse>> savePreferences(
            @RequestBody StudentSchedulePreferenceRequest request) {

        logger.info("savePreferences started for studentId={}", request.getStudentId());
        try {
            StudentSchedulePreferenceResponse response =
                    weekScheduleService.savePreferences(request);
            ResponseEntity<ApiResponse<StudentSchedulePreferenceResponse>> result =
                    ResponseEntity.ok(ApiResponse.success(
                            response, "Preferences saved successfully."));
            logger.info("savePreferences completed for studentId={}", request.getStudentId());
            return result;
        } catch (Exception e) {
            logger.error("savePreferences failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    // ── Get saved preferences ─────────────────────────────────────────────────
    @GetMapping("/preferences/{studentId}")
    public ResponseEntity<ApiResponse<StudentSchedulePreferenceResponse>> getPreferences(
            @PathVariable Long studentId) {

        logger.info("getPreferences started for studentId={}", studentId);
        try {
            StudentSchedulePreferenceResponse response =
                    weekScheduleService.getPreferences(studentId);
            ResponseEntity<ApiResponse<StudentSchedulePreferenceResponse>> result =
                    ResponseEntity.ok(ApiResponse.success(
                            response, "Preferences fetched."));
            logger.info("getPreferences completed for studentId={}", studentId);
            return result;
        } catch (Exception e) {
            logger.error("getPreferences failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    // ── Check onboarding status ───────────────────────────────────────────────
    @GetMapping("/preferences/{studentId}/status")
    public ResponseEntity<ApiResponse<Boolean>> getOnboardingStatus(
            @PathVariable Long studentId) {

        logger.info("getOnboardingStatus started for studentId={}", studentId);
        try {
            boolean completed = weekScheduleService.hasCompletedOnboarding(studentId);
            ResponseEntity<ApiResponse<Boolean>> result =
                    ResponseEntity.ok(ApiResponse.success(
                            completed, "Onboarding status fetched."));
            logger.info("getOnboardingStatus completed for studentId={}", studentId);
            return result;
        } catch (Exception e) {
            logger.error("getOnboardingStatus failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    // ── Generate full week schedule ───────────────────────────────────────────
    @PostMapping("/generate-week")
    public ResponseEntity<ApiResponse<WeekScheduleResponseDTO>> generateWeekSchedule(
            @RequestBody WeekScheduleRequestDTO request) {

        logger.info("generateWeekSchedule started for studentId={}", request.getStudentId());
        try {
            WeekScheduleResponseDTO response =
                    weekScheduleService.generateWeekSchedule(request);
            ResponseEntity<ApiResponse<WeekScheduleResponseDTO>> result =
                    ResponseEntity.ok(ApiResponse.success(
                            response, "Week schedule generated successfully."));
            logger.info("generateWeekSchedule completed for studentId={} — activeDays={} totalStudyMins={}",
                    request.getStudentId(), response.getActiveDays(),
                    response.getTotalStudyMinutes());
            return result;
        } catch (Exception e) {
            logger.error("generateWeekSchedule failed: {}", e.getMessage(), e);
            throw e;
        }
    }
}