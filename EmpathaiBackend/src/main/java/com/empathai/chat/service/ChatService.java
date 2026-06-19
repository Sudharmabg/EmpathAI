package com.empathai.chat.service;

import com.empathai.activities.repository.StudentGoalRepository;
import com.empathai.assessment.entity.AssessmentReport;
import com.empathai.assessment.repository.AssessmentReportRepository;
import com.empathai.chat.dto.*;
import com.empathai.chat.entity.ChatMessage;
import com.empathai.chat.entity.ChatSession;
import com.empathai.chat.entity.ChatUsage;
import com.empathai.chat.repository.ChatMessageRepository;
import com.empathai.chat.repository.ChatSessionRepository;
import com.empathai.chat.repository.ChatUsageRepository;
import com.empathai.schedule.entity.ScheduleTask;
import com.empathai.schedule.repository.ExamDateRepository;
import com.empathai.schedule.repository.ScheduleTaskRepository;
import com.empathai.schedule.repository.StudentSchedulePreferenceRepository;
import com.empathai.user.entity.Student;
import com.empathai.user.entity.User;
import com.empathai.user.exception.EmpathaiException;
import com.empathai.user.repository.UserRepository;
import com.empathai.wellness.entity.MoodEntry;
import com.empathai.wellness.entity.SleepEntry;
import com.empathai.wellness.repository.MoodEntryRepository;
import com.empathai.wellness.repository.SleepEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
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

    // ── Repositories for context enrichment ───────────────────────────────────
    private final ScheduleTaskRepository scheduleTaskRepository;
    private final ExamDateRepository examDateRepository;
    private final StudentGoalRepository studentGoalRepository;
    private final StudentSchedulePreferenceRepository preferenceRepository;

    // ── Repositories for emotional context ────────────────────────────────────
    private final MoodEntryRepository moodEntryRepository;
    private final SleepEntryRepository sleepEntryRepository;
    private final AssessmentReportRepository assessmentReportRepository;

    @Value("${app.chat.daily-limit:20}")
    private int dailyLimit;

    @Value("${chatbot.ai-service.url:http://localhost:8000}")
    private String aiServiceUrl;

    // ─────────────────────────────────────────────────────────────────────────
    // SEND MESSAGE (ChatBuddy — goes through Python LangGraph pipeline)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public ChatMessageResponse sendMessage(
            Long studentId,
            String message,
            List<String> images,
            String imageBase64,
            String imageMimeType
    ) {
        log.info("Processing sendMessage for studentId: {}", studentId);

        checkDailyLimit(studentId);

        LocalDate weekStart = getCurrentWeekStart();

        // ── Find or create a CHAT session for this week ───────────────────────
        ChatSession session = sessionRepo
                .findByStudentIdAndWeekStartAndSource(studentId, weekStart, "CHAT")
                .orElseGet(() -> {
                    log.info("Creating new CHAT session for studentId: {} week: {}",
                            studentId, weekStart);
                    return sessionRepo.save(ChatSession.builder()
                            .studentId(studentId)
                            .weekStart(weekStart)
                            .source("CHAT")
                            .build());
                });

        // ── Fetch user info ───────────────────────────────────────────────────
        User user = userRepository.findById(studentId)
                .orElseThrow(() -> new EmpathaiException("Student not found"));

        String grade = (user instanceof Student s)
                ? (s.getClassName() != null ? s.getClassName() : "1st Standard")
                : "1st Standard";

        Long schoolId    = (user instanceof Student s) ? s.getSchoolId()   : null;
        String className = (user instanceof Student s) ? s.getClassName() : null;

        // ── Build enriched AI request ──────────────────────────────────────────
        // ✅ student_id added — used as LangGraph thread_id
        // ✅ history removed — LangGraph SQLite checkpointer manages it automatically
        Map<String, Object> aiRequest = new HashMap<>();
        aiRequest.put("student_id",   String.valueOf(studentId));
        aiRequest.put("student_name", user.getName());
        aiRequest.put("grade",        grade);
        aiRequest.put("message",      message);
        aiRequest.put("images",       images != null ? images : Collections.emptyList());

        if (imageBase64 != null && !imageBase64.isEmpty()) {
            aiRequest.put("image_base64",    imageBase64);
            aiRequest.put("image_mime_type", imageMimeType);
            log.info("Image attached for studentId: {} mimeType: {}", studentId, imageMimeType);
        }

        // ── Schedule context ───────────────────────────────────────────────────
        aiRequest.put("today_tasks",               buildTodayTasks(studentId));
        aiRequest.put("upcoming_exams",            buildUpcomingExams(schoolId, className));
        aiRequest.put("active_goals",              buildActiveGoals(studentId));
        aiRequest.put("preferred_study_time",      getPreferredStudyTime(studentId));
        aiRequest.put("tasks_completed_this_week", getCompletedTasksCount(studentId));
        aiRequest.put("tasks_total_this_week",     getTotalTasksCount(studentId));

        // ── Emotional context ──────────────────────────────────────────────────
        aiRequest.put("weekly_mood_history", buildWeeklyMoodHistory(studentId));
        aiRequest.put("assessment_summary",  buildAssessmentSummary(studentId));

        MoodEntry latestMood = moodEntryRepository
                .findFirstByStudentIdOrderByLoggedAtDesc(studentId)
                .orElse(null);
        aiRequest.put("mood_label",        latestMood != null ? latestMood.getMood() : null);
        aiRequest.put("latest_mood_score", mapMoodToScore(
                latestMood != null ? latestMood.getMood() : null));

        SleepEntry latestSleep = sleepEntryRepository
                .findFirstByStudentIdOrderByLoggedAtDesc(studentId)
                .orElse(null);
        if (latestSleep != null) {
            aiRequest.put("sleep_hours",   calculateSleepHours(latestSleep.getBedtime(), latestSleep.getWakeTime()));
            aiRequest.put("sleep_quality", latestSleep.getQuality());
        } else {
            aiRequest.put("sleep_hours",   null);
            aiRequest.put("sleep_quality", null);
        }
        aiRequest.put("current_mood", latestMood != null ? latestMood.getMood() : null);

        log.info("Calling AI service at: {}/chat", aiServiceUrl);

        // ── Call Python LangGraph service ──────────────────────────────────────
        Map<String, Object> aiResponse;
        try {
            String requestId = org.slf4j.MDC.get("requestId");
            if (requestId == null || requestId.isBlank()) {
                requestId = java.util.UUID.randomUUID().toString();
            }

            aiResponse = webClientBuilder.build()
                    .post()
                    .uri(aiServiceUrl + "/chat")
                    .header("X-Request-ID", requestId)
                    .bodyValue(aiRequest)
                    .retrieve()
                    .onStatus(
                            status -> status.is5xxServerError(),
                            response -> response.bodyToMono(String.class)
                                    .map(body -> new EmpathaiException("AI service error: " + body))
                    )
                    .bodyToMono(Map.class)
                    .timeout(java.time.Duration.ofSeconds(60))
                    .block();
        } catch (Exception e) {
            log.error("AI service call failed: {}", e.getMessage());
            throw new EmpathaiException(
                    "ChatBuddy is temporarily unavailable. Please try again in a moment.");
        }

        if (aiResponse == null) {
            log.error("AI service returned null response");
            throw new EmpathaiException("Received empty response from AI service");
        }

        String reply        = (String) aiResponse.get("reply");
        String detectedMode = (String) aiResponse.getOrDefault("detected_mode", "curriculum");

        log.info("AI response received. Mode: {}", detectedMode);

        // ── Handle flagged responses ───────────────────────────────────────────
        Boolean isFlagged = (Boolean) aiResponse.get("is_flagged");
        if (Boolean.TRUE.equals(isFlagged)) {
            String flagReason = (String) aiResponse.get("flag_reason");
            String sentiment  = (String) aiResponse.get("sentiment");
            String severity   = (String) aiResponse.get("severity");
            log.info("Flag detected: studentId={} severity={} reason={}",
                    studentId, severity, flagReason);
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

        // ── Save user message to MySQL ─────────────────────────────────────────
        messageRepo.save(ChatMessage.builder()
                .sessionId(session.getId())
                .role("user")
                .content(message)
                .detectedMode(detectedMode)
                .imageBase64(imageBase64)
                .imageMimeType(imageMimeType)
                .build());

        // ── Save assistant reply to MySQL ──────────────────────────────────────
        ChatMessage savedReply = messageRepo.save(ChatMessage.builder()
                .sessionId(session.getId())
                .role("assistant")
                .content(reply)
                .detectedMode(detectedMode)
                .build());

        incrementUsage(studentId);
        return toMessageResponse(savedReply);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOG SCHEDULE MESSAGE (Schedule Assistant — no Python LLM call)
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public ChatSession findOrCreateScheduleSession(Long studentId, LocalDate weekStart) {
        return sessionRepo
                .findByStudentIdAndWeekStartAndSource(studentId, weekStart, "SCHEDULE")
                .orElseGet(() -> {
                    log.info("Creating new SCHEDULE session for studentId: {}", studentId);
                    return sessionRepo.save(ChatSession.builder()
                            .studentId(studentId)
                            .weekStart(weekStart)
                            .source("SCHEDULE")
                            .build());
                });
    }

    @Transactional
    public void logScheduleMessage(
            Long studentId,
            String userMessage,
            String assistantMessage
    ) {
        log.info("Logging Schedule Assistant message for studentId: {}", studentId);

        LocalDate weekStart = getCurrentWeekStart();

        ChatSession session;
        try {
            session = findOrCreateScheduleSession(studentId, weekStart);
        } catch (Exception e) {
            log.warn("Session creation failed, retrying fetch: {}", e.getMessage());
            session = sessionRepo
                    .findByStudentIdAndWeekStartAndSource(studentId, weekStart, "SCHEDULE")
                    .orElseThrow(() -> new EmpathaiException("Could not find or create session"));
        }

        // ── Save user message ──────────────────────────────────────────────────
        messageRepo.save(ChatMessage.builder()
                .sessionId(session.getId())
                .role("user")
                .content(userMessage)
                .detectedMode("schedule")
                .build());

        // ── Save assistant message ─────────────────────────────────────────────
        messageRepo.save(ChatMessage.builder()
                .sessionId(session.getId())
                .role("assistant")
                .content(assistantMessage)
                .detectedMode("schedule")
                .build());

        log.info("Schedule Assistant messages logged for sessionId: {}", session.getId());
    }
    // ─────────────────────────────────────────────────────────────────────────
    // GET OR CREATE SCHEDULE SESSION ID (used by CrisisCheckController)
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional
    public Long getOrCreateScheduleSessionId(Long studentId, LocalDate weekStart) {
        return sessionRepo
                .findByStudentIdAndWeekStartAndSource(studentId, weekStart, "SCHEDULE")
                .orElseGet(() -> sessionRepo.save(ChatSession.builder()
                        .studentId(studentId)
                        .weekStart(weekStart)
                        .source("SCHEDULE")
                        .build()))
                .getId();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SESSIONS & USAGE
    // ─────────────────────────────────────────────────────────────────────────

    public List<ChatSessionResponse> getSessions(Long studentId) {
        return sessionRepo.findByStudentIdOrderByWeekStartDesc(studentId).stream()
                .map(s -> {
                    LocalDateTime lastMessageAt = messageRepo
                            .findTopBySessionIdOrderByCreatedAtDesc(s.getId())
                            .map(ChatMessage::getCreatedAt)
                            .orElse(s.getCreatedAt());

                    return ChatSessionResponse.builder()
                            .id(s.getId())
                            .weekStart(s.getWeekStart())
                            .createdAt(lastMessageAt)
                            .source(s.getSource())
                            .build();
                })
                // ✅ Sort by latest message time — most recent chat on top
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .collect(Collectors.toList());
    }
    public ChatSessionResponse getSessionMessages(Long sessionId, Long studentId) {
        ChatSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new EmpathaiException("Session not found"));

        if (!session.getStudentId().equals(studentId))
            throw new EmpathaiException("Access denied");

        List<ChatMessageResponse> messages = messageRepo
                .findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(this::toMessageResponse)
                .collect(Collectors.toList());

        return ChatSessionResponse.builder()
                .id(session.getId())
                .weekStart(session.getWeekStart())
                .createdAt(session.getCreatedAt())
                .source(session.getSource())
                .messages(messages)
                .build();
    }

    public ChatUsageResponse getUsage(Long studentId) {
        int used = usageRepo.findByStudentIdAndUsageDate(studentId, LocalDate.now())
                .map(ChatUsage::getMessageCount).orElse(0);
        return ChatUsageResponse.builder()
                .used(used)
                .limit(dailyLimit)
                .remaining(Math.max(0, dailyLimit - used))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONTEXT HELPER METHODS
    // ─────────────────────────────────────────────────────────────────────────

    private List<Map<String, Object>> buildTodayTasks(Long studentId) {
        try {
            String today = LocalDate.now().getDayOfWeek()
                    .getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH);
            today = today.substring(0, 1).toUpperCase() + today.substring(1).toLowerCase();
            List<ScheduleTask> tasks = scheduleTaskRepository
                    .findByStudentIdAndDayOfWeek(studentId, today);
            return tasks.stream().map(t -> {
                Map<String, Object> map = new HashMap<>();
                map.put("title",        t.getTitle());
                map.put("startTime",    t.getStartTime());
                map.put("endTime",      t.getEndTime());
                map.put("completed",    t.isCompleted());
                map.put("detectedType", t.getDetectedType());
                return map;
            }).collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("Failed to fetch today's tasks for studentId={}: {}",
                    studentId, e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<Map<String, Object>> buildUpcomingExams(Long schoolId, String className) {
        try {
            if (schoolId == null || className == null) return Collections.emptyList();
            LocalDate today = LocalDate.now();
            return examDateRepository
                    .findBySchoolIdAndClassNameAndExamDateAfterOrderByExamDateAsc(
                            schoolId, className, today)
                    .stream()
                    .map(e -> {
                        long days    = ChronoUnit.DAYS.between(today, e.getExamDate());
                        String urgency = days <= 7 ? "URGENT"
                                : days <= 14 ? "UPCOMING"
                                : "NORMAL";
                        Map<String, Object> map = new HashMap<>();
                        map.put("subjectName",   e.getSubjectName());
                        map.put("examDate",      e.getExamDate().toString());
                        map.put("daysRemaining", days);
                        map.put("urgency",       urgency);
                        return map;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("Failed to fetch upcoming exams: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<Map<String, Object>> buildActiveGoals(Long studentId) {
        try {
            return studentGoalRepository.findByStudentIdAndActiveTrue(studentId)
                    .stream()
                    .map(g -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("subjectTag", g.getSubjectTag());
                        map.put("goalText",   g.getGoalText());
                        if (g.getTargetDate() != null) {
                            long daysLeft = ChronoUnit.DAYS.between(
                                    LocalDate.now(), g.getTargetDate());
                            map.put("daysRemaining", daysLeft);
                            map.put("targetDate",    g.getTargetDate().toString());
                        }
                        return map;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("Failed to fetch active goals for studentId={}: {}",
                    studentId, e.getMessage());
            return Collections.emptyList();
        }
    }

    private String getPreferredStudyTime(Long studentId) {
        try {
            return preferenceRepository.findByStudentId(studentId)
                    .map(p -> p.getPreferredStudyTime())
                    .orElse(null);
        } catch (Exception e) {
            log.warn("Failed to fetch preferred study time for studentId={}: {}",
                    studentId, e.getMessage());
            return null;
        }
    }

    private int getCompletedTasksCount(Long studentId) {
        try {
            List<String> weekDays = List.of(
                    "Monday", "Tuesday", "Wednesday",
                    "Thursday", "Friday", "Saturday", "Sunday");
            return (int) scheduleTaskRepository
                    .findByStudentIdAndDayOfWeekIn(studentId, weekDays)
                    .stream()
                    .filter(ScheduleTask::isCompleted)
                    .count();
        } catch (Exception e) {
            log.warn("Failed to fetch completed tasks count: {}", e.getMessage());
            return 0;
        }
    }

    private int getTotalTasksCount(Long studentId) {
        try {
            List<String> weekDays = List.of(
                    "Monday", "Tuesday", "Wednesday",
                    "Thursday", "Friday", "Saturday", "Sunday");
            return scheduleTaskRepository
                    .findByStudentIdAndDayOfWeekIn(studentId, weekDays)
                    .size();
        } catch (Exception e) {
            log.warn("Failed to fetch total tasks count: {}", e.getMessage());
            return 0;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EMOTIONAL CONTEXT HELPER METHODS
    // ─────────────────────────────────────────────────────────────────────────

    private List<Map<String, Object>> buildWeeklyMoodHistory(Long studentId) {
        try {
            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
            List<MoodEntry> moods = moodEntryRepository
                    .findByStudentIdAndLoggedAtAfterOrderByLoggedAtDesc(
                            studentId, sevenDaysAgo);
            return moods.stream().map(m -> {
                Map<String, Object> map = new HashMap<>();
                map.put("mood",     m.getMood());
                map.put("note",     m.getNote());
                map.put("loggedAt", m.getLoggedAt().toString());
                map.put("daysAgo",  ChronoUnit.DAYS.between(
                        m.getLoggedAt().toLocalDate(), LocalDate.now()));
                return map;
            }).collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("Failed to fetch weekly mood history for studentId={}: {}",
                    studentId, e.getMessage());
            return Collections.emptyList();
        }
    }

    private Map<String, Object> buildAssessmentSummary(Long studentId) {
        try {
            Optional<AssessmentReport> latest = assessmentReportRepository
                    .findLatestByStudentId(String.valueOf(studentId));
            if (latest.isEmpty()) return null;
            AssessmentReport r = latest.get();
            Map<String, Object> map = new HashMap<>();
            map.put("groupName",   r.getGroupName());
            map.put("summaryText", r.getSummaryText());
            map.put("bulletPoints",r.getBulletPoints());
            map.put("sessionDate", r.getSessionDate() != null
                    ? r.getSessionDate().toString() : null);
            map.put("daysAgo",     r.getSessionDate() != null
                    ? ChronoUnit.DAYS.between(r.getSessionDate(), LocalDate.now())
                    : null);
            return map;
        } catch (Exception e) {
            log.warn("Failed to fetch assessment summary for studentId={}: {}",
                    studentId, e.getMessage());
            return null;
        }
    }


    private Double calculateSleepHours(String bedtime, String wakeTime) {
        try {
            java.time.LocalTime bed  = java.time.LocalTime.parse(bedtime);
            java.time.LocalTime wake = java.time.LocalTime.parse(wakeTime);
            long minutes = java.time.Duration.between(bed, wake).toMinutes();
            if (minutes < 0) minutes += 24 * 60; // overnight
            return Math.round((minutes / 60.0) * 10.0) / 10.0;
        } catch (Exception e) {
            log.warn("Could not parse sleep times bedtime={} wakeTime={}", bedtime, wakeTime);
            return null;
        }
    }

    private Integer mapMoodToScore(String mood) {
        if (mood == null) return null;
        return switch (mood.toLowerCase()) {
            case "happy"   -> 5;
            case "neutral" -> 3;
            case "sad"     -> 2;
            case "anxious" -> 2;
            case "angry"   -> 1;
            default        -> 3;
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE UTILITIES
    // ─────────────────────────────────────────────────────────────────────────

    private void checkDailyLimit(Long studentId) {
        int used = usageRepo.findByStudentIdAndUsageDate(studentId, LocalDate.now())
                .map(ChatUsage::getMessageCount).orElse(0);
        if (used >= dailyLimit)
            throw new EmpathaiException(
                    "Daily message limit of " + dailyLimit
                            + " reached. Try again tomorrow!");
    }

    private void incrementUsage(Long studentId) {
        ChatUsage usage = usageRepo
                .findByStudentIdAndUsageDate(studentId, LocalDate.now())
                .orElseGet(() -> ChatUsage.builder()
                        .studentId(studentId)
                        .usageDate(LocalDate.now())
                        .messageCount(0)
                        .build());
        usage.setMessageCount(usage.getMessageCount() + 1);
        usageRepo.save(usage);
    }

    private LocalDate getCurrentWeekStart() {
        return LocalDate.now()
                .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    private ChatMessageResponse toMessageResponse(ChatMessage m) {
        return ChatMessageResponse.builder()
                .id(m.getId())
                .role(m.getRole())
                .content(m.getContent())
                .detectedMode(m.getDetectedMode())
                .createdAt(m.getCreatedAt())
                .imageBase64(m.getImageBase64())
                .imageMimeType(m.getImageMimeType())
                .build();
    }
}