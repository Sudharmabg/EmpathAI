package com.mymercurie.analytics.service;

import com.mymercurie.analytics.dto.AnalysisRequest;
import com.mymercurie.analytics.dto.AnalysisResult;
import com.mymercurie.assessment.entity.AssessmentResponse;
import com.mymercurie.assessment.repository.AssessmentResponseRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIAnalysisService {

    @Value("${openai.api.key}")
    private String openAiApiKey;

    @Value("${chatbot.ai-service.url}")
    private String aiServiceUrl;

    @Value("${chatbot.ai-service.api-key}")
    private String aiServiceApiKey;

    private final AssessmentResponseRepository assessmentResponseRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AnalysisResult analyzeStudentAnswers(AnalysisRequest request) {

        // Step 1 — Fetch all answers for this student from PostgreSQL
        List<AssessmentResponse> responses = assessmentResponseRepository
                .findByStudentId(request.getStudentId());

        if (responses.isEmpty()) {
            log.warn("No responses found for studentId={}", request.getStudentId());
            return new AnalysisResult(
                    List.of("No responses found."),
                    List.of("Please complete the assessment first.")
            );
        }

        // Step 2 — Build combined answers text for vector search
        StringBuilder answersText = new StringBuilder();
        for (AssessmentResponse r : responses) {
            String qText = r.getQuestion() != null ? r.getQuestion().getQuestionText() : "";
            answersText.append("Question: ").append(qText)
                    .append(" | Student answered: ").append(r.getResponseValue())
                    .append("\n");
        }

        // Step 3 — Get relevant overviews from pgvector via the Python AI service
        List<String> overviews = getRelevantOverviewsFromAiService(answersText.toString(), 5);

        // Step 3b — Get historically similar student profiles (few-shot RAG examples)
        List<String> similarProfiles = getSimilarProfilesFromAiService(answersText.toString(), 1);

        // Step 4 — Build LLM prompt
        StringBuilder prompt = new StringBuilder();
        if (!similarProfiles.isEmpty()) {
            prompt.append("FEW-SHOT EXAMPLES OF PSYCHOLOGIST EVALUATIONS FOR REFERENCE:\n");
            for (int i = 0; i < similarProfiles.size(); i++) {
                prompt.append("--- EXAMPLE ").append(i + 1).append(" ---\n")
                      .append(similarProfiles.get(i)).append("\n\n");
            }
            prompt.append("--------------------------------------------------\n\n");
        }

        prompt.append("PSYCHOLOGIST OVERVIEWS:\n");
        for (int i = 0; i < overviews.size(); i++) {
            prompt.append("[").append(i + 1).append("] ")
                    .append(overviews.get(i)).append("\n\n");
        }
        prompt.append("STUDENT ANSWERS:\n").append(answersText);
        prompt.append("\nBased on the psychologist overviews and the student answers, ");
        prompt.append("write exactly 3 strength bullet points and 3 improvement bullet points. ");
        prompt.append("Be specific, encouraging, and actionable. ");
        prompt.append("Speak directly to the student using 'you'. ");
        prompt.append("Return ONLY valid JSON:\n");
        prompt.append("{\"strengths\":[\"point1\",\"point2\",\"point3\"],");
        prompt.append("\"Areas to Focus\":[\"point1\",\"point2\",\"point3\"]}");

        // Step 5 — Call OpenAI API
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + openAiApiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("model", "gpt-3.5-turbo");
            body.put("max_tokens", 1000);
            body.put("temperature", 0.3);
            body.put("messages", List.of(
                    Map.of("role", "system", "content",
                            "You are a student psychologist. " +
                                    "Always respond with valid JSON only. " +
                                    "No explanation, no preamble, no markdown."),
                    Map.of("role", "user", "content", prompt.toString())
            ));

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    "https://api.openai.com/v1/chat/completions",
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            List<Map<String, Object>> choices =
                    (List<Map<String, Object>>) response.getBody().get("choices");
            Map<String, Object> message =
                    (Map<String, Object>) choices.get(0).get("message");
            String jsonText = (String) message.get("content");

            Map<String, List<String>> result =
                    objectMapper.readValue(jsonText, Map.class);

            log.info("Analysis completed for studentId={}", request.getStudentId());
            return new AnalysisResult(
                    result.get("strengths"),
                    result.get("Areas to Focus")
            );

        } catch (Exception e) {
            log.error("AI analysis failed: {}", e.getMessage(), e);
            return new AnalysisResult(
                    List.of("Unable to generate analysis at this time."),
                    List.of("Please try again.")
            );
        }
    }

    // ── Private: call Python AI service for psychologist overviews ────────────

    private List<String> getRelevantOverviewsFromAiService(String answersText, int topN) {
        try {
            String url = aiServiceUrl + "/internal/overviews/search";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-API-Key", aiServiceApiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("query", answersText);
            body.put("top_n", topN);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    url, new HttpEntity<>(body, headers), Map.class
            );

            if (response.getBody() != null) {
                List<String> documents = (List<String>) response.getBody().get("documents");
                if (documents != null) {
                    log.info("pgvector overview search returned {} results", documents.size());
                    return documents;
                }
            }
        } catch (Exception e) {
            log.error("pgvector overview search failed: {}", e.getMessage(), e);
        }
        return new ArrayList<>();
    }

    private List<String> getSimilarProfilesFromAiService(String answersText, int topN) {
        try {
            String url = aiServiceUrl + "/internal/profiles/search";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-API-Key", aiServiceApiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("query", answersText);
            body.put("top_n", topN);

            ResponseEntity<List> response = restTemplate.postForEntity(
                    url, new HttpEntity<>(body, headers), List.class
            );

            if (response.getBody() != null) {
                List<Map<String, Object>> results = (List<Map<String, Object>>) response.getBody();
                List<String> documents = new ArrayList<>();
                for (Map<String, Object> r : results) {
                    String doc = (String) r.get("document");
                    if (doc != null) {
                        documents.add(doc);
                    }
                }
                log.info("pgvector profiles search returned {} results", documents.size());
                return documents;
            }
        } catch (Exception e) {
            log.error("pgvector profiles search failed: {}", e.getMessage(), e);
        }
        return new ArrayList<>();
    }

}