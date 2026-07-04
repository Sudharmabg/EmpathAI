package com.mymercurie.assessment.controller;

import com.mymercurie.assessment.service.LlmMetricsTracker;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class MetricsController {

    private final LlmMetricsTracker metricsTracker;

    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getMetrics() {
        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("llm_calls_success_total", metricsTracker.getSuccessCount());
        metrics.put("llm_calls_failure_total", metricsTracker.getFailureCount());
        metrics.put("llm_calls_total", metricsTracker.getTotalCalls());
        metrics.put("llm_calls_latency_avg_ms", metricsTracker.getAverageLatencyMs());
        return ResponseEntity.ok(metrics);
    }
}
