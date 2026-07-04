package com.mymercurie.chat.controller;

import com.mymercurie.chat.service.AiServiceHealthMonitor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final AiServiceHealthMonitor healthMonitor;

    @GetMapping("/ai-service")
    public ResponseEntity<Map<String, Object>> getAiServiceHealth() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("healthy", healthMonitor.isHealthy());
        status.put("status", healthMonitor.isHealthy() ? "UP" : "DOWN");
        status.put("message", healthMonitor.getLastStatusMessage());
        return ResponseEntity.ok(status);
    }
}
