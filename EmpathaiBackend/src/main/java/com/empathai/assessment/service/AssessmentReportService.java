package com.empathai.assessment.service;

import com.empathai.assessment.dto.AssessmentReportRequest;

import com.empathai.assessment.dto.AssessmentReportResponse;
import com.empathai.assessment.entity.AnswerOption;
import com.empathai.assessment.entity.AssessmentReport;
import com.empathai.assessment.entity.AssessmentReportHistory;
import com.empathai.assessment.repository.AssessmentReportRepository;
import com.empathai.assessment.repository.AssessmentReportHistoryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import java.util.Arrays;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;


@Slf4j
@Service
@RequiredArgsConstructor
public class AssessmentReportService {

    private final AssessmentReportRepository reportRepo;
    private final AnswerOptionService answerOptionService;
    private final ChromaDBService chromaDBService;
    private final AssessmentReportHistoryRepository reportHistoryRepo;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${openai.api.key:}")
    private String openaiApiKey;

    private static final String OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODEL = "gpt-4o";

    // ── Generate or return cached report ─────────────────────────────────────
    private String cleanBullets(String raw) {
        if (raw == null) return "";
        return Arrays.stream(raw.split("\n"))
                .map(line -> line.replaceAll("^[•\\-\\s]+", "").trim())
                .filter(line -> !line.isBlank())
                .collect(Collectors.joining("\n"));
    }

    @Transactional
    public AssessmentReportResponse generateReport(AssessmentReportRequest request) {
        LocalDate today = LocalDate.now();

        // Return cached report if it already exists for today AND has real LLM content
        Optional<AssessmentReport> cached = reportRepo.findByStudentIdAndGroupIdAndSessionDate(
                request.getStudentId(), request.getGroupId(), today);
        if (cached.isPresent()) {
            AssessmentReport cachedReport = cached.get();
            boolean hasBullets = cachedReport.getBulletPoints() != null && !cachedReport.getBulletPoints().isBlank();
            boolean hasFallbackSummary = cachedReport.getSummaryText() != null &&
                    cachedReport.getSummaryText().startsWith("Assessment completed. Please speak");
            if (hasBullets && !hasFallbackSummary) {
                log.info("Returning cached report for student={} group={}", request.getStudentId(), request.getGroupId());
                return toResponse(cachedReport);
            }
            // Cached report has fallback content — delete it and regenerate with LLM
            log.info("Cached report has fallback content — deleting and regenerating for student={}", request.getStudentId());
            reportRepo.delete(cachedReport);
        }

        // Build enriched answer list from answer_options table
        List<EnrichedAnswer> enriched = enrichAnswers(request);

        // Try fully-cached path first (no LLM call needed)
        boolean allCached = enriched.stream()
                .allMatch(e -> e.cachedBullets != null && !e.cachedBullets.isBlank());

        String summaryText;
        String bulletPoints;

        if (allCached && !enriched.isEmpty()) {
            log.info("All bullets cached — building report from cache for student={}", request.getStudentId());
            bulletPoints = enriched.stream()
                    .map(e -> cleanBullets(e.cachedBullets))
                    .collect(Collectors.joining("\n\n"));
            summaryText = buildSummaryFromCache(enriched);
        } else {
            // ONE LLM call for the full session
            log.info("Some bullets missing — making single LLM call for student={}", request.getStudentId());
            Map<String, String> llmResult = callLlmForFullReport(request, enriched);
            summaryText  = llmResult.getOrDefault("summary",  "Assessment completed.");
            bulletPoints = llmResult.getOrDefault("bullets", "");
        }

        // Serialize answers to JSON for storage
        String answersJson = serializeAnswers(enriched);

        AssessmentReport report = AssessmentReport.builder()
                .studentId(request.getStudentId())
                .studentName(request.getStudentName())
                .groupId(request.getGroupId())
                .groupName(request.getGroupName())
                .className(request.getClassName())
                .sessionDate(today)
                .answersJson(answersJson)
                .summaryText(summaryText)
                .bulletPoints(bulletPoints)
                .chromaSynced(false)
                .build();

        AssessmentReport saved = reportRepo.save(report);
        log.info("Saved assessment report id={} for student={}", saved.getId(), saved.getStudentId());

        // Async ChromaDB sync
        syncToChromaAsync(saved);

        return toResponse(saved);
    }

    public Optional<AssessmentReportResponse> getReport(String studentId, Long groupId) {
        return reportRepo
                .findByStudentIdAndGroupIdAndSessionDate(studentId, groupId, LocalDate.now())
                .map(this::toResponse);
    }

    public List<AssessmentReportResponse> getReportsByClass(String className) {
        return reportRepo.findByClassNameOrderByCreatedAtDesc(className)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<AssessmentReportResponse> getReportsByGroup(Long groupId) {
        return reportRepo.findByGroupIdOrderByCreatedAtDesc(groupId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Enrichment ────────────────────────────────────────────────────────────


    private List<EnrichedAnswer> enrichAnswers(AssessmentReportRequest request) {
        List<Long> questionIds = request.getAnswers().stream()
                .map(AssessmentReportRequest.AnswerEntry::getQuestionId)
                .collect(Collectors.toList());

        Map<Long, List<AnswerOption>> optionsMap =
                answerOptionService.getOptionsMapForQuestions(questionIds);

        List<EnrichedAnswer> result = new ArrayList<>();
        for (AssessmentReportRequest.AnswerEntry entry : request.getAnswers()) {
            List<AnswerOption> opts = optionsMap.getOrDefault(entry.getQuestionId(), List.of());
            AnswerOption matched = opts.stream()
                    .filter(o -> o.getOptionLabel().trim().equalsIgnoreCase(entry.getSelectedOption().trim()))
                    .findFirst()
                    .orElse(null);

            EnrichedAnswer ea = new EnrichedAnswer();
            ea.questionId    = entry.getQuestionId();
            ea.questionText  = entry.getQuestionText();
            ea.selectedOption = entry.getSelectedOption();
            if (matched != null) {
                ea.rangeValue     = matched.getRangeValue();
                ea.overallMeaning = matched.getOverallMeaning();
                ea.interpretation = matched.getInterpretation();
                ea.tag            = matched.getTag();
                ea.cachedBullets  = matched.getCachedBullets();
            }
            result.add(ea);
        }
        return result;
    }

    // ── LLM (single call per session) ────────────────────────────────────────

    private Map<String, String> callLlmForFullReport(
            AssessmentReportRequest request,
            List<EnrichedAnswer> enriched) {

        Map<String, String> fallback = new LinkedHashMap<>();
        fallback.put("summary", "Assessment completed. Please speak with your teacher or counsellor for detailed feedback.");
        fallback.put("bullets", "");

        if (openaiApiKey == null || openaiApiKey.isBlank()) {
            log.warn("OPENAI_API_KEY not set — returning fallback report");
            return fallback;
        }

        String prompt = buildFullReportPrompt(request, enriched);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + openaiApiKey);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", MODEL);
        body.put("max_tokens", 1000);
        body.put("messages", List.of(Map.of("role", "user", "content", prompt)));

        int maxRetries = 3;
        int attempt = 0;
        long backoffMs = 1000;

        while (attempt < maxRetries) {
            try {
                attempt++;
                ResponseEntity<Map> response = restTemplate.postForEntity(
                        OPENAI_API_URL, new HttpEntity<>(body, headers), Map.class);

                if (response.getBody() != null) {
                    List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                    if (choices != null && !choices.isEmpty()) {
                        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                        String raw = (String) message.get("content");
                        return parseReportText(raw);
                    }
                }
                throw new RuntimeException("Unsuccessful response or empty body");
            } catch (Exception e) {
                log.warn("OpenAI full report call failed on attempt {}/{} for student={}: {}", 
                        attempt, maxRetries, request.getStudentId(), e.getMessage());
                if (attempt >= maxRetries) {
                    log.error("All retries exhausted for full report generation: {}", e.getMessage());
                    if (e instanceof org.springframework.web.client.HttpClientErrorException httpEx) {
                        log.error("OpenAI error response body: {}", httpEx.getResponseBodyAsString());
                    }
                } else {
                    long jitter = (long) (Math.random() * 200);
                    long sleepTime = (backoffMs * (1L << (attempt - 1))) + jitter;
                    try {
                        Thread.sleep(sleepTime);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Retry sleep interrupted", ie);
                    }
                }
            }
        }
        return fallback;
    }

    private String buildFullReportPrompt(AssessmentReportRequest request, List<EnrichedAnswer> enriched) {
        String studentName = request.getStudentName();
        StringBuilder sb = new StringBuilder();
        sb.append("You are a compassionate school psychologist generating a student wellbeing report.\n\n");
        sb.append("Student: ").append(studentName != null ? studentName : "the student").append("\n\n");
        sb.append("Assessment answers:\n\n");

        for (int i = 0; i < enriched.size(); i++) {
            EnrichedAnswer ea = enriched.get(i);
            sb.append(String.format("Q%d: %s\n", i + 1, ea.questionText));
            sb.append(String.format("   Student answered: %s\n", ea.selectedOption));
            if (ea.overallMeaning != null && !ea.overallMeaning.isBlank())
                sb.append(String.format("   Meaning: %s\n", ea.overallMeaning));
            if (ea.interpretation != null && !ea.interpretation.isBlank())
                sb.append(String.format("   Interpretation: %s\n", ea.interpretation));
            if (ea.tag != null && !ea.tag.isBlank())
                sb.append(String.format("   Domain: %s\n", ea.tag));
            sb.append("\n");
        }
        if (enriched.isEmpty()) {
            for (AssessmentReportRequest.AnswerEntry entry : request.getAnswers()) {
                sb.append(String.format("Q: %s\n", entry.getQuestionText()));
                sb.append(String.format("   Student answered: %s\n\n", entry.getSelectedOption()));
            }
        }

        sb.append("""
            Respond ONLY with a JSON object. No markdown, no extra text, no explanations.
            Format:
            {
              "summary": "2 warm supportive sentences about the student.",
              "strengths": ["✅ Full 2-sentence strength referencing the student's specific answer (max 35 words)"],
              "improvements": ["🔹 Full 2-sentence area to improve referencing the specific answer (max 35 words)"],
              "tip": "💡 Full 1-2 sentence suggested action the student can do this week (max 25 words)"
            }
            STRICT RULES:
            - strengths[] items MUST start with ✅
            - improvements[] items MUST start with 🔹
            - tip MUST start with 💡
            - Each bullet must reference the SPECIFIC answer content — no generic feedback.
            - Use warm, age-appropriate language. No clinical terms. No disorder labels.
            - 2 items in strengths[], 2 items in improvements[], 1 tip.
            """);
        return sb.toString();
    }

    private Map<String, String> parseReportText(String raw) {
        Map<String, String> result = new LinkedHashMap<>();
        try {
            String json = raw.replaceAll("```json|```", "").trim();

            int start = json.indexOf('{');
            int end   = json.lastIndexOf('}');
            if (start >= 0 && end > start) {
                json = json.substring(start, end + 1);
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = objectMapper.readValue(json, Map.class);

            String summary = (String) parsed.getOrDefault("summary", "");

            StringBuilder bullets = new StringBuilder();
            for (String key : new String[]{"strengths", "improvements"}) {
                Object val = parsed.get(key);
                if (val instanceof java.util.List<?> list) {
                    for (Object item : list) {
                        String clean = item.toString()
                                .replaceAll("^[•\\-\\s]+", "")   // strip bullets/dashes
                                .replaceAll("^[✅🔹💡\\s]+", "")  // strip any leading emoji
                                .trim();
                        if (key.equals("strengths"))    bullets.append("✅ ").append(clean).append("\n");
                        else                            bullets.append("🔹 ").append(clean).append("\n");
                    }
                }
            }
            Object tip = parsed.get("tip");
            if (tip != null) {
                String clean = tip.toString()
                        .replaceAll("^[•\\-\\s]+", "")
                        .replaceAll("^[✅🔹💡\\s]+", "")
                        .trim();
                bullets.append("💡 ").append(clean).append("\n");

            }

            result.put("summary", summary);
            result.put("bullets", bullets.toString().trim());
            result.put("strengths",    parsed.containsKey("strengths")    ? objectMapper.writeValueAsString(parsed.get("strengths"))    : "[]");
            result.put("improvements", parsed.containsKey("improvements") ? objectMapper.writeValueAsString(parsed.get("improvements")) : "[]");
            result.put("tip",          tip != null ? tip.toString() : "");
            return result;
        } catch (Exception e) {
            log.warn("JSON parse failed, falling back to raw text: {}", e.getMessage());
            result.put("summary", "Assessment completed.");
            result.put("bullets", raw.trim());
            return result;
        }
    }

    private String buildSummaryFromCache(List<EnrichedAnswer> enriched) {
        long positiveCount = enriched.stream()
                .filter(e -> "Strength".equalsIgnoreCase(e.tag))
                .count();
        long concernCount = enriched.stream()
                .filter(e -> "Weakness".equalsIgnoreCase(e.tag))
                .count();

        if (concernCount == 0) {
            return "Your responses today reflect a positive and resilient mindset. Keep it up!";
        } else if (positiveCount >= concernCount) {
            return "You show real strengths in several areas. A few topics deserve a bit of extra attention — your teacher or counsellor is here to help.";
        } else {
            return "Your responses today show some areas that may need support. Please feel free to talk to your teacher or school counsellor.";
        }
    }

    // ── ChromaDB Sync (async) ─────────────────────────────────────────────────

    @Async
    public void syncToChromaAsync(AssessmentReport report) {
        try {
            Map<String, String> metadata = new LinkedHashMap<>();
            metadata.put("studentId",   report.getStudentId());
            metadata.put("studentName", report.getStudentName() != null ? report.getStudentName() : "");
            metadata.put("groupId",     String.valueOf(report.getGroupId()));
            metadata.put("groupName",   report.getGroupName() != null ? report.getGroupName() : "");
            metadata.put("className",   report.getClassName() != null ? report.getClassName() : "");
            metadata.put("sessionDate", report.getSessionDate().toString());

            String summaryToSync = report.getEditedSummaryText() != null && !report.getEditedSummaryText().isBlank()
                    ? report.getEditedSummaryText()
                    : (report.getSummaryText() != null ? report.getSummaryText() : "");

            String document = String.format(
                    "Student: %s | Class: %s | Date: %s\n\n%s\n\n%s",
                    report.getStudentName(),
                    report.getClassName(),
                    report.getSessionDate(),
                    summaryToSync,
                    report.getBulletPoints() != null ? report.getBulletPoints() : ""
            );

            String docId = "report_" + report.getId();
            chromaDBService.upsertDocument(docId, document, metadata);

            report.setChromaSynced(true);
            report.setChromaDocId(docId);
            reportRepo.save(report);
            log.info("ChromaDB sync done for report id={}", report.getId());
        } catch (Exception e) {
            log.error("ChromaDB sync failed for report id={}: {}", report.getId(), e.getMessage());

        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String serializeAnswers(List<EnrichedAnswer> enriched) {
        try {
            List<Map<String, String>> list = enriched.stream().map(ea -> {
                Map<String, String> m = new LinkedHashMap<>();
                m.put("questionId",     String.valueOf(ea.questionId));
                m.put("questionText",   ea.questionText);
                m.put("answer",         ea.selectedOption);
                m.put("interpretation", ea.interpretation != null ? ea.interpretation : "");
                m.put("tag",            ea.tag != null ? ea.tag : "");
                return m;
            }).collect(Collectors.toList());
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }

    private AssessmentReportResponse toResponse(AssessmentReport r) {
        return AssessmentReportResponse.builder()
                .id(r.getId())
                .studentId(r.getStudentId())
                .studentName(r.getStudentName())
                .groupId(r.getGroupId())
                .groupName(r.getGroupName())
                .className(r.getClassName())
                .sessionDate(r.getSessionDate())
                .summaryText(r.getSummaryText())
                .bulletPoints(r.getBulletPoints())
                .editedSummaryText(r.getEditedSummaryText())
                .editedBy(r.getEditedBy())
                .confirmed(r.getConfirmed() != null ? r.getConfirmed() : "N")
                .chromaSynced(r.getChromaSynced())
                .createdAt(r.getCreatedAt())
                .build();
    }

    // ── Inner helper class ────────────────────────────────────────────────────

    private static class EnrichedAnswer {
        Long   questionId;
        String questionText;
        String selectedOption;
        String rangeValue;
        String overallMeaning;
        String interpretation;
        String tag;
        String cachedBullets;
    }
    private void saveHistorySnapshot(AssessmentReport report) {
        String summaryTextSnapshot = report.getEditedSummaryText() != null ? report.getEditedSummaryText() : report.getSummaryText();
        String editedBySnapshot = report.getEditedBy() != null ? report.getEditedBy() : "AI";
        LocalDateTime editedAtSnapshot = report.getUpdatedAt() != null ? report.getUpdatedAt() : report.getCreatedAt();
        if (editedAtSnapshot == null) {
            editedAtSnapshot = LocalDateTime.now();
        }

        String changeTypeSnapshot;
        if ("Y".equalsIgnoreCase(report.getConfirmed())) {
            changeTypeSnapshot = "CONFIRMED";
        } else if (report.getEditedSummaryText() != null) {
            changeTypeSnapshot = "HUMAN_EDITED";
        } else {
            changeTypeSnapshot = "AI_GENERATED";
        }

        AssessmentReportHistory history = AssessmentReportHistory.builder()
                .reportId(report.getId())
                .summaryText(summaryTextSnapshot)
                .editedBy(editedBySnapshot)
                .editedAt(editedAtSnapshot)
                .changeType(changeTypeSnapshot)
                .build();

        reportHistoryRepo.save(history);
        log.info("Saved assessment report history snapshot for reportId={}, changeType={}", report.getId(), changeTypeSnapshot);
    }

    @Transactional
    public AssessmentReportResponse updateEditedSummary(Long reportId, String editedText, String editedBy) {
        AssessmentReport report = reportRepo.findById(reportId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("AssessmentReport not found: " + reportId));
        saveHistorySnapshot(report);
        report.setEditedSummaryText(editedText);
        report.setEditedBy(editedBy);
        AssessmentReport saved = reportRepo.save(report);
        syncToChromaAsync(saved);
        return toResponse(saved);
    }

    @Transactional
    public AssessmentReportResponse confirmInsight(Long reportId, String confirmedBy) {
        AssessmentReport report = reportRepo.findById(reportId)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("AssessmentReport not found: " + reportId));
        saveHistorySnapshot(report);
        report.setConfirmed("Y");
        report.setEditedBy(confirmedBy);
        log.info("Insight confirmed for reportId={} by {}", reportId, confirmedBy);
        return toResponse(reportRepo.save(report));
    }

    public Optional<AssessmentReportResponse> getLatestReport(String studentId, Long groupId) {
        return reportRepo.findByStudentIdOrderByCreatedAtDesc(studentId)
                .stream()
                .filter(r -> r.getGroupId().equals(groupId))
                .findFirst()
                .map(this::toResponse);
    }
    @Transactional
    public void deleteTodayReport(String studentId, Long groupId) {
        reportRepo
                .findByStudentIdAndGroupIdAndSessionDate(studentId, groupId, LocalDate.now())
                .ifPresent(reportRepo::delete);
        log.info("Deleted today's cached report for student={} group={}", studentId, groupId);
    }

}