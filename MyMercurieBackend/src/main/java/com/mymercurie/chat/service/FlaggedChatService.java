package com.mymercurie.chat.service;

import com.mymercurie.chat.dto.*;
import com.mymercurie.chat.entity.*;
import com.mymercurie.chat.repository.ChatMessageRepository;
import com.mymercurie.chat.repository.ChatSessionRepository;
import com.mymercurie.chat.repository.FlaggedChatRepository;
import com.mymercurie.user.entity.Student;
import com.mymercurie.user.entity.User;
import com.mymercurie.user.exception.MyMercurieException;
import com.mymercurie.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlaggedChatService {

    private final FlaggedChatRepository flaggedChatRepository;
    private final ChatSessionRepository sessionRepo;
    private final ChatMessageRepository messageRepo;
    private final UserRepository userRepository;

    // ── Flag Creation (called from ChatService) ───────────────────────────────

    /**
     * Creates a FlaggedChat record when the AI detects a concerning message.
     * Safe to call inside the existing ChatService transaction.
     *
     * @param sessionId   ID of the current chat session
     * @param studentId   ID of the student
     * @param message     The raw student message that triggered the flag
     * @param flagReason  e.g. "Suicidal ideation / Self-harm"
     * @param sentiment   e.g. "Highly Concerned"
     * @param severityStr e.g. "critical" (lowercase from Python)
     */
    @Transactional
    public void createFlag(
            Long sessionId,
            Long studentId,
            String message,
            String flagReason,
            String sentiment,
            String severityStr
    ) {
        Severity severity;
        try {
            severity = Severity.valueOf(severityStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Unknown severity '{}' received from AI — defaulting to MEDIUM", severityStr);
            severity = Severity.MEDIUM;
        }

        // Avoid duplicate critical flags for the same session
        if (flaggedChatRepository.existsBySessionIdAndSeverity(sessionId, severity)) {
            log.info("Duplicate flag skipped for sessionId={} severity={}", sessionId, severity);
            return;
        }

        // Truncate message if needed
        String truncated = message.length() > 1000
                ? message.substring(0, 997) + "..."
                : message;

        FlaggedChat flag = FlaggedChat.builder()
                .sessionId(sessionId)
                .studentId(studentId)
                .lastMessage(truncated)
                .flagReason(flagReason)
                .sentiment(sentiment)
                .severity(severity)
                .status(FlagStatus.PENDING)
                .build();

        flaggedChatRepository.save(flag);
        log.info("Flag created: studentId={} severity={} reason={}",
                studentId, severity, flagReason);
    }

    // ── List with Filters ─────────────────────────────────────────────────────

    public Page<FlaggedChatResponse> getFlags(
            String severityStr,
            String statusStr,
            int page,
            int size
    ) {
        Severity severity = severityStr != null
                ? Severity.valueOf(severityStr.toUpperCase()) : null;
        FlagStatus status = statusStr != null
                ? FlagStatus.valueOf(statusStr.toUpperCase()) : null;

        return flaggedChatRepository
                .findAllWithFilters(severity, status, PageRequest.of(page, size))
                .map(this::toResponse);
    }

    // ── Dashboard Stats ───────────────────────────────────────────────────────

    public FlaggedChatStatsResponse getStats() {
        LocalDateTime startOfDay  = LocalDate.now().atStartOfDay();
        LocalDateTime startOfHour = LocalDateTime.now().minusHours(1);

        long totalToday  = flaggedChatRepository.countCreatedSince(startOfDay);
        long lastHour    = flaggedChatRepository.countCreatedSince(startOfHour);
        long critPending = flaggedChatRepository.countBySeverityAndStatus(
                Severity.CRITICAL, FlagStatus.PENDING);
        long total    = flaggedChatRepository.count();
        long actioned = flaggedChatRepository.countByStatusNot(FlagStatus.PENDING);

        double resolvedPct = total == 0
                ? 0.0
                : Math.round((actioned * 100.0 / total) * 10) / 10.0;

        // Average response time: placeholder
        double avgResponse = 14.0;

        return FlaggedChatStatsResponse.builder()
                .totalFlaggedToday(totalToday)
                .flaggedLastHour(lastHour)
                .criticalPending(critPending)
                .resolvedOrAssignedPercent(resolvedPct)
                .averageResponseMinutes(avgResponse)
                .build();
    }

    // ── Transcript View ───────────────────────────────────────────────────────

    /**
     * Returns the full message history for the session in which this flag
     * was created. Works for both CHAT and SCHEDULE sessions.
     * Restricted to authorised roles — enforced at controller level.
     */
    public ChatSessionResponse getTranscript(Long flagId) {
        FlaggedChat flag = flaggedChatRepository.findById(flagId)
                .orElseThrow(() -> new MyMercurieException(
                        "Flagged chat not found: " + flagId));

        // ✅ Use sessionId directly from the flag — works for both CHAT and SCHEDULE
        ChatSession session = sessionRepo.findById(flag.getSessionId())
                .orElseThrow(() -> new MyMercurieException(
                        "No session found for this flag"));

        // Security check — session must belong to the flagged student
        if (!session.getStudentId().equals(flag.getStudentId())) {
            throw new MyMercurieException(
                    "Session does not belong to flagged student");
        }

        List<ChatMessageResponse> messages = messageRepo
                .findBySessionIdOrderByCreatedAtAsc(session.getId())
                .stream()
                .map(m -> ChatMessageResponse.builder()
                        .id(m.getId())
                        .role(m.getRole())
                        .content(m.getContent())
                        .detectedMode(m.getDetectedMode())
                        .createdAt(m.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return ChatSessionResponse.builder()
                .id(session.getId())
                .weekStart(session.getWeekStart())
                .createdAt(session.getCreatedAt())
                .source(session.getSource())         // ✅ includes CHAT or SCHEDULE
                .messages(messages)
                .build();
    }

    // ── Assign ────────────────────────────────────────────────────────────────

    @Transactional
    public FlaggedChatResponse assign(Long flagId, AssignRequest request) {
        FlaggedChat flag = flaggedChatRepository.findById(flagId)
                .orElseThrow(() -> new MyMercurieException(
                        "Flagged chat not found: " + flagId));

        // Validate psychologist exists
        userRepository.findById(request.getPsychologistId())
                .orElseThrow(() -> new MyMercurieException(
                        "Psychologist not found: " + request.getPsychologistId()));

        flag.setAssignedPsychologistId(request.getPsychologistId());
        flag.setStatus(FlagStatus.ASSIGNED);

        return toResponse(flaggedChatRepository.save(flag));
    }

    // ── Update Status ─────────────────────────────────────────────────────────

    @Transactional
    public FlaggedChatResponse updateStatus(Long flagId, UpdateStatusRequest request) {
        FlaggedChat flag = flaggedChatRepository.findById(flagId)
                .orElseThrow(() -> new MyMercurieException(
                        "Flagged chat not found: " + flagId));

        flag.setStatus(request.getStatus());
        return toResponse(flaggedChatRepository.save(flag));
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private FlaggedChatResponse toResponse(FlaggedChat flag) {
        FlaggedChatResponse.FlaggedChatResponseBuilder builder =
                FlaggedChatResponse.builder()
                        .id(flag.getId())
                        .sessionId(flag.getSessionId())
                        .studentId(flag.getStudentId())
                        .lastMessage(flag.getLastMessage())
                        .flagReason(flag.getFlagReason())
                        .sentiment(flag.getSentiment())
                        .severity(flag.getSeverity())
                        .status(flag.getStatus())
                        .assignedPsychologistId(flag.getAssignedPsychologistId())
                        .createdAt(flag.getCreatedAt())
                        .updatedAt(flag.getUpdatedAt());

        // Enrich with student info
        userRepository.findById(flag.getStudentId()).ifPresent(user -> {
            builder.studentName(user.getName());
            if (user instanceof Student s) {
                builder.studentClass(s.getClassName());
                builder.school(s.getSchoolId() != null
                        ? String.valueOf(s.getSchoolId()) : null);
            }
        });

        // Enrich with psychologist name if assigned
        if (flag.getAssignedPsychologistId() != null) {
            userRepository.findById(flag.getAssignedPsychologistId())
                    .ifPresent(p -> builder.assignedPsychologistName(p.getName()));
        }

        return builder.build();
    }
}