package com.empathai.assessment.controller;

import com.empathai.assessment.dto.AnswerOptionRequest;
import com.empathai.assessment.dto.AssessmentReportRequest;
import com.empathai.assessment.dto.AnswerOptionResponse;
import com.empathai.assessment.dto.AssessmentReportResponse;
import com.empathai.assessment.service.AnswerOptionService;
import com.empathai.assessment.service.AssessmentReportService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/assessment")
@RequiredArgsConstructor
public class AnswerOptionController {

    private static final Logger log = LoggerFactory.getLogger(AnswerOptionController.class);

    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.core.env.Environment env;

    private final AnswerOptionService answerOptionService;
    private final AssessmentReportService reportService;
    private final com.empathai.assessment.service.ChromaDBService chromaDBService;

    // ── Answer Options ─────────────────────────────────────────────────────────


    @PostMapping("/answer-options")
    public ResponseEntity<AnswerOptionResponse> saveAnswerOption(
            @RequestBody AnswerOptionRequest request) {
        log.info("saveAnswerOption questionId={} option='{}'",
                request.getQuestionId(), request.getOptionLabel());
        try {
            AnswerOptionResponse saved = answerOptionService.saveOption(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            log.error("saveAnswerOption failed: {}", e.getMessage(), e);
            throw e;
        }
    }


    @PostMapping("/answer-options/batch")
    public ResponseEntity<List<AnswerOptionResponse>> saveAnswerOptionsBatch(
            @RequestBody List<AnswerOptionRequest> requests) {
        log.info("saveAnswerOptionsBatch count={}", requests.size());
        try {
            List<AnswerOptionResponse> saved = answerOptionService.saveOptions(requests);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            log.error("saveAnswerOptionsBatch failed: {}", e.getMessage(), e);
            throw e;
        }
    }


    @GetMapping("/answer-options/{questionId}")
    public ResponseEntity<List<AnswerOptionResponse>> getAnswerOptions(
            @PathVariable Long questionId) {
        log.info("getAnswerOptions questionId={}", questionId);
        return ResponseEntity.ok(answerOptionService.getByQuestionId(questionId));
    }


    @PostMapping("/answer-options/pregenerate")
    public ResponseEntity<Map<String, String>> triggerPregeneration() {
        log.info("triggerPregeneration requested");
        answerOptionService.pregenerateAllMissingBullets();
        return ResponseEntity.accepted().body(
                Map.of("status", "Pre-generation triggered in background")
        );
    }

    // ── Report Generation ─────────────────────────────────────────────────────


    @PostMapping("/reports/generate")
    public ResponseEntity<com.empathai.assessment.dto.AssessmentReportResponse> generateReport(
            @RequestBody AssessmentReportRequest request) {
        log.info("generateReport student={} group={}", request.getStudentId(), request.getGroupId());
        try {
            AssessmentReportResponse report = reportService.generateReport(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(report);
        } catch (Exception e) {
            log.error("generateReport failed: {}", e.getMessage(), e);
            throw e;
        }
    }


    @GetMapping("/reports/student/{studentId}/group/{groupId}")
    public ResponseEntity<AssessmentReportResponse> getReport(
            @PathVariable String studentId,
            @PathVariable Long groupId) {
        return reportService.getReport(studentId, groupId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }


    @DeleteMapping("/reports/student/{studentId}/group/{groupId}/today")
    public ResponseEntity<Void> deleteTodayReport(
            @PathVariable String studentId,
            @PathVariable Long groupId) {
        log.info("deleteTodayReport student={} group={}", studentId, groupId);
        reportService.deleteTodayReport(studentId, groupId);
        return ResponseEntity.noContent().build();  // 204 — always succeeds
    }


    @GetMapping("/reports/class/{className}")
    public ResponseEntity<List<AssessmentReportResponse>> getReportsByClass(
            @PathVariable String className) {
        return ResponseEntity.ok(reportService.getReportsByClass(className));
    }

    @GetMapping("/reports/group/{groupId}")
    public ResponseEntity<List<AssessmentReportResponse>> getReportsByGroup(
            @PathVariable Long groupId) {
        return ResponseEntity.ok(reportService.getReportsByGroup(groupId));
    }




    @PostMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchProfiles(
            @RequestBody Map<String, Object> request) {
        String query     = (String) request.getOrDefault("query", "");
        int    topN      = (int)    request.getOrDefault("topN", 10);
        String className = (String) request.get("className");

        Map<String, Object> whereFilter = null;
        if (className != null && !className.isBlank()) {
            whereFilter = Map.of("className", className);
        }

        log.info("searchProfiles query='{}' topN={} class={}", query, topN, className);
        List<Map<String, Object>> results =
                chromaDBService.searchStudentProfiles(query, topN, whereFilter);
        return ResponseEntity.ok(results);
    }


    @GetMapping("/debug/openai")
    public ResponseEntity<Map<String, String>> debugOpenAi() {
        String apiKey = env.getProperty("openai.api.key", "");
        if (apiKey.isBlank()) {
            return ResponseEntity.ok(Map.of("status", "FAIL", "reason", "openai.api.key is blank in application.properties"));
        }
        try {
            var restTemplate = new org.springframework.web.client.RestTemplate();
            var headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);
            var body = java.util.Map.of(
                    "model", "gpt-4o",
                    "max_tokens", 50,
                    "messages", java.util.List.of(java.util.Map.of("role","user","content","Say: OK"))
            );
            var response = restTemplate.postForEntity(
                    "https://api.openai.com/v1/chat/completions",
                    new org.springframework.http.HttpEntity<>(body, headers),
                    java.util.Map.class
            );
            var choices = (java.util.List<java.util.Map<String,Object>>) response.getBody().get("choices");
            String text = (String)((java.util.Map<String,Object>)choices.get(0).get("message")).get("content");
            return ResponseEntity.ok(Map.of("status", "OK", "response", text));
        } catch (Exception e) {
            String detail = e instanceof org.springframework.web.client.HttpClientErrorException ex
                    ? ex.getResponseBodyAsString() : e.getMessage();
            return ResponseEntity.ok(Map.of("status", "FAIL", "error", detail));
        }
    }

}