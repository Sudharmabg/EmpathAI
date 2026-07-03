package com.empathai.curriculum.service;

import com.empathai.curriculum.dto.request.*;
import com.empathai.curriculum.dto.response.*;
import com.empathai.curriculum.entity.AiGeneratedContent;
import com.empathai.curriculum.entity.AiTaskType;
import com.empathai.curriculum.entity.ApprovalStatus;
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
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

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
            AiGeneratedContent entity = cached.get();
            log.info("Cache HIT: task={} chapterId={} topic={}", taskType, request.getChapterId(), request.getTopic());
            return AiProcessResponse.builder()
                .taskType(taskType.name())
                .chapterId(request.getChapterId())
                .topic(request.getTopic())
                .content(entity.getContent())
                .cached(true)
                .pendingApproval(entity.getApprovalStatus() == ApprovalStatus.PENDING)
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
            .approvalStatus(ApprovalStatus.PENDING)
            .build();
        contentRepository.save(entity);

        return AiProcessResponse.builder()
            .taskType(taskType.name())
            .chapterId(request.getChapterId())
            .topic(request.getTopic())
            .content(contentJson)
            .cached(false)
            .pendingApproval(true)
            .build();
    }

    @Override
    public AiProcessResponse getCached(String taskTypeStr, Long chapterId, String topic) {
        AiTaskType taskType = AiTaskType.valueOf(taskTypeStr.toUpperCase());
        Optional<AiGeneratedContent> cached = contentRepository
            .findByTaskTypeAndChapterIdAndTopicAndApprovalStatus(taskType, chapterId, topic, ApprovalStatus.APPROVED);
            
        if (cached.isPresent()) {
            return AiProcessResponse.builder()
                .taskType(taskType.name())
                .chapterId(chapterId)
                .topic(topic)
                .content(cached.get().getContent())
                .cached(true)
                .pendingApproval(false)
                .build();
        }
        
        throw new EmpathaiException("Cached content not found or not approved", HttpStatus.NOT_FOUND);
    }

    // ── Admin Tools ───────────────────────────────────────────────────────

    @Override
    @Transactional
    public AiProcessResponse generateToolContent(AiGenerateRequest request, String createdBy) {
        // Reuse the process method by wrapping request. 
        // We fetch chapter details to properly call Python RAG.
        com.empathai.curriculum.entity.Chapter chapter = chapterRepository.findById(request.getChapterId())
            .orElseThrow(() -> new EmpathaiException("Chapter not found", HttpStatus.NOT_FOUND));

        AiProcessRequest processRequest = new AiProcessRequest();
        processRequest.setTask(request.getTaskType().name());
        processRequest.setChapterId(chapter.getId());
        processRequest.setTopic(request.getTopic());
        processRequest.setGrade(chapter.getGrade());
        processRequest.setSubject(chapter.getSubject());
        processRequest.setChapter(chapter.getTitle());

        return process(processRequest);
    }

    @Override
    @Transactional
    public AiProcessResponse regenerateToolContent(Long id, String regeneratedBy) {
        AiGeneratedContent existing = contentRepository.findById(id)
            .orElseThrow(() -> new EmpathaiException("Content not found", HttpStatus.NOT_FOUND));

        com.empathai.curriculum.entity.Chapter chapter = chapterRepository.findById(existing.getChapterId())
            .orElseThrow(() -> new EmpathaiException("Chapter not found", HttpStatus.NOT_FOUND));

        // Build process request with original parameters
        AiProcessRequest processRequest = new AiProcessRequest();
        processRequest.setTask(existing.getTaskType().name());
        processRequest.setChapterId(chapter.getId());
        processRequest.setTopic(existing.getTopic());
        processRequest.setGrade(chapter.getGrade());
        processRequest.setSubject(chapter.getSubject());
        processRequest.setChapter(chapter.getTitle());

        // Call Python RAG
        Map<String, Object> payload = new HashMap<>();
        payload.put("task",       processRequest.getTask());
        payload.put("chapter_id", processRequest.getChapterId());
        payload.put("topic",      processRequest.getTopic());
        payload.put("grade",      processRequest.getGrade());
        payload.put("subject",    processRequest.getSubject());
        payload.put("chapter",    processRequest.getChapter());

        Map<String, Object> pythonResponse;
        try {
            pythonResponse = webClientBuilder.build()
                .post()
                .uri(aiServiceUrl + "/api/ai/process")
                .header("X-Internal-Token", internalApiKey)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(120))
                .block();
        } catch (Exception e) {
            log.error("Python regenerate call failed: {}", e.getMessage());
            throw new EmpathaiException("AI generation temporarily unavailable.", HttpStatus.SERVICE_UNAVAILABLE);
        }

        Object contentObj = pythonResponse.get("content");
        String contentJson;
        try {
            contentJson = objectMapper.writeValueAsString(contentObj);
        } catch (Exception e) {
            throw new EmpathaiException("Failed to serialize AI response", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Update existing record in place (reset to PENDING)
        existing.setContent(contentJson);
        existing.setApprovalStatus(ApprovalStatus.PENDING);
        existing.setApprovedBy(null);
        existing.setApprovedAt(null);
        existing.setEditedBy(regeneratedBy);
        contentRepository.save(existing);

        return AiProcessResponse.builder()
            .taskType(existing.getTaskType().name())
            .chapterId(existing.getChapterId())
            .topic(existing.getTopic())
            .content(contentJson)
            .cached(false)
            .pendingApproval(true)
            .build();
    }

    @Override
    public List<AiContentAdminResponse> listContentForChapter(Long chapterId) {
        return contentRepository.findByChapterIdOrderByTaskTypeAscTopicAsc(chapterId)
            .stream().map(this::toAdminResponse).collect(Collectors.toList());
    }

    @Override
    public List<AiContentAdminResponse> listPendingContent() {
        return contentRepository.findByApprovalStatusOrderByCreatedAtDesc(ApprovalStatus.PENDING)
            .stream().map(this::toAdminResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AiContentAdminResponse approveOrReject(Long id, AiContentApprovalRequest request, String adminBy) {
        AiGeneratedContent content = contentRepository.findById(id)
            .orElseThrow(() -> new EmpathaiException("Content not found", HttpStatus.NOT_FOUND));
        
        ApprovalStatus newStatus = ApprovalStatus.valueOf(request.getApprovalStatus().toUpperCase());
        content.setApprovalStatus(newStatus);
        content.setApprovedBy(adminBy);
        content.setApprovedAt(LocalDateTime.now());
        
        return toAdminResponse(contentRepository.save(content));
    }

    @Override
    @Transactional
    public AiContentAdminResponse editContent(Long id, AiContentEditRequest request, String editedBy) {
        AiGeneratedContent content = contentRepository.findById(id)
            .orElseThrow(() -> new EmpathaiException("Content not found", HttpStatus.NOT_FOUND));
        
        content.setContent(request.getContent());
        // Edit resets to PENDING
        content.setApprovalStatus(ApprovalStatus.PENDING);
        content.setEditedBy(editedBy);
        
        return toAdminResponse(contentRepository.save(content));
    }

    @Override
    @Transactional
    public void deleteContent(Long id) {
        contentRepository.deleteById(id);
    }

    @Override
    @Transactional
    public AiContentAdminResponse createContent(AiContentCreateRequest request, String createdBy) {
        AiGeneratedContent entity = AiGeneratedContent.builder()
            .chapterId(request.getChapterId())
            .taskType(request.getTaskType())
            .topic(request.getTopic())
            .content(request.getContent())
            .approvalStatus(ApprovalStatus.PENDING)
            .build();
            
        return toAdminResponse(contentRepository.save(entity));
    }

    private AiContentAdminResponse toAdminResponse(AiGeneratedContent content) {
        return AiContentAdminResponse.builder()
            .id(content.getId())
            .chapterId(content.getChapterId())
            .taskType(content.getTaskType())
            .topic(content.getTopic())
            .content(content.getContent())
            .approvalStatus(content.getApprovalStatus())
            .approvedBy(content.getApprovedBy())
            .approvedAt(content.getApprovedAt())
            .editedBy(content.getEditedBy())
            .createdAt(content.getCreatedAt())
            .updatedAt(content.getUpdatedAt())
            .build();
    }
}
