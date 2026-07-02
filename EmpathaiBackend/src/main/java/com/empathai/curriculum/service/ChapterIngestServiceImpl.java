package com.empathai.curriculum.service;

import com.empathai.curriculum.dto.request.ChapterMetadataUpdateRequest;
import com.empathai.curriculum.dto.request.ChapterUploadRequest;
import com.empathai.curriculum.dto.response.ChapterResponse;
import com.empathai.curriculum.dto.response.ChapterStatusResponse;
import com.empathai.curriculum.entity.Chapter;
import com.empathai.curriculum.entity.ProcessingStatus;
import com.empathai.curriculum.entity.ChapterTopic;
import com.empathai.curriculum.repository.ChapterRepository;
import com.empathai.curriculum.repository.ChapterTopicRepository;
import com.empathai.curriculum.dto.request.ChapterTopicRequest;
import com.empathai.curriculum.dto.response.ChapterTopicResponse;
import com.empathai.curriculum.exception.EmpathaiException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChapterIngestServiceImpl implements ChapterIngestService {

    private final ChapterRepository chapterRepository;
    private final ChapterTopicRepository chapterTopicRepository;
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Value("${chatbot.ai-service.api-key:empathai-internal-key-2026}")
    private String internalApiKey;

    @Override
    @Transactional
    public ChapterStatusResponse uploadChapter(ChapterUploadRequest request, String createdBy) {
        // Parse manual subtopics if provided (now a List<String>, not comma-separated)
        String subtopicsJson = null;
        if (request.getSubtopics() != null && !request.getSubtopics().isEmpty()) {
            try {
                subtopicsJson = objectMapper.writeValueAsString(request.getSubtopics());
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize manual subtopics: {}", e.getMessage());
            }
        }

        Chapter chapter = Chapter.builder()
            .board(request.getBoard())
            .grade(request.getGrade())
            .subject(request.getSubject())
            .title(request.getTitle())
            .chapterNumber(request.getChapterNumber())
            .rawContent(request.getRawContent())
            .processingStatus(ProcessingStatus.PENDING)
            .subtopics(subtopicsJson)
            .createdBy(createdBy)
            .build();
        chapter = chapterRepository.save(chapter);

        // 2. Call Python /api/curriculum/ingest asynchronously
        final Long chapterId = chapter.getId();
        triggerPythonPipeline(chapter);

        return ChapterStatusResponse.builder()
            .chapterId(chapterId)
            .processingStatus(ProcessingStatus.PROCESSING)
            .message("Chapter uploaded successfully. AI pipeline started.")
            .build();
    }

    private void triggerPythonPipeline(Chapter chapter) {
        // Update local status to PROCESSING
        chapter.setProcessingStatus(ProcessingStatus.PROCESSING);
        chapterRepository.save(chapter);

        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("chapter_id", chapter.getId());
        payload.put("board", chapter.getBoard());
        payload.put("grade", chapter.getGrade());
        payload.put("subject", chapter.getSubject());
        payload.put("chapter_title", chapter.getTitle());
        payload.put("raw_content", chapter.getRawContent());
        if (chapter.getChapterNumber() != null) {
            payload.put("chapter_number", chapter.getChapterNumber());
        }
        if (chapter.getSubtopics() != null) {
            payload.put("subtopics", chapter.getSubtopics()); // JSON string
        }

        webClientBuilder.build()
            .post()
            .uri(aiServiceUrl + "/api/curriculum/ingest")
            .header("X-Internal-Token", internalApiKey)
            .bodyValue(payload)
            .retrieve()
            .bodyToMono(Map.class)
            .timeout(Duration.ofSeconds(10))
            .subscribe(
                response -> log.info("Python pipeline started for chapter_id={}", chapter.getId()),
                error -> {
                    log.error("Failed to trigger Python pipeline for chapter_id={}: {}",
                        chapter.getId(), error.getMessage());
                    chapter.setProcessingStatus(ProcessingStatus.FAILED);
                    chapterRepository.save(chapter);
                }
            );
    }

    @Override
    @Transactional
    public ChapterStatusResponse getStatus(Long chapterId) {
        Chapter chapter = getChapterEntity(chapterId);

        if (chapter.getProcessingStatus() == ProcessingStatus.PROCESSED || 
            chapter.getProcessingStatus() == ProcessingStatus.PUBLISHED || 
            chapter.getProcessingStatus() == ProcessingStatus.FAILED) {
            
            return ChapterStatusResponse.builder()
                .chapterId(chapterId)
                .processingStatus(chapter.getProcessingStatus())
                .message("Processing finished.")
                .topics(deserializeList(chapter.getTopics()))
                .difficultyLevel(chapter.getDifficultyLevel())
                .estimatedReadingTime(chapter.getEstimatedReadingTime())
                .build();
        }

        // Poll Python /api/curriculum/status/{chapter_id}
        try {
            Map<String, Object> response = webClientBuilder.build()
                .get()
                .uri(aiServiceUrl + "/api/curriculum/status/" + chapterId)
                .header("X-Internal-Token", internalApiKey)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block(Duration.ofSeconds(10));
            
            if (response != null && response.containsKey("status")) {
                String pythonStatus = (String) response.get("status");
                
                if ("PROCESSED".equals(pythonStatus)) {
                    Map<String, Object> metadata = (Map<String, Object>) response.get("metadata");
                    updateChapterWithMetadata(chapter, metadata);
                    chapter.setProcessingStatus(ProcessingStatus.PROCESSED);
                    chapter = chapterRepository.save(chapter);
                } else if ("FAILED".equals(pythonStatus)) {
                    chapter.setProcessingStatus(ProcessingStatus.FAILED);
                    chapter = chapterRepository.save(chapter);
                }
            }
        } catch (Exception e) {
            log.error("Error checking status for chapter {}: {}", chapterId, e.getMessage());
        }

        return ChapterStatusResponse.builder()
            .chapterId(chapterId)
            .processingStatus(chapter.getProcessingStatus())
            .message("Status checked.")
            .topics(deserializeList(chapter.getTopics()))
            .difficultyLevel(chapter.getDifficultyLevel())
            .estimatedReadingTime(chapter.getEstimatedReadingTime())
            .build();
    }

    private void updateChapterWithMetadata(Chapter chapter, Map<String, Object> metadata) {
        if (metadata == null) return;
        try {
            chapter.setTopics(objectMapper.writeValueAsString(metadata.get("topics")));
            chapter.setSubtopics(objectMapper.writeValueAsString(metadata.get("subtopics")));
            chapter.setConcepts(objectMapper.writeValueAsString(metadata.get("concepts")));
            chapter.setLearningObjectives(objectMapper.writeValueAsString(metadata.get("learning_objectives")));
            chapter.setBloomsLevels(objectMapper.writeValueAsString(metadata.get("blooms_levels")));
            chapter.setKeywords(objectMapper.writeValueAsString(metadata.get("keywords")));
            chapter.setDefinitions(objectMapper.writeValueAsString(metadata.get("definitions")));
            chapter.setFormulae(objectMapper.writeValueAsString(metadata.get("formulae")));
            chapter.setCommonMisconceptions(objectMapper.writeValueAsString(metadata.get("common_misconceptions")));
            chapter.setPrerequisites(objectMapper.writeValueAsString(metadata.get("prerequisites")));
            chapter.setNextConcepts(objectMapper.writeValueAsString(metadata.get("next_concepts")));
            
            if (metadata.containsKey("difficulty_level")) {
                chapter.setDifficultyLevel((String) metadata.get("difficulty_level"));
            }
            if (metadata.containsKey("estimated_reading_time")) {
                chapter.setEstimatedReadingTime((Integer) metadata.get("estimated_reading_time"));
            }
        } catch (JsonProcessingException e) {
            log.error("Error serializing metadata for chapter {}: {}", chapter.getId(), e.getMessage());
        }
    }

    @Override
    @Transactional
    public ChapterResponse updateMetadata(Long chapterId, ChapterMetadataUpdateRequest request) {
        Chapter chapter = getChapterEntity(chapterId);
        
        try {
            if (request.getTopics() != null) chapter.setTopics(objectMapper.writeValueAsString(request.getTopics()));
            if (request.getLearningObjectives() != null) chapter.setLearningObjectives(objectMapper.writeValueAsString(request.getLearningObjectives()));
            if (request.getBloomsLevels() != null) chapter.setBloomsLevels(objectMapper.writeValueAsString(request.getBloomsLevels()));
            if (request.getKeywords() != null) chapter.setKeywords(objectMapper.writeValueAsString(request.getKeywords()));
            if (request.getCommonMisconceptions() != null) chapter.setCommonMisconceptions(objectMapper.writeValueAsString(request.getCommonMisconceptions()));
            if (request.getDifficultyLevel() != null) chapter.setDifficultyLevel(request.getDifficultyLevel());
            if (request.getEstimatedReadingTime() != null) chapter.setEstimatedReadingTime(request.getEstimatedReadingTime());
        } catch (JsonProcessingException e) {
            log.error("Error serializing updated metadata for chapter {}: {}", chapter.getId(), e.getMessage());
            throw new EmpathaiException("Failed to update metadata", HttpStatus.INTERNAL_SERVER_ERROR);
        }
        
        return toChapterResponse(chapterRepository.save(chapter));
    }

    @Override
    @Transactional
    public ChapterResponse publishChapter(Long chapterId, String publishedBy) {
        Chapter chapter = getChapterEntity(chapterId);

        if (chapter.getProcessingStatus() != ProcessingStatus.PROCESSED) {
            throw new EmpathaiException(
                "Chapter must be in PROCESSED status to publish. Current: " + chapter.getProcessingStatus(),
                HttpStatus.CONFLICT
            );
        }

        chapter.setProcessingStatus(ProcessingStatus.PUBLISHED);
        chapter.setPublishedBy(publishedBy);
        chapter.setPublishedAt(LocalDateTime.now());
        return toChapterResponse(chapterRepository.save(chapter));
    }

    @Override
    public List<ChapterResponse> listPublishedChapters(String grade, String subject) {
        List<Chapter> chapters;
        if (grade != null && subject != null) {
            chapters = chapterRepository.findByGradeAndSubjectAndProcessingStatusOrderByTitleAsc(grade, subject, ProcessingStatus.PUBLISHED);
        } else if (subject != null) {
            chapters = chapterRepository.findBySubjectAndProcessingStatusOrderByTitleAsc(subject, ProcessingStatus.PUBLISHED);
        } else {
            chapters = chapterRepository.findByProcessingStatusOrderByCreatedAtDesc(ProcessingStatus.PUBLISHED);
        }
        return chapters.stream().map(this::toChapterResponse).collect(Collectors.toList());
    }

    @Override
    public ChapterResponse getChapter(Long chapterId) {
        return toChapterResponse(getChapterEntity(chapterId));
    }

    private Chapter getChapterEntity(Long chapterId) {
        return chapterRepository.findById(chapterId)
            .orElseThrow(() -> new EmpathaiException("Chapter not found: " + chapterId, HttpStatus.NOT_FOUND));
    }

    private ChapterResponse toChapterResponse(Chapter chapter) {
        return ChapterResponse.builder()
            .id(chapter.getId())
            .board(chapter.getBoard())
            .grade(chapter.getGrade())
            .subject(chapter.getSubject())
            .title(chapter.getTitle())
            .chapterNumber(chapter.getChapterNumber())
            .processingStatus(chapter.getProcessingStatus())
            .topics(deserializeList(chapter.getTopics()))
            .subtopics(deserializeList(chapter.getSubtopics()))
            .concepts(deserializeList(chapter.getConcepts()))
            .learningObjectives(deserializeList(chapter.getLearningObjectives()))
            .bloomsLevels(deserializeList(chapter.getBloomsLevels()))
            .keywords(deserializeList(chapter.getKeywords()))
            .definitions(deserializeList(chapter.getDefinitions()))
            .formulae(deserializeList(chapter.getFormulae()))
            .commonMisconceptions(deserializeList(chapter.getCommonMisconceptions()))
            .prerequisites(deserializeList(chapter.getPrerequisites()))
            .difficultyLevel(chapter.getDifficultyLevel())
            .estimatedReadingTime(chapter.getEstimatedReadingTime())
            .createdBy(chapter.getCreatedBy())
            .createdAt(chapter.getCreatedAt())
            .publishedBy(chapter.getPublishedBy())
            .publishedAt(chapter.getPublishedAt())
            .archivedBy(chapter.getArchivedBy())
            .archivedAt(chapter.getArchivedAt())
            .build();
    }
    
    private List<String> deserializeList(String json) {
        if (json == null || json.isEmpty()) return null;
        try {
            return objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    @Override
    @Transactional
    public ChapterResponse archiveChapter(Long chapterId, String archivedBy) {
        Chapter chapter = getChapterEntity(chapterId);
        chapter.setProcessingStatus(ProcessingStatus.ARCHIVED);
        chapter.setArchivedBy(archivedBy);
        chapter.setArchivedAt(LocalDateTime.now());
        return toChapterResponse(chapterRepository.save(chapter));
    }

    @Override
    @Transactional
    public ChapterResponse restoreChapter(Long chapterId) {
        Chapter chapter = getChapterEntity(chapterId);
        if (chapter.getProcessingStatus() != ProcessingStatus.ARCHIVED) {
            throw new EmpathaiException("Chapter is not archived", HttpStatus.BAD_REQUEST);
        }
        chapter.setProcessingStatus(ProcessingStatus.PUBLISHED); // Restore to published
        return toChapterResponse(chapterRepository.save(chapter));
    }

    @Override
    public List<ChapterResponse> listArchivedChapters() {
        return chapterRepository.findByProcessingStatusOrderByArchivedAtDesc(ProcessingStatus.ARCHIVED)
            .stream().map(this::toChapterResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ChapterTopicResponse addTopic(Long chapterId, ChapterTopicRequest request, String createdBy) {
        getChapterEntity(chapterId); // validate chapter exists
        
        ChapterTopic topic = ChapterTopic.builder()
            .chapterId(chapterId)
            .topicName(request.getTopicName())
            .parentId(request.getParentId())
            .rawContent(request.getRawContent())
            .createdBy(createdBy)
            .build();
            
        return toTopicResponse(chapterTopicRepository.save(topic));
    }

    @Override
    @Transactional
    public ChapterTopicResponse updateTopic(Long topicId, ChapterTopicRequest request) {
        ChapterTopic topic = chapterTopicRepository.findById(topicId)
            .orElseThrow(() -> new EmpathaiException("Topic not found", HttpStatus.NOT_FOUND));
            
        topic.setTopicName(request.getTopicName());
        if (request.getRawContent() != null) {
            topic.setRawContent(request.getRawContent());
        }
        
        return toTopicResponse(chapterTopicRepository.save(topic));
    }

    @Override
    @Transactional
    public void deleteTopic(Long topicId) {
        chapterTopicRepository.deleteById(topicId);
    }

    @Override
    public List<ChapterTopicResponse> getTopicTree(Long chapterId) {
        List<ChapterTopic> rootTopics = chapterTopicRepository.findByChapterIdAndParentIdIsNullOrderBySortOrder(chapterId);
        return rootTopics.stream().map(t -> {
            ChapterTopicResponse resp = toTopicResponse(t);
            List<ChapterTopic> sub = chapterTopicRepository.findByParentIdOrderBySortOrder(t.getId());
            resp.setSubtopics(sub.stream().map(this::toTopicResponse).collect(Collectors.toList()));
            return resp;
        }).collect(Collectors.toList());
    }

    private ChapterTopicResponse toTopicResponse(ChapterTopic t) {
        return ChapterTopicResponse.builder()
            .id(t.getId())
            .chapterId(t.getChapterId())
            .topicName(t.getTopicName())
            .parentId(t.getParentId())
            .sortOrder(t.getSortOrder())
            .rawContent(t.getRawContent())
            .hasContent(t.getRawContent() != null && !t.getRawContent().trim().isEmpty())
            .createdBy(t.getCreatedBy())
            .createdAt(t.getCreatedAt())
            .updatedAt(t.getUpdatedAt())
            .build();
    }
}
