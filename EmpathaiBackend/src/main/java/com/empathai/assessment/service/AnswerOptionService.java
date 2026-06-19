package com.empathai.assessment.service;

import com.empathai.assessment.dto.AnswerOptionRequest;
import com.empathai.assessment.dto.AnswerOptionResponse;
import com.empathai.assessment.entity.AnswerOption;
import com.empathai.assessment.entity.AssessmentQuestion;
import com.empathai.assessment.repository.AnswerOptionRepository;
import com.empathai.assessment.repository.AssessmentQuestionRepository;
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
    private final AssessmentQuestionRepository questionRepo;
    private final LlmMetricsTracker metricsTracker;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${openai.api.key:}")
    private String openaiApiKey;

    private static final String OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODEL = "gpt-4o";

    // ── Save / Upsert ─────────────────────────────────────────────────────────

    @Transactional
    public AnswerOptionResponse saveOption(AnswerOptionRequest request) {
        Optional<AnswerOption> existing = Optional.empty();
        if (request.getOptionIndex() != null) {
            existing = answerOptionRepo.findByQuestionIdAndOptionIndex(request.getQuestionId(), request.getOptionIndex());
        } else if (request.getOptionLabel() != null) {
            existing = answerOptionRepo.findByQuestionIdAndOptionLabel(request.getQuestionId(), request.getOptionLabel().trim());
        }

        boolean interpretationChanged = false;
        AnswerOption option;

        if (existing.isPresent()) {
            option = existing.get();

            interpretationChanged =
                    !Objects.equals(option.getOptionIndex(),     request.getOptionIndex()) ||
                            !Objects.equals(option.getOptionLabel(),     request.getOptionLabel()) ||
                            !Objects.equals(option.getRangeValue(),      request.getRange())       ||
                            !Objects.equals(option.getOverallMeaning(),  request.getOverallMeaning()) ||
                            !Objects.equals(option.getInterpretation(),  request.getInterpretation()) ||
                            !Objects.equals(option.getTag(),             request.getTag());

            if (request.getOptionIndex() != null) {
                option.setOptionIndex(request.getOptionIndex());
            }
            option.setOptionLabel(request.getOptionLabel());
            option.setRangeValue(request.getRange());
            option.setOverallMeaning(request.getOverallMeaning());
            option.setInterpretation(request.getInterpretation());
            option.setTag(request.getTag());

            if (interpretationChanged) {
                option.setCachedBullets(null);
                option.setBulletsGeneratedAt(null);
                option.setBulletsStatus("PENDING");
                log.info("Interpretation or index changed for optionId={} — cache invalidated", option.getId());
            }
        } else {
            option = AnswerOption.builder()
                    .questionId(request.getQuestionId())
                    .optionIndex(request.getOptionIndex() != null ? request.getOptionIndex() : 0)
                    .optionLabel(request.getOptionLabel())
                    .rangeValue(request.getRange())
                    .overallMeaning(request.getOverallMeaning())
                    .interpretation(request.getInterpretation())
                    .tag(request.getTag())
                    .bulletsStatus("PENDING")
                    .build();
            interpretationChanged = true;
        }

        AnswerOption saved = answerOptionRepo.save(option);
        log.info("Saved answer option id={} for questionId={}", saved.getId(), saved.getQuestionId());

        if (saved.getCachedBullets() != null && !interpretationChanged) {
            return toResponse(saved);
        }
        generateBulletsAsync(saved.getId());

        return toResponse(saved);
    }

    @Transactional
    public List<AnswerOptionResponse> saveOptions(List<AnswerOptionRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return Collections.emptyList();
        }

        Long questionId = requests.get(0).getQuestionId();
        if (questionId == null) {
            return requests.stream().map(this::saveOption).collect(Collectors.toList());
        }

        // Fetch existing AnswerOption rows for this question
        List<AnswerOption> dbOptions = answerOptionRepo.findByQuestionId(questionId);

        // Map dbOptions by optionIndex
        Map<Integer, AnswerOption> dbOptionMap = new HashMap<>();
        for (AnswerOption dbOpt : dbOptions) {
            if (dbOpt.getOptionIndex() != null) {
                dbOptionMap.put(dbOpt.getOptionIndex(), dbOpt);
            }
        }

        List<AnswerOptionResponse> responses = new ArrayList<>();
        Set<Integer> processedIndices = new HashSet<>();

        for (AnswerOptionRequest req : requests) {
            Integer reqIndex = req.getOptionIndex();
            // If optionIndex is not provided, we can fall back to matching by optionLabel if needed
            if (reqIndex == null) {
                Optional<AssessmentQuestion> questionOpt = questionRepo.findById(questionId);
                if (questionOpt.isPresent()) {
                    AssessmentQuestion q = questionOpt.get();
                    List<String> qOpts = Arrays.asList(q.getOptionA(), q.getOptionB(), q.getOptionC(), q.getOptionD());
                    for (int i = 0; i < qOpts.size(); i++) {
                        if (qOpts.get(i) != null && qOpts.get(i).trim().equalsIgnoreCase(req.getOptionLabel().trim())) {
                            reqIndex = i;
                            break;
                        }
                    }
                }
            }
            if (reqIndex == null) {
                reqIndex = 0; // Default fallback if no match found
            }

            processedIndices.add(reqIndex);

            AnswerOption optionToSave;
            boolean interpretationChanged = false;

            if (dbOptionMap.containsKey(reqIndex)) {
                optionToSave = dbOptionMap.get(reqIndex);

                interpretationChanged =
                        !Objects.equals(optionToSave.getOptionIndex(), reqIndex) ||
                        !Objects.equals(optionToSave.getOptionLabel(), req.getOptionLabel()) ||
                        !Objects.equals(optionToSave.getRangeValue(),  req.getRange()) ||
                        !Objects.equals(optionToSave.getOverallMeaning(), req.getOverallMeaning()) ||
                        !Objects.equals(optionToSave.getInterpretation(), req.getInterpretation()) ||
                        !Objects.equals(optionToSave.getTag(), req.getTag());

                optionToSave.setOptionIndex(reqIndex);
                optionToSave.setOptionLabel(req.getOptionLabel());
                optionToSave.setRangeValue(req.getRange());
                optionToSave.setOverallMeaning(req.getOverallMeaning());
                optionToSave.setInterpretation(req.getInterpretation());
                optionToSave.setTag(req.getTag());

                if (interpretationChanged) {
                    optionToSave.setCachedBullets(null);
                    optionToSave.setBulletsGeneratedAt(null);
                    optionToSave.setBulletsStatus("PENDING");
                    log.info("Label/Index/Interpretation changed for optionId={} — cache invalidated", optionToSave.getId());
                }
            } else {
                optionToSave = AnswerOption.builder()
                        .questionId(questionId)
                        .optionIndex(reqIndex)
                        .optionLabel(req.getOptionLabel())
                        .rangeValue(req.getRange())
                        .overallMeaning(req.getOverallMeaning())
                        .interpretation(req.getInterpretation())
                        .tag(req.getTag())
                        .bulletsStatus("PENDING")
                        .build();
                interpretationChanged = true;
            }

            AnswerOption saved = answerOptionRepo.save(optionToSave);
            log.info("Saved answer option id={} for questionId={} with index={}", saved.getId(), saved.getQuestionId(), saved.getOptionIndex());

            if (saved.getCachedBullets() != null && !interpretationChanged) {
                responses.add(toResponse(saved));
                continue;
            }
            generateBulletsAsync(saved.getId());

            responses.add(toResponse(saved));
        }

        // Delete any existing options that are not in the processed index set
        for (AnswerOption dbOpt : dbOptions) {
            if (dbOpt.getOptionIndex() != null && !processedIndices.contains(dbOpt.getOptionIndex())) {
                answerOptionRepo.delete(dbOpt);
                log.info("Deleted removed answer option id={} with index={} for questionId={}",
                        dbOpt.getId(), dbOpt.getOptionIndex(), questionId);
            }
        }

        return responses;
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
    public void generateBulletsAsync(Long optionId, boolean forceRetry) {
        answerOptionRepo.findById(optionId).ifPresent(option -> {
            if (option.getCachedBullets() != null && !option.getCachedBullets().isBlank()) {
                log.debug("Bullets already cached for option id={}", optionId);
                return;
            }
            if (!forceRetry && "FAILED".equals(option.getBulletsStatus())) {
                log.debug("Option id={} already marked as FAILED — skipping in standard requests", optionId);
                return;
            }

            option.setBulletsStatus("GENERATING");
            answerOptionRepo.save(option);

            try {
                String bullets = callLlmForBullets(option);
                if (bullets != null && !bullets.isBlank()) {
                    option.setCachedBullets(bullets);
                    option.setBulletsGeneratedAt(LocalDateTime.now());
                    option.setBulletsStatus("COMPLETED");
                    answerOptionRepo.save(option);
                    log.info("Cached bullets for option id={}", optionId);
                } else {
                    throw new RuntimeException("Generated bullets were empty");
                }
            } catch (Exception e) {
                option.setBulletsStatus("FAILED");
                answerOptionRepo.save(option);
                log.error("Failed to generate bullets for option id={} after all retries: {}", optionId, e.getMessage());
            }
        });
    }

    @Async
    public void generateBulletsAsync(Long optionId) {
        generateBulletsAsync(optionId, false);
    }

    public void pregenerateAllMissingBullets() {
        List<AnswerOption> uncached = answerOptionRepo.findAllUncached();
        log.info("Pre-generating bullets for {} uncached options (including retrying failed ones)", uncached.size());
        for (AnswerOption option : uncached) {
            generateBulletsAsync(option.getId(), true);
        }
    }

    // ── LLM Call ─────────────────────────────────────────────────────────────

    private String callLlmForBullets(AnswerOption option) {
        if (openaiApiKey == null || openaiApiKey.isBlank()) {
            log.warn("OPENAI_API_KEY not set — skipping bullet generation for option id={}", option.getId());
            return null;
        }

        String prompt = buildBulletPrompt(option);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + openaiApiKey);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", MODEL);
        body.put("max_tokens", 400);
        body.put("messages", List.of(Map.of("role", "user", "content", prompt)));

        int maxRetries = 3;
        int attempt = 0;
        long backoffMs = 1000;

        long startTime = System.currentTimeMillis();
        while (attempt < maxRetries) {
            try {
                attempt++;
                ResponseEntity<Map> response = restTemplate.postForEntity(
                        OPENAI_API_URL, new HttpEntity<>(body, headers), Map.class);

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    List<Map<String, Object>> choices =
                            (List<Map<String, Object>>) response.getBody().get("choices");
                    if (choices != null && !choices.isEmpty()) {
                        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                        String content = (String) message.get("content");
                        metricsTracker.recordSuccess(System.currentTimeMillis() - startTime);
                        return content;
                    }
                }
                throw new RuntimeException("Unsuccessful response code or empty body");
            } catch (Exception e) {
                log.warn("OpenAI bullet generation failed on attempt {}/{} for option id={}: {}", 
                        attempt, maxRetries, option.getId(), e.getMessage());
                if (attempt >= maxRetries) {
                    metricsTracker.recordFailure(System.currentTimeMillis() - startTime);
                    throw new RuntimeException("All retries exhausted", e);
                }
                long jitter = (long) (Math.random() * 200);
                long sleepTime = (backoffMs * (1L << (attempt - 1))) + jitter;
                try {
                    Thread.sleep(sleepTime);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    metricsTracker.recordFailure(System.currentTimeMillis() - startTime);
                    throw new RuntimeException("Retry sleep interrupted", ie);
                }
            }
        }
        metricsTracker.recordFailure(System.currentTimeMillis() - startTime);
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
                .optionIndex(o.getOptionIndex())
                .optionLabel(o.getOptionLabel())
                .rangeValue(o.getRangeValue())
                .overallMeaning(o.getOverallMeaning())
                .interpretation(o.getInterpretation())
                .tag(o.getTag())
                .cachedBullets(o.getCachedBullets())
                .bulletsGeneratedAt(o.getBulletsGeneratedAt())
                .bulletsStatus(o.getBulletsStatus())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .build();
    }
}