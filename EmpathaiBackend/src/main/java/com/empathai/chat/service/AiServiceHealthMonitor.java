package com.empathai.chat.service;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiServiceHealthMonitor {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${chatbot.ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Getter
    private volatile boolean healthy = false;
    
    @Getter
    private volatile String lastStatusMessage = "Unchecked";

    @Scheduled(fixedRate = 1800000) // Pings every 30 minutes
    public void checkHealth() {
        try {
            String url = aiServiceUrl + "/health";
            Map<?, ?> response = restTemplate.getForObject(url, Map.class);
            if (response != null && "ok".equalsIgnoreCase(String.valueOf(response.get("status")))) {
                healthy = true;
                lastStatusMessage = "Healthy";
            } else {
                healthy = false;
                lastStatusMessage = "Invalid response from AI service";
            }
        } catch (Exception e) {
            healthy = false;
            lastStatusMessage = "AI service is unreachable: " + e.getMessage();
            log.warn("AI service health check failed: {}", e.getMessage());
        }
    }
}
