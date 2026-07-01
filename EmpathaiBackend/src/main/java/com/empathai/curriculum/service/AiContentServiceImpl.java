package com.empathai.curriculum.service;

import com.empathai.curriculum.dto.request.AiProcessRequest;
import com.empathai.curriculum.dto.response.AiProcessResponse;
import com.empathai.curriculum.entity.AiGeneratedContent;
import com.empathai.curriculum.entity.AiTaskType;
import com.empathai.curriculum.repository.AiGeneratedContentRepository;
import com.empathai.curriculum.repository.ChapterRepository;
import com.empathai.curriculum.exception.EmpathaiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiContentServiceImpl implements AiContentService {

    private final AiGeneratedContentRepository contentRepository;
    private final ChapterRepository chapterRepository;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Value("${chatbot.ai-service.api-key:empathai-internal-key-2026}")
    private String internalApiKey;

    @Override
    @Transactional
    public AiProcessResponse process(AiProcessRequest request) {
        AiTaskType taskType = AiTaskType.valueOf(request.getTask().toUpperCase());

        // ── 1. Cache check ────────────────────────────────────────────────────
        Optional<AiGeneratedContent> cached = contentRepository
            .findByTaskTypeAndChapterIdAndTopic(taskType, request.getChapterId(), request.getTopic());

        if (cached.isPresent()) {
            log.info("Cache HIT: task={} chapterId={} topic={}", taskType, request.getChapterId(), request.getTopic());
            return AiProcessResponse.builder()
                .taskType(taskType.name())
                .chapterId(request.getChapterId())
                .topic(request.getTopic())
                .content(cached.get().getContent())
                .cached(true)
                .build();
        }

        // ── 2. Call Python RAG orchestrator ───────────────────────────────────
        log.info("Cache MISS: calling Python for task={} chapterId={}", taskType, request.getChapterId());

        Map<String, Object> payload = new HashMap<>();
        payload.put("task",       request.getTask());
        payload.put("chapter_id", request.getChapterId());
        payload.put("topic",      request.getTopic());
        payload.put("grade",      request.getGrade());
        payload.put("subject",    request.getSubject());
        payload.put("chapter",    request.getChapter());
        payload.put("student_id", request.getStudentId() != null ? request.getStudentId().toString() : null);

        Map<String, Object> pythonResponse;
        try {
            pythonResponse = webClientBuilder.build()
                .post()
                .uri(aiServiceUrl + "/api/ai/process")
                .header("X-Internal-Token", internalApiKey)
                .bodyValue(payload)
                .retrieve()
                .onStatus(HttpStatusCode::is5xxServerError, resp ->
                    resp.bodyToMono(String.class)
                        .map(body -> new EmpathaiException("AI service error: " + body, HttpStatus.BAD_GATEWAY))
                )
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(120))
                .block();
        } catch (Exception e) {
            log.error("Python AI call failed: {}", e.getMessage());
            throw new EmpathaiException("AI generation temporarily unavailable. Please try again.", HttpStatus.SERVICE_UNAVAILABLE);
        }

        // ── 3. Extract content JSON from Python response ───────────────────────
        Object contentObj = pythonResponse.get("content");
        String contentJson;
        try {
            contentJson = objectMapper.writeValueAsString(contentObj);
        } catch (Exception e) {
            throw new EmpathaiException("Failed to serialize AI response", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // ── 4. Store in MySQL cache ────────────────────────────────────────────
        AiGeneratedContent entity = AiGeneratedContent.builder()
            .chapterId(request.getChapterId())
            .taskType(taskType)
            .topic(request.getTopic())
            .content(contentJson)
            .isApproved(true)
            .build();
        contentRepository.save(entity);

        return AiProcessResponse.builder()
            .taskType(taskType.name())
            .chapterId(request.getChapterId())
            .topic(request.getTopic())
            .content(contentJson)
            .cached(false)
            .build();
    }

    @Override
    public AiProcessResponse getCached(String taskTypeStr, Long chapterId, String topic) {
        AiTaskType taskType = AiTaskType.valueOf(taskTypeStr.toUpperCase());
        Optional<AiGeneratedContent> cached = contentRepository
            .findByTaskTypeAndChapterIdAndTopic(taskType, chapterId, topic);
            
        if (cached.isPresent()) {
            return AiProcessResponse.builder()
                .taskType(taskType.name())
                .chapterId(chapterId)
                .topic(topic)
                .content(cached.get().getContent())
                .cached(true)
                .build();
        }
        
        throw new EmpathaiException("Cached content not found", HttpStatus.NOT_FOUND);
    }
}
