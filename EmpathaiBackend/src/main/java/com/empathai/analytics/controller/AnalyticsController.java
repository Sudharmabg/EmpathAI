package com.empathai.analytics.controller;

import com.empathai.analytics.dto.AnalyticsDashboardResponse;
import com.empathai.analytics.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<AnalyticsDashboardResponse> getDashboard() {
        log.info("GET /api/analytics/dashboard called");
        try {
            AnalyticsDashboardResponse response = analyticsService.getDashboard();
            log.info("GET /api/analytics/dashboard completed successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("GET /api/analytics/dashboard failed: {}", e.getMessage(), e);
            throw e;
        }
    }
}