package com.empathai.chat.service;

import com.empathai.chat.dto.*;
import com.empathai.chat.entity.ChatMessage;
import com.empathai.chat.entity.ChatSession;
import com.empathai.chat.entity.ChatUsage;
import com.empathai.chat.repository.ChatMessageRepository;
import com.empathai.chat.repository.ChatSessionRepository;
import com.empathai.chat.repository.ChatUsageRepository;
import com.empathai.user.entity.Student;
import com.empathai.user.entity.User;
import com.empathai.user.exception.EmpathaiException;
import com.empathai.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatSessionRepository sessionRepo;
    private final ChatMessageRepository messageRepo;
    private final ChatUsageRepository usageRepo;
    private final UserRepository userRepository;
    private final WebClient.Builder webClientBuilder;
    private final FlaggedChatService flaggedChatService;

    @Value("${app.chat.daily-limit:20}")
    private int dailyLimit;

    @Value("${chatbot.ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Transactional
    public ChatMessageResponse sendMessage(
            Long studentId,
            String message,
            String imageBase64,
            String imageMimeType
    ) {
        log.info("Processing sendMessage for studentId: {}", studentId);

        checkDailyLimit(studentId);

        if (isCrisisMessage(message)) {
            log.info("Crisis detected in message from studentId: {}", studentId);
            return handleCrisisResponse(studentId, message);
        }

        LocalDate weekStart = getCurrentWeekStart();
        ChatSession session = sessionRepo.findByStudentIdAndWeekStart(studentId, weekStart)
                .orElseGet(() -> {
                    log.info("Creating new chat session for studentId: {} for week: {}", studentId, weekStart);
                    return sessionRepo.save(ChatSession.builder()
                            .studentId(studentId)
                            .weekStart(weekStart)
                            .build());
                });

        List<ChatMessage> recentMessages = messageRepo.findTop10BySessionIdOrderByCreatedAtDesc(session.getId());
        Collections.reverse(recentMessages);

        List<Map<String, String>> history = recentMessages.stream()
                .map(m -> {
                    Map<String, String> msgMap = new java.util.HashMap<>();
                    msgMap.put("role", m.getRole());
                    msgMap.put("content", m.getContent());
                    return msgMap;
                })
                .collect(Collectors.toList());

        User user = userRepository.findById(studentId)
                .orElseThrow(() -> new EmpathaiException("Student not found"));
        String grade = (user instanceof Student s)
                ? (s.getClassName() != null ? s.getClassName() : "1st Standard")
                : "1st Standard";

        Map<String, Object> aiRequest = new java.util.HashMap<>();
        aiRequest.put("student_name", user.getName());
        aiRequest.put("grade", grade);
        aiRequest.put("message", message);
        aiRequest.put("history", history);

        // ── Pass image data if present ────────────────────────────────────────
        if (imageBase64 != null && !imageBase64.isEmpty()) {
            aiRequest.put("image_base64", imageBase64);
            aiRequest.put("image_mime_type", imageMimeType);
            log.info("Image attached for studentId: {} mimeType: {}", studentId, imageMimeType);
        }

        log.info("Calling AI service at: {}/chat", aiServiceUrl);

        Map<String, Object> aiResponse;
        try {
            aiResponse = webClientBuilder.build()
                    .post()
                    .uri(aiServiceUrl + "/chat")
                    .bodyValue(aiRequest)
                    .retrieve()
                    .onStatus(status -> status.is5xxServerError(),
                            response -> response.bodyToMono(String.class)
                                    .map(body -> new EmpathaiException("AI service error: " + body)))
                    .bodyToMono(Map.class)
                    .timeout(java.time.Duration.ofSeconds(60))
                    .block();
        } catch (Exception e) {
            log.error("AI service call failed: {}", e.getMessage());
            throw new EmpathaiException("ChatBuddy is temporarily unavailable. Please try again in a moment.");
        }

        if (aiResponse == null) {
            log.error("AI service returned null response");
            throw new EmpathaiException("Received empty response from AI service");
        }

        String reply        = (String) aiResponse.get("reply");
        String detectedMode = (String) aiResponse.getOrDefault("detected_mode", "curriculum");

        log.info("AI response received. Mode: {}", detectedMode);

        Boolean isFlagged = (Boolean) aiResponse.get("is_flagged");
        if (Boolean.TRUE.equals(isFlagged)) {
            String flagReason = (String) aiResponse.get("flag_reason");
            String sentiment  = (String) aiResponse.get("sentiment");
            String severity   = (String) aiResponse.get("severity");
            log.info("Flag detected: studentId={} severity={} reason={}", studentId, severity, flagReason);
            try {
                flaggedChatService.createFlag(
                        session.getId(), studentId, message,
                        flagReason != null ? flagReason : "Unspecified",
                        sentiment  != null ? sentiment  : "Concerned",
                        severity   != null ? severity   : "medium"
                );
            } catch (Exception ex) {
                log.error("Failed to create support alert flag: {}", ex.getMessage(), ex);
            }
        }

        messageRepo.save(ChatMessage.builder()
                .sessionId(session.getId())
                .role("user")
                .content(message)
                .detectedMode(detectedMode)
                .build());

        ChatMessage savedReply = messageRepo.save(ChatMessage.builder()
                .sessionId(session.getId())
                .role("assistant")
                .content(reply)
                .detectedMode(detectedMode)
                .build());

        incrementUsage(studentId);
        return toMessageResponse(savedReply);
    }

    public List<ChatSessionResponse> getSessions(Long studentId) {
        return sessionRepo.findByStudentIdOrderByWeekStartDesc(studentId).stream()
                .map(s -> ChatSessionResponse.builder()
                        .id(s.getId())
                        .weekStart(s.getWeekStart())
                        .createdAt(s.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    public ChatSessionResponse getSessionMessages(Long sessionId, Long studentId) {
        ChatSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new EmpathaiException("Session not found"));
        if (!session.getStudentId().equals(studentId)) throw new EmpathaiException("Access denied");
        List<ChatMessageResponse> messages = messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream().map(this::toMessageResponse).collect(Collectors.toList());
        return ChatSessionResponse.builder()
                .id(session.getId())
                .weekStart(session.getWeekStart())
                .createdAt(session.getCreatedAt())
                .messages(messages)
                .build();
    }

    public ChatUsageResponse getUsage(Long studentId) {
        int used = usageRepo.findByStudentIdAndUsageDate(studentId, LocalDate.now())
                .map(ChatUsage::getMessageCount).orElse(0);
        return ChatUsageResponse.builder()
                .used(used).limit(dailyLimit).remaining(Math.max(0, dailyLimit - used))
                .build();
    }

    private void checkDailyLimit(Long studentId) {
        int used = usageRepo.findByStudentIdAndUsageDate(studentId, LocalDate.now())
                .map(ChatUsage::getMessageCount).orElse(0);
        if (used >= dailyLimit)
            throw new EmpathaiException("Daily message limit of " + dailyLimit + " reached. Try again tomorrow!");
    }

    private void incrementUsage(Long studentId) {
        ChatUsage usage = usageRepo.findByStudentIdAndUsageDate(studentId, LocalDate.now())
                .orElseGet(() -> ChatUsage.builder()
                        .studentId(studentId).usageDate(LocalDate.now()).messageCount(0).build());
        usage.setMessageCount(usage.getMessageCount() + 1);
        usageRepo.save(usage);
    }

    private LocalDate getCurrentWeekStart() {
        return LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    private boolean isCrisisMessage(String message) {
        if (message == null) return false;
        String lower = message.toLowerCase();
        return lower.contains("suicide") || lower.contains("kill myself") ||
                lower.contains("end my life") || lower.contains("want to die");
    }

    private ChatMessageResponse handleCrisisResponse(Long studentId, String message) {
        LocalDate weekStart = getCurrentWeekStart();
        ChatSession session = sessionRepo.findByStudentIdAndWeekStart(studentId, weekStart)
                .orElseGet(() -> sessionRepo.save(ChatSession.builder()
                        .studentId(studentId).weekStart(weekStart).build()));

        String crisisReply = "I'm really sorry to hear that you're feeling this way. Please know that you're not alone, and there's help available. You can reach out to the iCall helpline at 9152987821. They are there to support you.";

        messageRepo.save(ChatMessage.builder().sessionId(session.getId()).role("user")
                .content(message).detectedMode("mental_health").build());

        ChatMessage savedReply = messageRepo.save(ChatMessage.builder().sessionId(session.getId())
                .role("assistant").content(crisisReply).detectedMode("mental_health").build());

        try {
            flaggedChatService.createFlag(session.getId(), studentId, message,
                    "Suicidal ideation / Self-harm", "Highly Concerned", "critical");
        } catch (Exception ex) {
            log.error("Failed to create crisis flag: {}", ex.getMessage(), ex);
        }

        return toMessageResponse(savedReply);
    }

    private ChatMessageResponse toMessageResponse(ChatMessage m) {
        return ChatMessageResponse.builder()
                .id(m.getId()).role(m.getRole()).content(m.getContent())
                .detectedMode(m.getDetectedMode()).createdAt(m.getCreatedAt())
                .build();
    }
}