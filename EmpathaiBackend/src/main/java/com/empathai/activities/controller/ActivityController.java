package com.empathai.activities.controller;

import com.empathai.activities.dto.StudentGoalRequest;
import com.empathai.activities.dto.StudentGoalResponse;
import com.empathai.activities.service.IActivityService;
import com.empathai.user.dto.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {

    private static final Logger logger = LoggerFactory.getLogger(ActivityController.class);

    private final IActivityService activityService;

    // ── Save a new goal ───────────────────────────────────────────────────────
    // POST /api/activities/goals
    // Called from frontend Activities → Goal Setting when student adds a goal
    @PostMapping("/goals")
    public ResponseEntity<ApiResponse<StudentGoalResponse>> saveGoal(
            @RequestBody StudentGoalRequest request) {
        logger.info("saveGoal started");
        try {
            StudentGoalResponse response = activityService.saveGoal(request);
            ResponseEntity<ApiResponse<StudentGoalResponse>> result = ResponseEntity.ok(ApiResponse.success(response, "Goal saved successfully."));
            logger.info("saveGoal completed successfully");
            return result;
        } catch (Exception e) {
            logger.error("saveGoal failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    // ── Get all active goals for a student ────────────────────────────────────
    // GET /api/activities/goals/{studentId}
    // Called from frontend when loading Goals and also by RecommendationService
    @GetMapping("/goals/{studentId}")
    public ResponseEntity<ApiResponse<List<StudentGoalResponse>>> getGoals(
            @PathVariable Long studentId) {
        logger.info("getGoals started for studentId={}", studentId);
        try {
            List<StudentGoalResponse> goals = activityService.getGoals(studentId);
            ResponseEntity<ApiResponse<List<StudentGoalResponse>>> result = ResponseEntity.ok(ApiResponse.success(goals, "Goals fetched successfully."));
            logger.info("getGoals completed successfully for studentId={}", studentId);
            return result;
        } catch (Exception e) {
            logger.error("getGoals failed for studentId={}: {}", studentId, e.getMessage(), e);
            throw e;
        }
    }

    // ── Delete a specific goal ────────────────────────────────────────────────
    // DELETE /api/activities/goals/{studentId}/{goalId}
    // Called when student removes a goal from their list
    @DeleteMapping("/goals/{studentId}/{goalId}")
    public ResponseEntity<ApiResponse<Void>> deleteGoal(
            @PathVariable Long studentId,
            @PathVariable Long goalId) {
        logger.info("deleteGoal started for studentId={}, goalId={}", studentId, goalId);
        try {
            activityService.deleteGoal(studentId, goalId);
            ResponseEntity<ApiResponse<Void>> result = ResponseEntity.ok(ApiResponse.success(null, "Goal deleted successfully."));
            logger.info("deleteGoal completed successfully for studentId={}, goalId={}", studentId, goalId);
            return result;
        } catch (Exception e) {
            logger.error("deleteGoal failed for studentId={}, goalId={}: {}", studentId, goalId, e.getMessage(), e);
            throw e;
        }
    }
}