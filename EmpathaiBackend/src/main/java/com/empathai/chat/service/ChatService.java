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

    @Value("${app.chat.daily-limit:20}")
    private int dailyLimit;

    @Value("${chatbot.ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    // ── Send Message ─────────────────────────────────────────────────────────

    @Transactional
    public ChatMessageResponse sendMessage(Long studentId, String message) {
        // 1. Check daily limit
        checkDailyLimit(studentId);

        // 2. Get or create the current week's session
        LocalDate weekStart = getCurrentWeekStart();
        ChatSession session = sessionRepo.findByStudentIdAndWeekStart(studentId, weekStart)
                .orElseGet(() -> sessionRepo.save(ChatSession.builder()
                        .studentId(studentId)
                        .weekStart(weekStart)
                        .build()));

        // 3. Load last 10 messages for context
        List<ChatMessage> recentMessages = messageRepo.findTop10BySessionIdOrderByCreatedAtDesc(session.getId());
        Collections.reverse(recentMessages); // oldest first for GPT

        // 4. Build history payload for Python service
        List<Map<String, String>> history = recentMessages.stream()
                .map(m -> Map.of("role", m.getRole(), "content", m.getContent()))
                .collect(Collectors.toList());

        // 5. Get student name and grade
        User user = userRepository.findById(studentId)
                .orElseThrow(() -> new EmpathaiException("Student not found"));
        String grade = (user instanceof Student s) ? (s.getClassName() != null ? s.getClassName() : "1st Standard") : "1st Standard";

        // 6. Call Python AI service
        Map<String, Object> aiRequest = Map.of(
                "student_name", user.getName(),
                "grade", grade,
                "message", message,
                "history", history
        );

        @SuppressWarnings("unchecked")
        Map<String, Object> aiResponse = webClientBuilder.build()
                .post()
                .uri(aiServiceUrl + "/chat")
                .bodyValue(aiRequest)
                .retrieve()
                .onStatus(status -> status.is5xxServerError(),
                        response -> response.bodyToMono(String.class)
                                .map(body -> new EmpathaiException("AI service error: " + body)))
                .bodyToMono(Map.class)
                .block();

        if (aiResponse == null) {
            throw new EmpathaiException("Received empty response from AI service");
        }

        String reply = (String) aiResponse.get("reply");
        String detectedMode = (String) aiResponse.getOrDefault("detected_mode", "curriculum");

        // 7. Save student message
        messageRepo.save(ChatMessage.builder()
                .sessionId(session.getId())
                .role("user")
                .content(message)
                .detectedMode(detectedMode)
                .build());

        // 8. Save AI reply
        ChatMessage savedReply = messageRepo.save(ChatMessage.builder()
                .sessionId(session.getId())
                .role("assistant")
                .content(reply)
                .detectedMode(detectedMode)
                .build());

        // 9. Increment daily usage
        incrementUsage(studentId);

        log.debug("Chat message processed for student {} | mode: {}", studentId, detectedMode);

        return toMessageResponse(savedReply);
    }

    // ── Sessions ─────────────────────────────────────────────────────────────

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
        if (!session.getStudentId().equals(studentId)) {
            throw new EmpathaiException("Access denied");
        }
        List<ChatMessageResponse> messages = messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream().map(this::toMessageResponse).collect(Collectors.toList());
        return ChatSessionResponse.builder()
                .id(session.getId())
                .weekStart(session.getWeekStart())
                .createdAt(session.getCreatedAt())
                .messages(messages)
                .build();
    }

    // ── Usage ─────────────────────────────────────────────────────────────────

    public ChatUsageResponse getUsage(Long studentId) {
        int used = usageRepo.findByStudentIdAndUsageDate(studentId, LocalDate.now())
                .map(ChatUsage::getMessageCount).orElse(0);
        return ChatUsageResponse.builder()
                .used(used)
                .limit(dailyLimit)
                .remaining(Math.max(0, dailyLimit - used))
                .build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void checkDailyLimit(Long studentId) {
        int used = usageRepo.findByStudentIdAndUsageDate(studentId, LocalDate.now())
                .map(ChatUsage::getMessageCount).orElse(0);
        if (used >= dailyLimit) {
            throw new EmpathaiException("Daily message limit of " + dailyLimit + " reached. Try again tomorrow!");
        }
    }

    private void incrementUsage(Long studentId) {
        ChatUsage usage = usageRepo.findByStudentIdAndUsageDate(studentId, LocalDate.now())
                .orElseGet(() -> ChatUsage.builder()
                        .studentId(studentId)
                        .usageDate(LocalDate.now())
                        .messageCount(0)
                        .build());
        usage.setMessageCount(usage.getMessageCount() + 1);
        usageRepo.save(usage);
    }

    private LocalDate getCurrentWeekStart() {
        return LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    private ChatMessageResponse toMessageResponse(ChatMessage m) {
        return ChatMessageResponse.builder()
                .id(m.getId())
                .role(m.getRole())
                .content(m.getContent())
                .detectedMode(m.getDetectedMode())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
