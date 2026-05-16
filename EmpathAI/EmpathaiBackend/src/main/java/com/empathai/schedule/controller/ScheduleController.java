package com.empathai.schedule.controller;

import com.empathai.user.dto.common.ApiResponse;
import com.empathai.schedule.dto.*;
import com.empathai.schedule.service.IScheduleService;
import com.empathai.schedule.service.IRecommendationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schedule")
@RequiredArgsConstructor
public class ScheduleController {

    private static final Logger logger = LoggerFactory.getLogger(ScheduleController.class);

    private final IScheduleService scheduleService;
    private final IRecommendationService recommendationService;

    // ── Add a new task ────────────────────────────────────────────────────────
    @PostMapping("/task")
    public ResponseEntity<ApiResponse<TaskResponse>> addTask(@RequestBody TaskRequest request) {
        logger.info("addTask started");
        try {
            TaskResponse response = scheduleService.addTask(request);
            ResponseEntity<ApiResponse<TaskResponse>> result = ResponseEntity.ok(ApiResponse.success(response, "Task added successfully."));
            logger.info("addTask completed successfully");
            return result;
        } catch (Exception e) {
            logger.error("addTask failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    // ── Edit an existing task ─────────────────────────────────────────────────
    @PutMapping("/task/{taskId}")
    public ResponseEntity<ApiResponse<TaskResponse>> editTask(
            @PathVariable Long taskId,
            @RequestBody TaskRequest request) {
        logger.info("editTask started for taskId={}", taskId);
        try {
            TaskResponse response = scheduleService.editTask(taskId, request);
            ResponseEntity<ApiResponse<TaskResponse>> result = ResponseEntity.ok(ApiResponse.success(response, "Task updated successfully."));
            logger.info("editTask completed successfully for taskId={}", taskId);
            return result;
        } catch (Exception e) {
            logger.error("editTask failed for taskId={}: {}", taskId, e.getMessage(), e);
            throw e;
        }
    }

    // ── Toggle task completion ────────────────────────────────────────────────
    @PatchMapping("/task/{taskId}/complete")
    public ResponseEntity<ApiResponse<TaskResponse>> toggleComplete(@PathVariable Long taskId) {
        logger.info("toggleComplete started for taskId={}", taskId);
        try {
            TaskResponse response = scheduleService.toggleComplete(taskId);
            ResponseEntity<ApiResponse<TaskResponse>> result = ResponseEntity.ok(ApiResponse.success(response, "Task completion toggled."));
            logger.info("toggleComplete completed successfully for taskId={}", taskId);
            return result;
        } catch (Exception e) {
            logger.error("toggleComplete failed for taskId={}: {}", taskId, e.getMessage(), e);
            throw e;
        }
    }

    // ── Delete a task ─────────────────────────────────────────────────────────
    @DeleteMapping("/task/{taskId}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(@PathVariable Long taskId) {
        logger.info("deleteTask started for taskId={}", taskId);
        try {
            scheduleService.deleteTask(taskId);
            ResponseEntity<ApiResponse<Void>> result = ResponseEntity.ok(ApiResponse.success(null, "Task deleted successfully."));
            logger.info("deleteTask completed successfully for taskId={}", taskId);
            return result;
        } catch (Exception e) {
            logger.error("deleteTask failed for taskId={}: {}", taskId, e.getMessage(), e);
            throw e;
        }
    }

    // ── Get all tasks for a student on a specific day ─────────────────────────
    @GetMapping("/{studentId}/{day}")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getDayTasks(
            @PathVariable Long studentId,
            @PathVariable String day) {
        logger.info("getDayTasks started for studentId={}, day={}", studentId, day);
        try {
            List<TaskResponse> tasks = scheduleService.getTasksForDay(studentId, day);
            ResponseEntity<ApiResponse<List<TaskResponse>>> result = ResponseEntity.ok(ApiResponse.success(tasks, "Tasks fetched for " + day));
            logger.info("getDayTasks completed successfully for studentId={}, day={}", studentId, day);
            return result;
        } catch (Exception e) {
            logger.error("getDayTasks failed for studentId={}, day={}: {}", studentId, day, e.getMessage(), e);
            throw e;
        }
    }

    // ── Get full week schedule for a student ──────────────────────────────────
    @GetMapping("/{studentId}/week")
    public ResponseEntity<ApiResponse<Map<String, List<TaskResponse>>>> getWeekTasks(
            @PathVariable Long studentId) {
        logger.info("getWeekTasks started for studentId={}", studentId);
        try {
            Map<String, List<TaskResponse>> week = scheduleService.getWeekTasks(studentId);
            ResponseEntity<ApiResponse<Map<String, List<TaskResponse>>>> result = ResponseEntity.ok(ApiResponse.success(week, "Full week schedule fetched."));
            logger.info("getWeekTasks completed successfully for studentId={}", studentId);
            return result;
        } catch (Exception e) {
            logger.error("getWeekTasks failed for studentId={}: {}", studentId, e.getMessage(), e);
            throw e;
        }
    }

    // =========================================================================
    // RECOMMENDATIONS — single call returns blocked times, exams, suggestions
    // =========================================================================

    @GetMapping("/{studentId}/recommendations")
    public ResponseEntity<ApiResponse<ScheduleRecommendationResponse>> getRecommendations(
            @PathVariable Long studentId,
            @RequestParam(defaultValue = "Monday") String day) {
        logger.info("getRecommendations started for studentId={}, day={}", studentId, day);
        try {
            ScheduleRecommendationResponse response = recommendationService.getRecommendations(studentId, day);
            ResponseEntity<ApiResponse<ScheduleRecommendationResponse>> result = ResponseEntity.ok(ApiResponse.success(response, "Recommendations fetched."));
            logger.info("getRecommendations completed successfully for studentId={}, day={}", studentId, day);
            return result;
        } catch (Exception e) {
            logger.error("getRecommendations failed for studentId={}, day={}: {}", studentId, day, e.getMessage(), e);
            throw e;
        }
    }

    // =========================================================================
    // SCHOOL TIMINGS — admin sets blocked school hours per school
    // =========================================================================

    @PostMapping("/school-timings/{schoolId}")
    public ResponseEntity<ApiResponse<List<SchoolTimingResponse>>> saveSchoolTimings(
            @PathVariable Long schoolId,
            @RequestBody List<SchoolTimingRequest> requests) {
        logger.info("saveSchoolTimings started for schoolId={}", schoolId);
        try {
            List<SchoolTimingResponse> saved = recommendationService.saveSchoolTimings(schoolId, requests);
            ResponseEntity<ApiResponse<List<SchoolTimingResponse>>> result = ResponseEntity.ok(ApiResponse.success(saved, "School timings saved."));
            logger.info("saveSchoolTimings completed successfully for schoolId={}", schoolId);
            return result;
        } catch (Exception e) {
            logger.error("saveSchoolTimings failed for schoolId={}: {}", schoolId, e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/school-timings/{schoolId}")
    public ResponseEntity<ApiResponse<List<SchoolTimingResponse>>> getSchoolTimings(
            @PathVariable Long schoolId) {
        logger.info("getSchoolTimings started for schoolId={}", schoolId);
        try {
            List<SchoolTimingResponse> timings = recommendationService.getSchoolTimings(schoolId);
            ResponseEntity<ApiResponse<List<SchoolTimingResponse>>> result = ResponseEntity.ok(ApiResponse.success(timings, "School timings fetched."));
            logger.info("getSchoolTimings completed successfully for schoolId={}", schoolId);
            return result;
        } catch (Exception e) {
            logger.error("getSchoolTimings failed for schoolId={}: {}", schoolId, e.getMessage(), e);
            throw e;
        }
    }

    // =========================================================================
    // EXAM DATES — admin adds upcoming exam dates
    // =========================================================================

    @PostMapping("/exam-dates")
    public ResponseEntity<ApiResponse<ExamDateResponse>> addExamDate(
            @RequestBody ExamDateRequest request) {
        logger.info("addExamDate started");
        try {
            ExamDateResponse response = recommendationService.saveExamDate(request);
            ResponseEntity<ApiResponse<ExamDateResponse>> result = ResponseEntity.ok(ApiResponse.success(response, "Exam date added."));
            logger.info("addExamDate completed successfully");
            return result;
        } catch (Exception e) {
            logger.error("addExamDate failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/exam-dates/{schoolId}")
    public ResponseEntity<ApiResponse<List<ExamDateResponse>>> getExamDates(
            @PathVariable Long schoolId) {
        logger.info("getExamDates started for schoolId={}", schoolId);
        try {
            List<ExamDateResponse> exams = recommendationService.getExamDatesBySchool(schoolId);
            ResponseEntity<ApiResponse<List<ExamDateResponse>>> result = ResponseEntity.ok(ApiResponse.success(exams, "Exam dates fetched."));
            logger.info("getExamDates completed successfully for schoolId={}", schoolId);
            return result;
        } catch (Exception e) {
            logger.error("getExamDates failed for schoolId={}: {}", schoolId, e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/exam-dates/{examId}")
    public ResponseEntity<ApiResponse<Void>> deleteExamDate(@PathVariable Long examId) {
        logger.info("deleteExamDate started for examId={}", examId);
        try {
            recommendationService.deleteExamDate(examId);
            ResponseEntity<ApiResponse<Void>> result = ResponseEntity.ok(ApiResponse.success(null, "Exam date deleted."));
            logger.info("deleteExamDate completed successfully for examId={}", examId);
            return result;
        } catch (Exception e) {
            logger.error("deleteExamDate failed for examId={}: {}", examId, e.getMessage(), e);
            throw e;
        }
    }
}