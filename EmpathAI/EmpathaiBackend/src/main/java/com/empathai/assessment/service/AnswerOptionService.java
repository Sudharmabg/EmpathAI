package com.empathai.assessment.service;

import com.empathai.assessment.dto.AnswerOptionRequest;
import com.empathai.assessment.dto.AnswerOptionResponse;
import com.empathai.assessment.entity.AnswerOption;
import com.empathai.assessment.repository.AnswerOptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;


@Slf4j
@Service
@RequiredArgsConstructor
public class AnswerOptionService {

    private final AnswerOptionRepository answerOptionRepo;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${openai.api.key:}")
    private String openaiApiKey;

    private static final String OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODEL = "gpt-4o";

    // ── Save / Upsert ─────────────────────────────────────────────────────────

    @Transactional
    public AnswerOptionResponse saveOption(AnswerOptionRequest request) {
        Optional<AnswerOption> existing = answerOptionRepo
                .findByQuestionIdAndOptionLabel(request.getQuestionId(), request.getOptionLabel());

        boolean interpretationChanged = false;
        AnswerOption option;

        if (existing.isPresent()) {
            option = existing.get();

            // ✅ FIX: Only invalidate cache if interpretation content actually changed.
            // Previously @PreUpdate cleared cache on every save — including the save
            // that stores newly generated bullets, creating an infinite wipe loop.
            interpretationChanged =
                    !Objects.equals(option.getRangeValue(),      request.getRange())       ||
                            !Objects.equals(option.getOverallMeaning(),  request.getOverallMeaning()) ||
                            !Objects.equals(option.getInterpretation(),  request.getInterpretation()) ||
                            !Objects.equals(option.getTag(),             request.getTag());

            option.setRangeValue(request.getRange());
            option.setOverallMeaning(request.getOverallMeaning());
            option.setInterpretation(request.getInterpretation());
            option.setTag(request.getTag());

            if (interpretationChanged) {
                // Explicitly wipe cache — will be regenerated async below
                option.setCachedBullets(null);
                option.setBulletsGeneratedAt(null);
                log.info("Interpretation changed for optionId={} — cache invalidated", option.getId());
            }
        } else {
            option = AnswerOption.builder()
                    .questionId(request.getQuestionId())
                    .optionLabel(request.getOptionLabel())
                    .rangeValue(request.getRange())
                    .overallMeaning(request.getOverallMeaning())
                    .interpretation(request.getInterpretation())
                    .tag(request.getTag())
                    .build();
            interpretationChanged = true; // new option always needs bullets
        }

        AnswerOption saved = answerOptionRepo.save(option);
        log.info("Saved answer option id={} for questionId={}", saved.getId(), saved.getQuestionId());

        // Trigger async bullet generation only if needed
        if (interpretationChanged || saved.getCachedBullets() == null) {
            generateBulletsAsync(saved.getId());
        }

        return toResponse(saved);
    }

    @Transactional
    public List<AnswerOptionResponse> saveOptions(List<AnswerOptionRequest> requests) {
        return requests.stream()
                .map(this::saveOption)
                .collect(Collectors.toList());
    }

    // ── Lookup ────────────────────────────────────────────────────────────────

    public List<AnswerOptionResponse> getByQuestionId(Long questionId) {
        return answerOptionRepo.findByQuestionId(questionId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public Optional<AnswerOption> findExact(Long questionId, String optionLabel) {
        return answerOptionRepo.findByQuestionIdAndOptionLabel(questionId, optionLabel.trim());
    }

    public Map<Long, List<AnswerOption>> getOptionsMapForQuestions(List<Long> questionIds) {
        List<AnswerOption> all = answerOptionRepo.findByQuestionIdIn(questionIds);
        Map<Long, List<AnswerOption>> map = new HashMap<>();
        for (AnswerOption o : all) {
            map.computeIfAbsent(o.getQuestionId(), k -> new ArrayList<>()).add(o);
        }
        return map;
    }

    // ── Bullet Pre-Generation ─────────────────────────────────────────────────

    @Async
    public void generateBulletsAsync(Long optionId) {
        // ✅ FIX: Re-fetch fresh from DB to avoid stale state
        answerOptionRepo.findById(optionId).ifPresent(option -> {
            if (option.getCachedBullets() != null && !option.getCachedBullets().isBlank()) {
                log.debug("Bullets already cached for option id={}", optionId);
                return;
            }
            String bullets = callLlmForBullets(option);
            if (bullets != null && !bullets.isBlank()) {
                // ✅ FIX: Use direct field set + save — @PreUpdate will NOT clear
                // cachedBullets anymore, so this save is safe.
                option.setCachedBullets(bullets);
                option.setBulletsGeneratedAt(LocalDateTime.now());
                answerOptionRepo.save(option);
                log.info("Cached bullets for option id={}", optionId);
            }
        });
    }

    public void pregenerateAllMissingBullets() {
        List<AnswerOption> uncached = answerOptionRepo.findAllUncached();
        log.info("Pre-generating bullets for {} uncached options", uncached.size());
        for (AnswerOption option : uncached) {
            generateBulletsAsync(option.getId());
        }
    }

    // ── LLM Call ─────────────────────────────────────────────────────────────

    private String callLlmForBullets(AnswerOption option) {
        if (openaiApiKey == null || openaiApiKey.isBlank()) {
            log.warn("OPENAI_API_KEY not set — skipping bullet generation for option id={}", option.getId());
            return null;
        }

        String prompt = buildBulletPrompt(option);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + openaiApiKey);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", MODEL);
            body.put("max_tokens", 400);
            body.put("messages", List.of(Map.of("role", "user", "content", prompt)));

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    OPENAI_API_URL, new HttpEntity<>(body, headers), Map.class);

            if (response.getBody() != null) {
                List<Map<String, Object>> choices =
                        (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    return (String) message.get("content");
                }
            }
        } catch (Exception e) {
            log.error("LLM bullet generation failed for option id={}: {}", option.getId(), e.getMessage());
        }
        return null;
    }

    private String buildBulletPrompt(AnswerOption option) {
        return String.format("""
                You are a compassionate educational psychologist writing feedback for a school student.
    
                A student selected this answer option in a psychological assessment:
                - Option: %s
                - Score Range: %s
                - Overall Meaning: %s
                - Psychological Interpretation: %s
                - Domain Tag: %s
    
                Write exactly 3 bullet points:
                ✅ One strength this answer reveals about the student.
                🔹 One area for improvement or support needed.
                💡 One simple, practical action they can try this week.
    
                Format: each bullet on its own line starting with the emoji.
                Keep each point to 1 sentence. Be warm, supportive, age-appropriate.
                No clinical terms. No labels like "anxiety disorder".
                """,
                option.getOptionLabel(),
                option.getRangeValue()     != null ? option.getRangeValue()     : "N/A",
                option.getOverallMeaning() != null ? option.getOverallMeaning() : "N/A",
                option.getInterpretation() != null ? option.getInterpretation() : "N/A",
                option.getTag()            != null ? option.getTag()            : "General"
        );
    }


    @Transactional
    public void deleteByQuestionId(Long questionId) {
        answerOptionRepo.deleteByQuestionId(questionId);
        log.info("Deleted all answer options for questionId={}", questionId);
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private AnswerOptionResponse toResponse(AnswerOption o) {
        return AnswerOptionResponse.builder()
                .id(o.getId())
                .questionId(o.getQuestionId())
                .optionLabel(o.getOptionLabel())
                .rangeValue(o.getRangeValue())
                .overallMeaning(o.getOverallMeaning())
                .interpretation(o.getInterpretation())
                .tag(o.getTag())
                .cachedBullets(o.getCachedBullets())
                .bulletsGeneratedAt(o.getBulletsGeneratedAt())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .build();
    }
}