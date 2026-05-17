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
            interpretationChanged = true;
        }

        AnswerOption saved = answerOptionRepo.save(option);
        log.info("Saved answer option id={} for questionId={}", saved.getId(), saved.getQuestionId());

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
        answerOptionRepo.findById(optionId).ifPresent(option -> {
            if (option.getCachedBullets() != null && !option.getCachedBullets().isBlank()) {
                log.debug("Bullets already cached for option id={}", optionId);
                return;
            }
            String bullets = callLlmForBullets(option);
            if (bullets != null && !bullets.isBlank()) {

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
        String tag = option.getTag() != null && !option.getTag().isBlank()
                ? option.getTag() : "Neutral";

        // Build tag-specific instruction so the LLM produces distinct bullets per category
        String tagInstruction = switch (tag) {
            case "Strength" -> """
                    This answer tag is STRENGTH — the student is doing well in this area.
                     Highlight a specific, concrete strength this answer shows (not generic praise).
                     Suggest one way they can build even further on this strength (growth, not concern).
                     Give one small action to sustain or deepen this positive pattern this week.
                    """;
            case "Weakness" -> """
                    This answer tag is WEAKNESS — the student needs support in this area.
                     Find one small positive or protective factor still visible in this answer.
                     Clearly name the specific area of concern (without clinical labels).
                     Give one gentle, doable action the student can try this week to address it.
                    """;
            case "Risk" -> """
                    This answer tag is RISK — there is a concern that may need attention.
                     Acknowledge the student's honesty in sharing this response.
                     Describe the specific risk this response indicates, warmly but clearly.
                     Recommend one concrete step — ideally involving a trusted adult or routine.
                    """;
            case "Growth" -> """
                    This answer tag is GROWTH — the student is improving or open to change.
                     Celebrate the progress or openness this answer reflects.
                     Identify one area where more growth is still possible.
                     Give one practical habit or action to keep the momentum going.
                    """;
            default -> """
                    This answer tag is NEUTRAL.
                     Note one balanced, positive observation from this answer.
                     Identify one area that could benefit from more attention.
                     Suggest one simple, practical action for this week.
                    """;
        };

        return String.format("""
                You are a compassionate educational psychologist writing personalised feedback
                for a school student's wellbeing assessment.
 
                Assessment context:
                - Question domain: %s
                - Student's selected answer: %s
                - Score range: %s
                - Overall meaning: %s
                - Psychological interpretation: %s
 
                %s
 
                RULES:
                - Write EXACTLY 3 bullet points — one starting with , one with , one with .
                - Each bullet must be 2 sentence only (max 20 words).
                - Every bullet must reference the SPECIFIC answer content — do NOT write generic feedback.
                - Use warm, age-appropriate language. No clinical terms. No disorder labels.
                - The , , and  bullets must clearly differ from each other in theme.
                  Do NOT write three variations of the same idea.
                """,
                option.getTag()            != null ? option.getTag()            : "General",
                option.getOptionLabel(),
                option.getRangeValue()     != null ? option.getRangeValue()     : "N/A",
                option.getOverallMeaning() != null ? option.getOverallMeaning() : "N/A",
                option.getInterpretation() != null ? option.getInterpretation() : "N/A",
                tagInstruction
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