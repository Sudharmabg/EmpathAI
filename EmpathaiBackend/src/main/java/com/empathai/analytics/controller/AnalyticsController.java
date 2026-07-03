package com.empathai.analytics.controller;

import com.empathai.analytics.dto.AnalyticsDashboardResponse;
import com.empathai.analytics.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.empathai.analytics.dto.AnalysisRequest;
import com.empathai.analytics.dto.AnalysisResult;
import com.empathai.analytics.service.AIAnalysisService;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;

@Slf4j
@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {
    private final AIAnalysisService aiAnalysisService;
    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<AnalyticsDashboardResponse> getDashboard(
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        log.info("GET /api/analytics/dashboard called with studentId={} and weekStart={}", studentId, weekStart);
        try {
            AnalyticsDashboardResponse response = analyticsService.getDashboard(studentId, weekStart);
            log.info("GET /api/analytics/dashboard completed successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("GET /api/analytics/dashboard failed: {}", e.getMessage(), e);
            throw e;
        }
    }
    @PostMapping("/analyze")
    public ResponseEntity<AnalysisResult> analyze(@RequestBody AnalysisRequest request) {
        log.info("POST /api/analytics/analyze called for studentId={}", request.getStudentId());
        AnalysisResult result = aiAnalysisService.analyzeStudentAnswers(request);
        return ResponseEntity.ok(result);
    }
}