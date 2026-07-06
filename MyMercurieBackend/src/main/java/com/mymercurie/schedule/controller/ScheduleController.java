package com.mymercurie.schedule.controller;

import com.mymercurie.user.dto.common.ApiResponse;
import com.mymercurie.schedule.dto.*;
import com.mymercurie.schedule.service.IScheduleService;
import com.mymercurie.schedule.service.IRecommendationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    // ── Get all tasks for a student on a specific date ─────────────────────────
    @GetMapping("/{studentId}/day/{date}")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasksForDate(
            @PathVariable Long studentId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        logger.info("getTasksForDate started for studentId={}, date={}", studentId, date);
        try {
            List<TaskResponse> tasks = scheduleService.getTasksForDate(studentId, date);
            ResponseEntity<ApiResponse<List<TaskResponse>>> result = ResponseEntity.ok(ApiResponse.success(tasks, "Tasks fetched for " + date));
            logger.info("getTasksForDate completed successfully for studentId={}, date={}", studentId, date);
            return result;
        } catch (Exception e) {
            logger.error("getTasksForDate failed for studentId={}, date={}: {}", studentId, date, e.getMessage(), e);
            throw e;
        }
    }

    // ── Get full month schedule for a student ───────────────────────────────────
    @GetMapping("/{studentId}/month")
    public ResponseEntity<ApiResponse<Map<String, List<TaskResponse>>>> getMonthTasks(
            @PathVariable Long studentId,
            @RequestParam int year,
            @RequestParam int month) {
        logger.info("getMonthTasks started for studentId={}, year={}, month={}", studentId, year, month);
        try {
            Map<LocalDate, List<TaskResponse>> monthMap =
                    scheduleService.getMonthTasks(studentId, YearMonth.of(year, month));
            Map<String, List<TaskResponse>> response = monthMap.entrySet().stream()
                    .collect(Collectors.toMap(
                            e -> e.getKey().toString(), Map.Entry::getValue,
                            (a, b) -> a, LinkedHashMap::new));
            ResponseEntity<ApiResponse<Map<String, List<TaskResponse>>>> result = ResponseEntity.ok(ApiResponse.success(response, "Month schedule fetched."));
            logger.info("getMonthTasks completed successfully for studentId={}", studentId);
            return result;
        } catch (Exception e) {
            logger.error("getMonthTasks failed for studentId={}: {}", studentId, e.getMessage(), e);
            throw e;
        }
    }

    // =========================================================================
    // RECOMMENDATIONS — single call returns blocked times, exams, suggestions
    // =========================================================================

    @GetMapping("/{studentId}/recommendations")
    public ResponseEntity<ApiResponse<ScheduleRecommendationResponse>> getRecommendations(
            @PathVariable Long studentId,
            @RequestParam(defaultValue = "Monday") String day,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        logger.info("getRecommendations started for studentId={}, day={}, date={}", studentId, day, date);
        try {
            LocalDate effectiveDate = date != null ? date : LocalDate.now();
            ScheduleRecommendationResponse response = recommendationService.getRecommendations(studentId, day, effectiveDate);
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